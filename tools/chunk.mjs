// Deterministic script -> chunks.json chunker.
//   node tools/chunk.mjs script.md audio/r09-chunks.json
// Paragraph-aligned, sentence-aligned, capped at config.chunk.maxWords.
// `tts_text` starts as a copy of `text`; the phonetics pass edits only that copy, so
// what the voice says and what appears on screen can diverge without you losing either.
import { readFileSync, writeFileSync } from 'node:fs';
import { loadConfig } from './lib/config.mjs';

export function chunkScript(raw, maxWords = 30) {
  const lines = raw.split('\n');
  const body = lines.filter((l) => !/^#\s/.test(l)).join('\n'); // drop the markdown title
  const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  const chunks = [];
  let paraIndex = 0;
  let sectionPending = false;

  for (const block of blocks) {
    // [reveal] / [failure] etc are section markers, not spoken
    if (/^\[[^\]]+\]$/.test(block)) { sectionPending = true; continue; }
    const para = block.replace(/^\[[^\]]+\]\s*/, '').trim();
    if (!para) continue;

    const sentences = para.match(/[^.!?]+[.!?]+(?:["')\]]+)?\s*|[^.!?]+$/g) || [para];

    const groups = [];
    let cur = '';
    for (const s of sentences) {
      const sTrim = s.trim();
      if (!sTrim) continue;
      const curW = cur ? cur.split(/\s+/).length : 0;
      const sW = sTrim.split(/\s+/).length;
      if (cur && curW + sW > maxWords) { groups.push(cur); cur = sTrim; }
      else cur = cur ? `${cur} ${sTrim}` : sTrim;
    }
    if (cur) groups.push(cur);

    groups.forEach((text, i) => {
      chunks.push({
        id: String(chunks.length).padStart(3, '0'),
        para_index: paraIndex,
        first_in_para: i === 0,
        first_in_section: i === 0 && sectionPending,
        words: text.split(/\s+/).length,
        text,
        tts_text: text,
      });
      if (i === 0) sectionPending = false;
    });
    paraIndex++;
  }
  return chunks;
}

if (process.argv[1]?.endsWith('chunk.mjs')) {
  const cfg = loadConfig();
  const [, , inPath, outPath] = process.argv;
  if (!inPath || !outPath) { console.error('usage: chunk.mjs <script.md> <out.json>'); process.exit(1); }
  const chunks = chunkScript(readFileSync(inPath, 'utf8'), cfg.chunk.maxWords);
  writeFileSync(outPath, JSON.stringify(chunks, null, 1) + '\n');
  const words = chunks.reduce((a, c) => a + c.words, 0);
  console.log(`${outPath}: ${chunks.length} chunks, ${words} words, ~${(words / cfg.pace.targetWps).toFixed(0)}s`);
}
