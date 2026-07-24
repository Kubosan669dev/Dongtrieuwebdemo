/**
 * Chạy thử chatbot với một bộ câu hỏi mẫu.
 *
 *   npm run test-chatbot            → chạy toàn bộ bộ câu hỏi
 *   npm run test-chatbot "câu hỏi"  → hỏi một câu bất kỳ
 *
 * Dùng để kiểm tra chất lượng trả lời sau khi bổ sung dữ liệu hoặc thêm từ
 * đồng nghĩa. Câu nào rơi vào ý định `fallback` là câu bot chưa trả lời được.
 */

import { ask } from '../src/services/chatbot.js';
import { prisma } from '../src/lib/prisma.js';

const QUESTIONS = [
  // Xã giao
  'xin chào',
  'bạn làm được gì?',
  // Thời tiết — điều người dùng yêu cầu trả lời trực tiếp từ số liệu
  'thời tiết hôm nay thế nào?',
  'ngày mai có mưa không?',
  'dự báo 7 ngày tới',
  'thứ bảy trời thế nào',
  'nhiệt độ bây giờ bao nhiêu độ',
  'cuối tuần này thời tiết ra sao',
  // Triều cường
  'triều cường hôm nay thế nào?',
  'con nước lên xuống giờ nào',
  // Gợi ý
  'hôm nay nên đi đâu?',
  'đông triều có gì chơi',
  // Di tích
  'Đông Triều có bao nhiêu di tích?',
  'chùa Mỹ Cụ có gì đặc biệt?',
  'đền Yết Kiêu thờ ai',
  'đồn cao ở đâu',
  'chua my cu o dau', // không dấu
  'chùa mĩ cụ', // sai chính tả
  // Lễ hội
  'lễ hội nào sắp diễn ra?',
  'lễ hội tháng Giêng có những gì',
  'hội làng Vân Động là gì',
  // Ẩm thực
  'ăn gì ở Đông Triều?',
  'đặc sản Đông Triều có gì',
  'na Đông Triều mùa nào',
  'rươi là món gì',
  'mua quà gì về',
  // Nhà hàng, lưu trú
  'có nhà hàng nào ngon không',
  'khách sạn ở đâu',
  'ngủ ở đâu qua đêm',
  // Đường đi, lịch trình
  'đi từ Hà Nội thế nào',
  'đông triều cách hà nội bao xa',
  'lịch trình 2 ngày 1 đêm',
  // Lân cận
  'gần đây có điểm nào chơi được',
  'Ngoạ Vân ở đâu',
  // Ngoài phạm vi — phải nói thật là không biết
  'giá vé máy bay đi Đà Nẵng',
  'thủ đô nước Pháp là gì',
];

const arg = process.argv.slice(2).join(' ').trim();
const list = arg ? [arg] : QUESTIONS;

let unanswered = 0;
for (const q of list) {
  const t0 = Date.now();
  const a = await ask(q);
  const ms = Date.now() - t0;
  if (!a.matched) unanswered++;
  console.log('\n' + '─'.repeat(78));
  console.log(`❓ ${q}`);
  console.log(`   [${a.intent}${a.matched ? '' : ' · KHÔNG TRẢ LỜI ĐƯỢC'}] ${ms}ms`);
  console.log('─'.repeat(78));
  console.log(a.reply);
  if (a.links?.length) console.log('\n🔗 ' + a.links.map((l) => `${l.label} → ${l.url}`).join('\n🔗 '));
  if (a.suggestions?.length) console.log('💡 ' + a.suggestions.join(' | '));
}

console.log('\n' + '═'.repeat(78));
console.log(`Tổng: ${list.length} câu · trả lời được ${list.length - unanswered} · không trả lời được ${unanswered}`);
await prisma.$disconnect();
