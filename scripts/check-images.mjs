import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const IMAGE_EXT = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.tif',
  '.tiff',
  '.heic',
  '.heif',
  '.avif',
  '.jxl',
  '.bmp',
  '.svg',
  '.ico',
  '.pdf',
]);

const ROOTS = ['public', 'src'];

const PRIVACY_GROUP =
  /^(EXIF|ExifIFD|GPS|IFD0|IFD1|InteropIFD|MakerNotes|XMP-exif|XMP-exifEX|XMP-photoshop|XMP-xmp|XMP-iptcCore|XMP-iptcExt)$/i;

const PDF_INFO_TAG = /^(Author|Creator|Producer)$/i;

function walk(dir, files) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') return files;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (IMAGE_EXT.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

function hasExiftool() {
  try {
    execFileSync('exiftool', ['-ver'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hitsFromExiftool(file) {
  let stdout = '';
  try {
    stdout = execFileSync('exiftool', ['-json', '-g1', '-a', '-s', file], {
      encoding: 'utf8',
    });
  } catch (error) {
    const fromError = error && typeof error.stdout === 'string' ? error.stdout : '';
    if (!fromError) {
      throw new Error(`exiftool failed on ${file}: ${error instanceof Error ? error.message : error}`);
    }
    stdout = fromError;
  }
  const parsed = JSON.parse(stdout);
  const doc = parsed[0] ?? {};
  const hits = [];
  for (const [group, value] of Object.entries(doc)) {
    if (group === 'SourceFile') continue;
    if (PRIVACY_GROUP.test(group)) hits.push(group);
    if (!value || typeof value !== 'object') continue;
    for (const tag of Object.keys(value)) {
      if (/gps|latitude|longitude/i.test(tag) || PDF_INFO_TAG.test(tag)) hits.push(`${group}:${tag}`);
    }
  }
  return hits;
}

function hitsFromBytes(file) {
  const buffer = readFileSync(file);
  const latin = buffer.toString('latin1');
  const hits = [];
  if (latin.includes('Exif\u0000\u0000')) hits.push('EXIF header');
  if (buffer.subarray(0, 8).toString('latin1') === '\u0089PNG\r\n\u001a\n' && latin.includes('eXIf')) {
    hits.push('PNG eXIf chunk');
  }
  if (/GPSLatitude|GPSLongitude|GPSPosition|GPSDestLatitude/.test(latin)) hits.push('GPS text');
  if (file.toLowerCase().endsWith('.pdf')) {
    if (/\/Author\b/.test(latin)) hits.push('PDF Author');
    if (/\/Creator\b/.test(latin)) hits.push('PDF Creator');
    if (/\/Producer\b/.test(latin)) hits.push('PDF Producer');
    if (/\/GPS\b/i.test(latin)) hits.push('PDF GPS');
  }
  return hits;
}

const args = process.argv.slice(2);
const files = args.length > 0 ? args : ROOTS.flatMap((root) => walk(root, []));
const useExiftool = hasExiftool();

if (files.length === 0) {
  console.log('check-images: no images under public/ or src/.');
  process.exit(0);
}

console.log(
  useExiftool
    ? `check-images: scanning ${files.length} file(s) with exiftool and a byte scan.`
    : `check-images: exiftool not found; scanning ${files.length} file(s) for EXIF headers, GPS tags, and PDF author/creator keys.`,
);

let failed = 0;
for (const file of files) {
  const hits = hitsFromBytes(file);
  if (useExiftool) {
    try {
      hits.push(...hitsFromExiftool(file));
    } catch (error) {
      failed += 1;
      console.error(error instanceof Error ? error.message : error);
      continue;
    }
  }
  if (hits.length === 0) continue;
  failed += 1;
  console.error(`${file}: ${[...new Set(hits)].join(', ')}`);
}

if (failed > 0) {
  console.error(`\ncheck-images: ${failed} file(s) contain EXIF, GPS, or PDF author/creator metadata.`);
  console.error('Strip it with: exiftool -all= <file>');
  process.exit(1);
}

console.log('check-images: passed.');
