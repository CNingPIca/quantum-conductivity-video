// 从 src/script.ts 导出字幕 (SRT) 和带时间码的旁白稿
// 用法：npx tsx scripts/export-srt.ts
import {writeFileSync, mkdirSync} from 'fs';
import {FPS, TIMELINE, TOTAL_FRAMES} from '../src/script';

const tc = (frame: number, sep = ',') => {
  const ms = Math.round((frame / FPS) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)}${sep}${p(r, 3)}`;
};
const clean = (t: string) => t.replace(/[「」]/g, '');

mkdirSync('out', {recursive: true});
let srt = '';
let md = `# 旁白稿：量子力学如何解释导电性\n\n总时长 ${(TOTAL_FRAMES / FPS).toFixed(1)} 秒 · ${FPS} fps\n`;
let n = 1;
for (const s of TIMELINE) {
  md += `\n## ${s.chip ?? '开场'}\n\n`;
  for (const c of s.cues) {
    const a = s.from + c.start;
    const b = s.from + c.end;
    srt += `${n++}\n${tc(a)} --> ${tc(b)}\n${clean(c.text)}\n\n`;
    md += `- \`${tc(a, '.').slice(3, 8)}\` ${clean(c.text)}\n`;
  }
}
writeFileSync('out/subtitles.srt', srt);
writeFileSync('out/narration.md', md);
console.log(`wrote out/subtitles.srt (${n - 1} lines) and out/narration.md`);
