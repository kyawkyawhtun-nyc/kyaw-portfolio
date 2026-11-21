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

const PDF_IDENTITY_TAG = /^(Author|Creator)$/i;

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

function readExiftool(file) {
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
  return parsed[0] ?? {};
}

function tagMessages(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function hitsFromExiftool(doc) {
  const hits = [];
  for (const [group, value] of Object.entries(doc)) {
    if (group === 'SourceFile') continue;
    if (PRIVACY_GROUP.test(group)) hits.push(group);
    if (!value || typeof value !== 'object') continue;
    for (const tag of Object.keys(value)) {
      if (/gps|latitude|longitude/i.test(tag)) hits.push(`${group}:${tag}`);
    }
  }
  return hits;
}

/** PDFs are not trustworthy when ExifTool could not read them, or when they carry author identity. */
function hitsFromPdf(doc, file) {
  const hits = [];
  const tool = doc.ExifTool && typeof doc.ExifTool === 'object' ? doc.ExifTool : {};
  for (const key of ['Error', 'Warning']) {
    for (const message of tagMessages(tool[key])) {
      hits.push(`ExifTool:${key}: ${message}`);
    }
  }
  const fileType = doc.File && typeof doc.File === 'object' ? doc.File.FileType : undefined;
  if (fileType !== 'PDF') {
    hits.push(`File:FileType is ${fileType ?? 'missing'}, expected PDF`);
  }
  for (const [group, value] of Object.entries(doc)) {
    if (!value || typeof value !== 'object') continue;
    for (const [tag, tagValue] of Object.entries(value)) {
      if (/^producer$/i.test(tag)) {
        console.warn(
          `check-images: ${file}: PDF Producer is present (${tagValue}). Not a failure; this is tool metadata.`,
        );
        continue;
      }
      if (PDF_IDENTITY_TAG.test(tag) || /gps|latitude|longitude/i.test(tag)) {
        hits.push(`${group}:${tag}`);
      }
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
  return hits;
}

const args = process.argv.slice(2);
const files = args.length > 0 ? args : ROOTS.flatMap((root) => walk(root, []));
const useExiftool = hasExiftool();
const pdfs = files.filter((file) => file.toLowerCase().endsWith('.pdf'));

if (files.length === 0) {
  console.log('check-images: no images under public/ or src/.');
  process.exit(0);
}

if (pdfs.length > 0 && !useExiftool) {
  console.error(
    `check-images: ${pdfs.length} PDF(s) present but exiftool is not installed. A byte scan misses compressed metadata and escaped PDF names. Install exiftool and retry (Debian/Ubuntu: sudo apt-get install libimage-exiftool-perl).`,
  );
  process.exit(1);
}

console.log(
  useExiftool
    ? `check-images: scanning ${files.length} file(s) with exiftool${pdfs.length ? ' (PDFs require a clean ExifTool read)' : ''}.`
    : `check-images: exiftool not found; scanning ${files.length} non-PDF file(s) for EXIF headers and GPS tags.`,
);

let failed = 0;
for (const file of files) {
  const isPdf = file.toLowerCase().endsWith('.pdf');
  const hits = isPdf ? [] : hitsFromBytes(file);
  if (useExiftool) {
    try {
      const doc = readExiftool(file);
      hits.push(...(isPdf ? hitsFromPdf(doc, file) : hitsFromExiftool(doc)));
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
  console.error(`\ncheck-images: ${failed} file(s) contain EXIF, GPS, or PDF author metadata, or could not be read.`);
  console.error('Images: exiftool -all= <file>');
  console.error('PDFs: exiftool -overwrite_original -all:all= <file> && qpdf --linearize <file> <out.pdf>');
  process.exit(1);
}

console.log('check-images: passed.');
