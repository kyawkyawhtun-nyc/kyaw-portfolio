import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function runNode(script, arg, env = process.env) {
  const result = spawnSync(process.execPath, [join(repoRoot, script), arg], {
    cwd: repoRoot,
    encoding: 'utf8',
    env,
  });
  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function buildPdf(info) {
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> >>\nendobj\n',
  ];
  if (info) objects.push(`4 0 obj\n<< ${info} >>\nendobj\n`);
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  const xrefPos = Buffer.byteLength(body);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  const trailerInfo = info ? '/Root 1 0 R /Info 4 0 R' : '/Root 1 0 R';
  const trailer = `trailer\n<< /Size ${objects.length + 1} ${trailerInfo} >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, 'latin1');
}

const html = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="referrer" content="strict-origin-when-cross-origin"></head><body><p>ok</p></body></html>`;
const cleanSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32"/></svg>';

function withDist(files, check) {
  const dir = mkdtempSync(join(tmpdir(), 'check-dist-'));
  try {
    for (const [name, contents] of files) writeFileSync(join(dir, name), contents);
    check(runNode('scripts/check-dist.mjs', dir));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const svgCases = [
  ['script', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
  ['handler', '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)"/></svg>'],
  ['handler-spaced', '<svg xmlns="http://www.w3.org/2000/svg"><rect onload = "alert(1)"/></svg>'],
  ['javascript-url', '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)">x</a></svg>'],
  ['encoded-javascript-url', '<svg xmlns="http://www.w3.org/2000/svg"><a href="&#106;avascript:alert(1)">x</a></svg>'],
  ['tab-entity-javascript', '<svg xmlns="http://www.w3.org/2000/svg"><a href="java&#x9;script:alert(1)">x</a></svg>'],
  ['newline-entity-javascript', '<svg xmlns="http://www.w3.org/2000/svg"><a href="java&#10;script:alert(1)">x</a></svg>'],
  ['namespaced-script', '<svg xmlns="http://www.w3.org/2000/svg"><svg:script>alert(1)</svg:script></svg>'],
  ['namespaced-foreignObject', '<svg xmlns="http://www.w3.org/2000/svg"><s:foreignObject width="1" height="1"></s:foreignObject></svg>'],
  ['foreignObject', '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="1" height="1"></foreignObject></svg>'],
  [
    'doctype-entity',
    '<!DOCTYPE svg [<!ENTITY x "javascript:alert(1)">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>',
  ],
];

for (const [name, svg] of svgCases) {
  withDist(
    [
      ['index.html', html],
      ['bad.svg', svg],
    ],
    (result) => assert(result.code !== 0, `malicious SVG (${name}) should fail check-dist`),
  );
}

const utf16 = Buffer.concat([
  Buffer.from([0xff, 0xfe]),
  Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>bad</script></svg>', 'utf16le'),
]);
withDist(
  [
    ['index.html', html],
    ['utf16.svg', utf16],
  ],
  (result) => {
    assert(result.code !== 0, 'UTF-16 SVG should fail check-dist');
    assert(/byte-order mark|NUL|not valid UTF-8/i.test(result.stderr), 'UTF-16 SVG should report an encoding error');
  },
);

withDist(
  [
    ['index.html', html],
    ['mark.svg', cleanSvg],
  ],
  (result) => assert(result.code === 0, `clean SVG should pass check-dist\n${result.stderr}`),
);

withDist(
  [
    ['index.html', html],
    ['payload.bin', 'not a site file'],
  ],
  (result) => {
    assert(result.code !== 0, 'disallowed extension should fail');
    assert(result.stderr.includes('disallowed extension .bin'), 'disallowed extension should name .bin');
  },
);

withDist(
  [
    ['index.html', html],
    ['page.htm', `${html}<script>alert(1)</script>`],
  ],
  (result) => {
    assert(result.code !== 0, '.htm should fail');
    assert(result.stderr.includes('disallowed extension .htm'), '.htm is outside the allowlist');
    assert(result.stderr.includes('inline <script>'), '.htm should still be scanned for inline scripts');
  },
);

withDist(
  [
    ['index.html', html],
    ['page.xhtml', '<html><svg:script>alert(1)</svg:script></html>'],
  ],
  (result) => {
    assert(result.code !== 0, '.xhtml should fail');
    assert(result.stderr.includes('disallowed extension .xhtml'), '.xhtml is outside the allowlist');
    assert(result.stderr.includes('inline <script>'), '.xhtml should be scanned for namespaced scripts');
  },
);

withDist(
  [
    ['index.html', html],
    ['feed.xml', '<?xml version="1.0"?><feed><script>alert(1)</script></feed>'],
  ],
  (result) => {
    assert(result.code !== 0, 'XML with a script should fail');
    assert(!result.stderr.includes('disallowed extension .xml'), '.xml is an allowed extension');
    assert(result.stderr.includes('inline <script>'), 'XML should be scanned for inline scripts');
  },
);

withDist(
  [
    ['index.html', html],
    ['note.xml', '<?xml version="1.0"?><note>ok</note>'],
  ],
  (result) => assert(result.code === 0, `clean XML should pass\n${result.stderr}`),
);

for (const href of ['https://example.com/path', '/projects/', '#notes', '#']) {
  assert(isAllowedProjectHref(href), `href should be allowed: ${href}`);
  assert(projectHrefSchema.safeParse(href).success, `schema should allow: ${href}`);
}
for (const href of [
  'javascript:alert(1)',
  'http://example.com',
  'HTTP://example.com',
  'data:text/html,x',
  '//evil.example',
  'mailto:a@example.com',
  '/\\evil.com',
  '/\t/evil.com',
  '',
]) {
  assert(!isAllowedProjectHref(href), `href should be rejected: ${JSON.stringify(href) || '(empty)'}`);
  assert(!projectHrefSchema.safeParse(href).success, `schema should reject: ${JSON.stringify(href) || '(empty)'}`);
}

const pdfDir = mkdtempSync(join(tmpdir(), 'check-pdf-'));
try {
  const cleanPath = join(pdfDir, 'clean.pdf');
  const dirtyPath = join(pdfDir, 'dirty.pdf');
  const producerPath = join(pdfDir, 'producer.pdf');
  const brokenPath = join(pdfDir, 'broken.pdf');
  writeFileSync(cleanPath, buildPdf(null));
  writeFileSync(dirtyPath, buildPdf('/Author (Placeholder Person) /Creator (Secret Tool)'));
  writeFileSync(producerPath, buildPdf('/Producer (Quartz PDFContext)'));
  writeFileSync(
    brokenPath,
    Buffer.from(
      '%PDF-1.1\n1 0 obj<</Type/Catalog>>endobj\n2 0 obj<</Au#74hor(Hidden Person)>>endobj\ntrailer<</Root 1 0 R/Info 2 0 R>>\nstartxref\n99999\n%%EOF\n',
      'latin1',
    ),
  );

  const clean = runNode('scripts/check-images.mjs', cleanPath);
  assert(clean.code === 0, `PDF without document info should pass\n${clean.stderr}`);
  const dirty = runNode('scripts/check-images.mjs', dirtyPath);
  assert(dirty.code !== 0, 'PDF with Author/Creator should fail');
  const producer = runNode('scripts/check-images.mjs', producerPath);
  assert(producer.code === 0, `PDF with only Producer should not fail\n${producer.stderr}`);
  assert(/Producer/i.test(producer.stderr), 'Producer should be warned, not ignored silently');
  const broken = runNode('scripts/check-images.mjs', brokenPath);
  assert(broken.code !== 0, 'unparseable PDF should fail');
  assert(/ExifTool:Warning/i.test(broken.stderr), `unparseable PDF should report ExifTool:Warning\n${broken.stderr}`);

  const hidden = mkdtempSync(join(tmpdir(), 'no-exiftool-'));
  try {
    const missing = runNode('scripts/check-images.mjs', cleanPath, { ...process.env, PATH: hidden });
    assert(missing.code !== 0, 'a PDF without exiftool should fail');
    assert(/install exiftool/i.test(missing.stderr), `missing exiftool should tell you to install it\n${missing.stderr}`);
  } finally {
    rmSync(hidden, { recursive: true, force: true });
  }

  const onlyAll = join(pdfDir, 'only-all.pdf');
  writeFileSync(onlyAll, buildPdf('/Author (Placeholder Person) /Creator (Secret Tool)'));
  execFileSync('exiftool', ['-overwrite_original', '-all=', onlyAll], { stdio: 'pipe' });
  assert(
    readFileSync(onlyAll).includes(Buffer.from('Placeholder')),
    'exiftool -all= must leave the old Author bytes in the PDF',
  );

  const rewrite = join(pdfDir, 'rewrite.pdf');
  writeFileSync(rewrite, buildPdf('/Author (Placeholder Person) /Creator (Secret Tool) /Producer (Quartz)'));
  execFileSync('exiftool', ['-overwrite_original', '-all:all=', rewrite], { stdio: 'pipe' });
  const linear = join(pdfDir, 'linear.pdf');
  const linearized = spawnSync('qpdf', ['--warning-exit-0', '--linearize', rewrite, linear], { encoding: 'utf8' });
  assert(
    linearized.status === 0 && existsSync(linear) && readFileSync(linear).length > 0,
    `qpdf --linearize should write output.pdf\n${linearized.stderr ?? ''}`,
  );
  const linearBytes = readFileSync(linear);
  assert(!linearBytes.includes(Buffer.from('Placeholder')), 'qpdf --linearize should drop the old Author string');
  assert(!linearBytes.includes(Buffer.from('/Author')), 'qpdf --linearize should drop the /Author key');
  const rewritten = runNode('scripts/check-images.mjs', linear);
  assert(rewritten.code === 0, `rewritten PDF should pass check-images\n${rewritten.stderr}`);
} finally {
  rmSync(pdfDir, { recursive: true, force: true });
}

if (failed > 0) {
  console.error(`test-security: ${failed} assertion(s) failed.`);
  process.exit(1);
}

console.log('test-security: passed.');
