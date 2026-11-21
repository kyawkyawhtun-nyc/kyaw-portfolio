import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const distDir = process.argv[2] ?? 'dist';

export const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'none'; object-src 'none'; upgrade-insecure-requests";

/** Extensions this static build is allowed to publish. .htm and .xhtml are scanned if present, then rejected. */
const ALLOWED_EXT = new Set([
  '.html',
  '.css',
  '.js',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.ico',
  '.txt',
  '.xml',
  '.pdf',
  '.woff2',
]);

const HTML_EXT = new Set(['.html', '.htm', '.xhtml']);

function walk(dir, files) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      console.error(`check-dist: ${dir} does not exist. Run npm run build first.`);
      process.exit(1);
    }
    throw error;
  }
  for (const name of entries) {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) walk(path, files);
    else files.push(path);
  }
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function decodeXmlEntities(value) {
  let current = value;
  for (let pass = 0; pass < 2; pass += 1) {
    current = current
      .replace(/&#x([0-9a-f]+);/gi, (entity, hex) => {
        const code = Number.parseInt(hex, 16);
        return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
      })
      .replace(/&#(\d+);/g, (entity, num) => {
        const code = Number.parseInt(num, 10);
        return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
      })
      .replace(/&quot;/gi, '"')
      .replace(/&#0*39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&');
  }
  return current;
}

function getAttr(tag, name) {
  const match = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`,
    'i',
  ).exec(tag);
  if (!match) return null;
  return decodeEntities((match[1] ?? match[2] ?? match[3] ?? '').trim());
}

function firstHeadElement(headInner) {
  let index = 0;
  while (index < headInner.length) {
    const char = headInner[index];
    if (char === ' ' || char === '\n' || char === '\r' || char === '\t') {
      index += 1;
      continue;
    }
    if (headInner.startsWith('<!--', index)) {
      const end = headInner.indexOf('-->', index);
      if (end === -1) return { error: 'unclosed comment in <head>' };
      index = end + 3;
      continue;
    }
    if (char !== '<') return { error: `unexpected text before the first <head> element: ${headInner.slice(index, index + 40)}` };
    const end = headInner.indexOf('>', index);
    if (end === -1) return { error: 'unclosed tag in <head>' };
    return { tag: headInner.slice(index, end + 1) };
  }
  return { error: '<head> has no elements' };
}

function inlineScriptErrors(text, label) {
  const errors = [];
  const scriptRe = /<([\w.-]+:)?script\b([^>]*)>/gi;
  for (const match of text.matchAll(scriptRe)) {
    const src = getAttr(match[0], 'src');
    if (!src) errors.push(`${label} contains an inline <script>: ${match[0]}`);
  }
  return errors;
}

function checkHtml(html) {
  const errors = [];
  const headMatch = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  if (!headMatch) {
    errors.push('missing <head>');
  } else {
    const first = firstHeadElement(headMatch[1]);
    if (first.error) {
      errors.push(first.error);
    } else {
      const httpEquiv = getAttr(first.tag, 'http-equiv');
      const content = getAttr(first.tag, 'content');
      if (httpEquiv?.toLowerCase() !== 'content-security-policy' || content !== CSP) {
        errors.push(`CSP meta is missing or not the first <head> element (found ${first.tag})`);
      }
    }
  }

  errors.push(...inlineScriptErrors(html, 'markup'));

  const tagRe = /<([a-zA-Z][\w:.-]*)\b[^>]*>/g;
  for (const match of html.matchAll(tagRe)) {
    const target = getAttr(match[0], 'target');
    if (!target || target.toLowerCase() !== '_blank') continue;
    const rel = new Set((getAttr(match[0], 'rel') ?? '').toLowerCase().split(/\s+/).filter(Boolean));
    if (!rel.has('noopener') || !rel.has('noreferrer')) {
      errors.push(`target="_blank" is missing rel="noopener noreferrer": ${match[0]}`);
    }
  }

  return errors;
}

function checkXml(text) {
  return inlineScriptErrors(text, 'XML');
}

function checkSvg(buffer) {
  const errors = [];
  const hasUtf8Bom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
  const hasUtf16Bom =
    buffer.length >= 2 &&
    ((buffer[0] === 0xff && buffer[1] === 0xfe) || (buffer[0] === 0xfe && buffer[1] === 0xff));
  if (hasUtf8Bom || hasUtf16Bom) errors.push('SVG has a byte-order mark and is not accepted as UTF-8');
  if (buffer.includes(0)) errors.push('SVG contains NUL bytes');
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    errors.push('SVG is not valid UTF-8');
    return errors;
  }
  if (/<!DOCTYPE/i.test(text)) errors.push('SVG contains <!DOCTYPE');
  if (/<!ENTITY/i.test(text)) errors.push('SVG contains <!ENTITY');
  const decoded = decodeXmlEntities(text);
  const sources = [text, decoded];
  if (sources.some((source) => /<([\w.-]+:)?script\b/i.test(source))) {
    errors.push('SVG contains <script');
  }
  if (sources.some((source) => /<([\w.-]+:)?foreignObject\b/i.test(source))) {
    errors.push('SVG contains <foreignObject');
  }
  const collapsed = sources.map((source) => source.replace(/[\t\n\r]/g, ''));
  if (collapsed.some((source) => /javascript\s*:/i.test(source))) {
    errors.push('SVG contains a javascript: URL');
  }
  if (sources.some((source) => /\bon\w+\s*=/i.test(source))) {
    errors.push('SVG contains an event-handler attribute');
  }
  return errors;
}

function decodeText(buffer, file) {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(buffer), errors: [] };
  } catch {
    return { text: '', errors: [`${file} is not valid UTF-8`] };
  }
}

function main() {
  const files = [];
  walk(distDir, files);
  const htmlFiles = files.filter((file) => extname(file).toLowerCase() === '.html');
  if (htmlFiles.length === 0) {
    console.error(`check-dist: no HTML files under ${distDir}`);
    process.exit(1);
  }

  let failed = 0;
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const errors = [];
    if (!ALLOWED_EXT.has(ext)) {
      errors.push(`disallowed extension ${ext || '(none)'}`);
    }
    const data = readFileSync(file);
    if (ext === '.svg') {
      errors.push(...checkSvg(data));
    } else if (HTML_EXT.has(ext) || ext === '.xml') {
      const decoded = decodeText(data, file);
      errors.push(...decoded.errors);
      if (HTML_EXT.has(ext)) errors.push(...checkHtml(decoded.text));
      else errors.push(...checkXml(decoded.text));
    }
    if (errors.length === 0) continue;
    failed += 1;
    console.error(`\n${file}`);
    for (const error of errors) console.error(`  - ${error}`);
  }

  if (failed > 0) {
    console.error(`\ncheck-dist: ${failed} file(s) failed.`);
    process.exit(1);
  }

  console.log(`check-dist: ${files.length} file(s) passed.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
