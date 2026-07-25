/**
 * Bộ KỊCH BẢN HỎI cho trợ lý du lịch Đông Triều.
 *
 * Mô phỏng các nhóm câu hỏi mà một trợ lý ảo trên cổng thông tin chính quyền/du
 * lịch (kiểu Cổng thông tin TP Huế) thường phải xử lý, rồi kiểm tra xem bot của
 * mình đáp ứng tới đâu. Mỗi câu gắn kỳ vọng:
 *
 *   'answer'   → bot PHẢI trả lời được (matched = true)
 *   'graceful' → bot PHẢI từ chối trung thực (matched = false), KHÔNG bịa
 *
 * Chạy:  npm run test-scenarios
 *        npm run test-scenarios --fails   (chỉ in câu chưa đạt)
 *
 * Đây vừa là bộ hồi quy, vừa là "bản đồ" cho biết cần bổ sung dữ liệu ở đâu.
 */

import { ask } from '../src/services/chatbot.js';
import { prisma } from '../src/lib/prisma.js';

const SCENARIOS = [
  {
    group: 'A. Chào hỏi & trợ giúp',
    items: [
      ['xin chào', 'answer'],
      ['alo bạn ơi', 'answer'],
      ['bạn là ai vậy', 'answer'],
      ['bạn giúp được gì cho tôi', 'answer'],
      ['cảm ơn bạn nhé', 'answer'],
    ],
  },
  {
    group: 'B. Giới thiệu địa phương',
    items: [
      ['giới thiệu về Đông Triều', 'answer'],
      ['Đông Triều ở đâu', 'answer'],
      ['Đông Triều thuộc tỉnh nào', 'answer'],
      ['Đông Triều nổi tiếng về gì', 'answer'],
      ['Đông Triều có gì đặc biệt', 'answer'],
    ],
  },
  {
    group: 'C. Di tích & danh thắng',
    items: [
      ['Đông Triều có bao nhiêu di tích', 'answer'],
      ['kể tên các di tích ở Đông Triều', 'answer'],
      ['chùa Mỹ Cụ có gì đặc biệt', 'answer'],
      ['đền Yết Kiêu thờ ai', 'answer'],
      ['đồn cao ở đâu', 'answer'],
      ['chua my cu o dau', 'answer'], // không dấu
      ['chùa mĩ cụ', 'answer'], // sai chính tả
      ['di tích nào là quốc gia đặc biệt', 'answer'],
    ],
  },
  {
    group: 'D. Lễ hội & sự kiện',
    items: [
      ['lễ hội nào sắp diễn ra', 'answer'],
      ['Đông Triều có những lễ hội gì', 'answer'],
      ['lễ hội tháng Giêng có những gì', 'answer'],
      ['hội làng Vân Động là gì', 'answer'],
      ['lễ hội Thái Miếu tổ chức khi nào', 'answer'],
    ],
  },
  {
    group: 'E. Ẩm thực & đặc sản',
    items: [
      ['ăn gì ở Đông Triều', 'answer'],
      ['đặc sản Đông Triều có gì', 'answer'],
      ['na Đông Triều mùa nào', 'answer'],
      ['rươi là món gì', 'answer'],
      ['mua quà gì về làm quà', 'answer'],
    ],
  },
  {
    group: 'F. Lưu trú',
    items: [
      ['khách sạn ở đâu', 'answer'],
      ['có nhà nghỉ nào không', 'answer'],
      ['ngủ ở đâu qua đêm', 'answer'],
      ['các khách sạn gần miếu hậu', 'answer'], // danh mục thắng tên riêng
      ['có homestay không', 'answer'],
    ],
  },
  {
    group: 'G. Nhà hàng & ăn uống',
    items: [
      ['có nhà hàng nào ngon không', 'answer'],
      ['quán ăn gần chùa Mỹ Cụ', 'answer'],
      ['ăn hải sản ở đâu', 'answer'],
      ['nhà hàng Xuân Viên có gì', 'answer'],
      ['gợi ý nhà hàng giá hợp lý', 'answer'],
      ['gợi ý dịch vụ chất lượng tốt', 'answer'],
      ['quán nào ngon bổ rẻ', 'answer'],
    ],
  },
  {
    group: 'H. Vé & giờ mở cửa',
    items: [
      ['vé vào cửa bao nhiêu', 'answer'],
      ['tham quan có mất phí không', 'answer'],
      ['mấy giờ mở cửa', 'answer'],
      ['giờ tham quan di tích thế nào', 'answer'],
    ],
  },
  {
    group: 'I. Thời tiết & triều cường',
    items: [
      ['thời tiết hôm nay thế nào', 'answer'],
      ['ngày mai có mưa không', 'answer'],
      ['dự báo 7 ngày tới', 'answer'],
      ['nhiệt độ bây giờ bao nhiêu', 'answer'],
      ['triều cường hôm nay thế nào', 'answer'],
      ['con nước lên xuống giờ nào', 'answer'],
    ],
  },
  {
    group: 'J. Đường đi & phương tiện',
    items: [
      ['đi từ Hà Nội đến Đông Triều thế nào', 'answer'],
      ['Đông Triều cách Hà Nội bao xa', 'answer'],
      ['đi Ngoạ Vân bằng gì', 'answer'],
      ['có xe khách đi Đông Triều không', 'answer'],
    ],
  },
  {
    group: 'K. Lịch trình & ngân sách',
    items: [
      ['hôm nay nên đi đâu', 'answer'],
      ['gợi ý lịch trình 2 ngày 1 đêm', 'answer'],
      ['buổi sáng đi đâu buổi chiều đi đâu', 'answer'],
      ['tôi có 2 triệu thì vạch lộ trình tham quan và ăn uống', 'answer'],
      ['đi Đông Triều hết bao nhiêu tiền', 'answer'],
      ['đi trong ngày thì đi những đâu', 'answer'],
    ],
  },
  {
    group: 'K2. Lộ trình cá nhân hoá (buổi / sở thích / sức khoẻ)',
    items: [
      ['lộ trình đi trong 1 buổi sáng', 'answer'],
      ['buổi chiều đi đâu', 'answer'],
      ['lộ trình cả ngày', 'answer'],
      ['lịch trình cho người lớn tuổi', 'answer'],
      ['lộ trình nhẹ nhàng ít leo trèo', 'answer'],
      ['lộ trình thiên về tâm linh', 'answer'],
      ['lộ trình lịch sử cách mạng', 'answer'],
      ['gia đình có trẻ nhỏ nên đi đâu', 'answer'],
    ],
  },
  {
    group: 'L. Liên hệ & khẩn cấp',
    items: [
      ['số điện thoại UBND phường', 'answer'],
      ['đường dây nóng của phường', 'answer'],
      ['gọi cấp cứu số mấy', 'answer'],
      ['số điện thoại công an', 'answer'],
      ['liên hệ với ai khi cần', 'answer'],
    ],
  },
  {
    group: 'M. Ngoài phạm vi — phải từ chối trung thực',
    items: [
      ['làm căn cước công dân ở đâu', 'graceful'],
      ['thủ tục đăng ký kết hôn thế nào', 'graceful'],
      ['có ATM gần đây không', 'graceful'],
      ['bãi đỗ xe ở đâu', 'graceful'],
      ['giá vé máy bay đi Đà Nẵng', 'graceful'],
      ['thủ đô nước Pháp là gì', 'graceful'],
    ],
  },
];

const onlyFails = process.argv.includes('--fails');

let pass = 0;
let fail = 0;
const failures = [];

console.log('\n══════════ KIỂM THỬ KỊCH BẢN HỎI ══════════\n');

for (const { group, items } of SCENARIOS) {
  const rows = [];
  let gp = 0;
  for (const [q, expect] of items) {
    const a = await ask(q);
    const ok = expect === 'answer' ? a.matched === true : a.matched === false;
    if (ok) {
      pass++;
      gp++;
    } else {
      fail++;
      failures.push({ group, q, expect, got: a.intent, matched: a.matched });
    }
    rows.push({ q, expect, ok, intent: a.intent });
  }
  const flag = gp === items.length ? '✓' : '⚠';
  console.log(`${flag} ${group}  (${gp}/${items.length})`);
  if (!onlyFails) {
    for (const r of rows) {
      console.log(`    ${r.ok ? '·' : '✗'} [${r.expect === 'answer' ? 'trả lời' : 'từ chối'}] ${r.q}  → ${r.intent}`);
    }
  }
}

console.log('\n═══════════════════════════════════════════');
console.log(`Tổng: ${pass + fail} câu · đạt ${pass} · chưa đạt ${fail}`);
if (failures.length) {
  console.log('\nCÂU CHƯA ĐẠT:');
  for (const f of failures) {
    console.log(`  ✗ "${f.q}" — mong ${f.expect === 'answer' ? 'trả lời được' : 'từ chối'}, nhận [${f.got}] matched=${f.matched}`);
  }
}

await prisma.$disconnect();
process.exitCode = fail ? 1 : 0;
