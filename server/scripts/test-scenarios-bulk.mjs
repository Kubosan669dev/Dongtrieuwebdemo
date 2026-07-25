/**
 * Chấm điểm bộ kịch bản sinh tự động (~1000+ câu).
 *
 *   npm run test-scenarios-bulk              → chạy toàn bộ, báo cáo theo nhóm
 *   npm run test-scenarios-bulk -- --fails   → in chi tiết các câu chưa đạt
 *   npm run test-scenarios-bulk -- --drift   → in cả cảnh báo lệch ý định
 *
 * FAIL = sai kỳ vọng cơ bản (câu 'answer' mà bot chịu thua, hoặc 'graceful' mà
 * bot lại bịa trả lời). WARN (drift) = bot trả lời được nhưng rơi vào ý định
 * ngoài tập `accept` — không tính trượt, chỉ để rà chất lượng định tuyến.
 */

import { ask } from '../src/services/chatbot.js';
import { getCorpus } from '../src/services/knowledge.js';
import { prisma } from '../src/lib/prisma.js';
import { buildBulkScenarios } from './gen-scenarios.mjs';

const showFails = process.argv.includes('--fails');
const showDrift = process.argv.includes('--drift');

const corpus = await getCorpus();
const scenarios = buildBulkScenarios(corpus);

// Bỏ trùng (biến thể có thể tạo câu giống nhau)
const seen = new Set();
const uniq = scenarios.filter((s) => {
  const k = s.q.toLowerCase().trim();
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const groups = new Map();
const failures = [];
const drifts = [];
let pass = 0;
let fail = 0;

const t0 = Date.now();
for (const s of uniq) {
  const a = await ask(s.q);
  const ok = s.expect === 'answer' ? a.matched === true : a.matched === false;

  const g = groups.get(s.group) ?? { pass: 0, total: 0 };
  g.total++;
  if (ok) {
    g.pass++;
    pass++;
    // Lệch ý định (chỉ với câu 'answer' có khai báo accept)
    if (s.expect === 'answer' && s.accept && !s.accept.includes(a.intent)) {
      drifts.push({ q: s.q, got: a.intent, accept: s.accept, group: s.group });
    }
  } else {
    fail++;
    failures.push({ q: s.q, expect: s.expect, got: a.intent, matched: a.matched, group: s.group });
  }
  groups.set(s.group, g);
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n══════════ KỊCH BẢN SINH TỰ ĐỘNG — ${uniq.length} câu (${secs}s) ══════════\n`);
for (const [name, g] of groups) {
  const flag = g.pass === g.total ? '✓' : '⚠';
  console.log(`${flag} ${name.padEnd(34)} ${g.pass}/${g.total}`);
}

console.log('\n═══════════════════════════════════════════════════════');
console.log(`TỔNG: ${uniq.length} câu · đạt ${pass} · trượt ${fail} · lệch ý định ${drifts.length}`);

if (fail && showFails) {
  console.log(`\n─── ${fail} CÂU TRƯỢT ───`);
  for (const f of failures) console.log(`  ✗ [${f.group}] "${f.q}" — mong ${f.expect}, nhận [${f.got}]`);
} else if (fail) {
  // Tóm tắt vài ví dụ mỗi nhóm để dễ khoanh vùng
  const byGroup = new Map();
  for (const f of failures) (byGroup.get(f.group) ?? byGroup.set(f.group, []).get(f.group)).push(f);
  console.log('\n─── Ví dụ câu trượt (dùng --fails để xem hết) ───');
  for (const [grp, list] of byGroup) {
    console.log(`  [${grp}] ${list.length} câu, vd:`);
    for (const f of list.slice(0, 3)) console.log(`      ✗ "${f.q}" → [${f.got}]`);
  }
}

if (drifts.length && showDrift) {
  console.log(`\n─── ${drifts.length} CÂU LỆCH Ý ĐỊNH (cảnh báo) ───`);
  for (const d of drifts.slice(0, 60)) console.log(`  ~ [${d.group}] "${d.q}" → [${d.got}] (mong ${d.accept.join('/')})`);
}

await prisma.$disconnect();
process.exitCode = fail ? 1 : 0;
