// Apply phonetic respellings to the `tts_text` field only. On-screen `text` is never
// touched, so a word can be misspelled for the voice model and still read correctly.
//   node tools/phonetics.mjs audio/*-chunks.json
//
// The map below is a STARTER. Add your own entries by ear: when the voice model says a
// word wrong, respell it here rather than rewriting your script. Acronyms are the big
// win -- most TTS models read "API" as a word unless you space the letters out.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BUILTIN = [
  // Acronyms that must be spelled out, not read as words.
  [/\bAPI\b/g, 'A P I'],
  [/\bAPIs\b/g, 'A P Is'],
  [/\bLLM\b/g, 'L L M'],
  [/\bLLMs\b/g, 'L L Ms'],
  [/\bKPI\b/g, 'K P I'],
  [/\bKPIs\b/g, 'K P Is'],
  [/\bROI\b/g, 'R O I'],
  [/\bMVP\b/g, 'M V P'],
  [/\bSDK\b/g, 'S D K'],
  [/\bCLI\b/g, 'C L I'],
  [/\bUI\b/g, 'U I'],
  [/\bUX\b/g, 'U X'],
  [/\bA\/B\b/g, 'A B'],
];

// Optional project map: phonetics.json as [["pattern","flags","replacement"], ...]
const userFile = join(process.cwd(), 'phonetics.json');
const USER = existsSync(userFile)
  ? JSON.parse(readFileSync(userFile, 'utf8')).map(([p, f, to]) => [new RegExp(p, f), to])
  : [];
const MAP = [...USER, ...BUILTIN];

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: phonetics.mjs <chunks.json> [...]'); process.exit(1); }

let totalFiles = 0, totalEdits = 0;
for (const path of files) {
  const chunks = JSON.parse(readFileSync(path, 'utf8'));
  let edits = 0;
  for (const c of chunks) {
    let t = c.text;
    for (const [re, to] of MAP) t = t.replace(re, to);
    if (t !== c.tts_text) { c.tts_text = t; if (t !== c.text) edits++; }
  }
  writeFileSync(path, JSON.stringify(chunks, null, 1) + '\n');
  if (edits) console.log(`${path}: ${edits} chunk(s) respelled`);
  totalFiles++; totalEdits += edits;
}
console.log(`--- ${totalFiles} file(s), ${totalEdits} chunk(s) respelled`);
