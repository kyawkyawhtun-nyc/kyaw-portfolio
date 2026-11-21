import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const distDir = process.argv[2] ?? 'dist';

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests";

function walkHtml(dir, files = []) {
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
    if (statSync(path).isDirectory()) walkHtml(path, files);
    else if (extname(name).toLowerCase() === '.html') files.push(path);
  }
  return files;
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

function checkFile(html) {
  const errors = [];
  const headMatch = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  if (!headMatch) {
    errors.push('missing <head>');
    return errors;
  }
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

  const scriptRe = /<script\b([^>]*)>/gi;
  for (const match of html.matchAll(scriptRe)) {
    const src = getAttr(match[0], 'src');
    if (!src) errors.push(`inline <script> without src: ${match[0]}`);
  }

  const tagRe = /<([a-zA-Z][\w:-]*)\b[^>]*>/g;
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

const files = walkHtml(distDir);
if (files.length === 0) {
  console.error(`check-dist: no HTML files under ${distDir}`);
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const errors = checkFile(readFileSync(file, 'utf8'));
  if (errors.length === 0) continue;
  failed += 1;
  console.error(`\n${file}`);
  for (const error of errors) console.error(`  - ${error}`);
}

if (failed > 0) {
  console.error(`\ncheck-dist: ${failed} file(s) failed.`);
  process.exit(1);
}

console.log(`check-dist: ${files.length} HTML file(s) passed.`);
