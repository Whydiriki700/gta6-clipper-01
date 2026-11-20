// gta6-clipper-01 entry program (Node 22, standard library only).
//
// The entry itself is a public YouTube clip; this program's whole job is to
// hand the clip's address to the grader. It reads VIDEO.json from the
// repository root, checks that the file is a small JSON object whose "url"
// really is a YouTube video address, and then copies the file, byte for
// byte, into the output directory as VIDEO.json.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR
// stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate reads at most 16 KiB of VIDEO.json; anything larger is invalid.
const MAX_VIDEO_JSON_BYTES = 16384;

// A YouTube video id is 11 characters of letters, digits, "-" and "_". The
// house enforces that exact form when it reads the video; this program only
// checks the address's structure, so a pre-upload placeholder token in the
// id's place does not stop the copy.
const VIDEO_ID = '[A-Za-z0-9_-]+';
const YOUTUBE_URL_PATTERNS = [
  new RegExp(`^https://(?:www\\.|m\\.)?youtube\\.com/shorts/${VIDEO_ID}(?:[?#].*)?$`),
  new RegExp(`^https://(?:www\\.|m\\.)?youtube\\.com/watch\\?v=${VIDEO_ID}(?:[&#].*)?$`),
  new RegExp(`^https://youtu\\.be/${VIDEO_ID}(?:[?#].*)?$`),
];

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function readVideoJson(path: string): { url: string } {
  let raw: Buffer;
  try {
    raw = readFileSync(path);
  } catch (err) {
    fail(`cannot read ${path}: ${(err as Error).message}`);
  }
  if (raw.length > MAX_VIDEO_JSON_BYTES) {
    fail(`VIDEO.json is ${raw.length} bytes, over the ${MAX_VIDEO_JSON_BYTES} byte limit`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch (err) {
    fail(`VIDEO.json is not valid JSON: ${(err as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail('VIDEO.json must be a JSON object');
  }
  const url = (parsed as Record<string, unknown>).url;
  if (typeof url !== 'string' || url.length === 0) {
    fail('VIDEO.json must carry a non-empty string "url"');
  }
  if (!YOUTUBE_URL_PATTERNS.some((pattern) => pattern.test(url))) {
    fail(`"url" is not a YouTube video address: ${url}`);
  }
  return { url };
}

const sourcePath = join(BOT_DIR, 'VIDEO.json');
readVideoJson(sourcePath);

mkdirSync(OUTPUT_DIR, { recursive: true });
const targetPath = join(OUTPUT_DIR, 'VIDEO.json');
try {
  copyFileSync(sourcePath, targetPath);
} catch (err) {
  fail(`cannot copy VIDEO.json to ${targetPath}: ${(err as Error).message}`);
}

// Verify the copy landed byte for byte: a same-size file with different
// bytes would name the wrong video, so compare contents, not just sizes.
const sourceBytes = readFileSync(sourcePath);
const copiedBytes = readFileSync(targetPath);
if (!sourceBytes.equals(copiedBytes)) {
  fail('the copied VIDEO.json does not match the repository file');
}
