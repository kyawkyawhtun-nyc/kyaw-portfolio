import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAllowedProjectHref, projectHrefSchema } from '../src/lib/project-href.mjs';
import { CSP } from './check-dist.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
let failed = 0;

function assert(condition, message) {
  if (condition) return;
  failed += 1;
  console.error(`not ok: ${message}`);
}

function runNode(script, arg) {
  try {
    execFileSync(process.execPath, [join(repoRoot, script), arg], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return 0;
  } catch (error) {
    return typeof error.status === 'number' ? error.status : 1;
  }
}

const html = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="referrer" content="strict-origin-when-cross-origin"></head><body><p>ok</p></body></html>`;
const cleanSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32"/></svg>';
const svgCases = [
  ['script', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
  ['handler', '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)"/></svg>'],
  ['handler-spaced', '<svg xmlns="http://www.w3.org/2000/svg"><rect onload = "alert(1)"/></svg>'],
  ['javascript-url', '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)">x</a></svg>'],
  ['encoded-javascript-url', '<svg xmlns="http://www.w3.org/2000/svg"><a href="&#106;avascript:alert(1)">x</a></svg>'],
  ['foreignObject', '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="1" height="1"></foreignObject></svg>'],
];

for (const [name, svg] of svgCases) {
  const dir = mkdtempSync(join(tmpdir(), 'check-dist-'));
  try {
    writeFileSync(join(dir, 'index.html'), html);
    writeFileSync(join(dir, 'bad.svg'), svg);
    const code = runNode('scripts/check-dist.mjs', dir);
    assert(code !== 0, `malicious SVG (${name}) should fail check-dist`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const cleanDir = mkdtempSync(join(tmpdir(), 'check-dist-clean-'));
try {
  writeFileSync(join(cleanDir, 'index.html'), html);
  writeFileSync(join(cleanDir, 'mark.svg'), cleanSvg);
  assert(runNode('scripts/check-dist.mjs', cleanDir) === 0, 'clean SVG should pass check-dist');
} finally {
  rmSync(cleanDir, { recursive: true, force: true });
}

for (const href of ['https://example.com/path', '/projects/', '#notes', '#']) {
  assert(isAllowedProjectHref(href), `href should be allowed: ${href}`);
}
for (const href of ['javascript:alert(1)', 'http://example.com', 'HTTP://example.com', 'data:text/html,x', '//evil.example', 'mailto:a@example.com', '']) {
  assert(!isAllowedProjectHref(href), `href should be rejected: ${href || '(empty)'}`);
  assert(!projectHrefSchema.safeParse(href).success, `schema should reject: ${href || '(empty)'}`);
}
for (const href of ['https://example.com/path', '/projects/', '#notes']) {
  assert(projectHrefSchema.safeParse(href).success, `schema should allow: ${href}`);
}

const cleanPdf = `%PDF-1.1
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 0>>endobj
trailer<</Root 1 0 R>>
%%EOF
`;
const dirtyPdf = `%PDF-1.1
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 0>>endobj
3 0 obj<</Author(Placeholder Person)/Creator(Tool)>>endobj
trailer<</Root 1 0 R/Info 3 0 R>>
%%EOF
`;
const pdfDir = mkdtempSync(join(tmpdir(), 'check-pdf-'));
try {
  const cleanPath = join(pdfDir, 'clean.pdf');
  const dirtyPath = join(pdfDir, 'dirty.pdf');
  writeFileSync(cleanPath, cleanPdf);
  writeFileSync(dirtyPath, dirtyPdf);
  assert(runNode('scripts/check-images.mjs', cleanPath) === 0, 'PDF without document info should pass');
  assert(runNode('scripts/check-images.mjs', dirtyPath) !== 0, 'PDF with Author/Creator should fail');
} finally {
  rmSync(pdfDir, { recursive: true, force: true });
}

if (failed > 0) {
  console.error(`test-security: ${failed} assertion(s) failed.`);
  process.exit(1);
}

console.log('test-security: passed.');
