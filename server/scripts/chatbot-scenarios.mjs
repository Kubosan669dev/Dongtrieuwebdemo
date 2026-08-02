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
    // Bối cảnh vùng đất — dữ liệu ở khoá cài đặt `vungDat`.
    //
    // "Đông Triều có ga tàu không" nằm đây vì một lý do cụ thể: bỏ dấu xong thì
    // "ga tau" đụng "ga doi" trong **Gà đồi Đông Triều**, và bot từng trả về công
    // thức món gà cho câu hỏi về đường sắt.
    group: 'B2. Vị trí, lịch sử, kinh tế, giao thông',
    items: [
      ['Đông Triều giáp với những nơi nào', 'answer'],
      ['Đông Triều cách Hà Nội bao xa', 'answer'],
      ['lịch sử Đông Triều ra sao', 'answer'],
      ['vì sao gọi là Đông Triều', 'answer'],
      ['trước đây Đông Triều thuộc tỉnh nào', 'answer'],
      ['khi nào Đông Triều lên thành phố', 'answer'],
      ['kinh tế Đông Triều thế nào', 'answer'],
      ['Đông Triều có mỏ than không', 'answer'],
      ['Đông Triều có ga tàu không', 'answer'],
      ['quốc lộ nào chạy qua Đông Triều', 'answer'],
      ['Đông Triều rộng bao nhiêu km2', 'answer'],
      ['Đông Triều có bao nhiêu dân', 'answer'],
    ],
  },
  {
    /**
     * “Đông Triều huyện địa chí” — Tri huyện Ngô Sinh chép năm 1896, khoá cài
     * đặt `diaChi1896`. Núi sông, cầu chợ, cổ tích, nhân vật, thổ sản, tên làng cũ.
     *
     * ── BA CỤM ĐÃ PHẢI BỎ VÌ ĐỤNG NGHĨA SAU KHI BỎ DẤU ───────────────────────
     * Hai câu cuối nhóm này canh đúng chỗ đó, và đều là lỗi CÓ THẬT:
     *   'dia chi' ≡ **địa chỉ** → "địa chỉ chùa Mỹ Cụ" hoá ra hỏi sách địa chí
     *   'chua co' ≡ **chưa có** · 'den co' ≡ **đến có**
     * Cùng lớp lỗi với "ga tàu" ↔ "gà đồi" ở nhóm B2.
     */
    group: 'B3. Địa chí Hán Nôm 1896',
    items: [
      ['địa chí 1896 là sách gì', 'answer'],
      ['Đông Triều có núi nào', 'answer'],
      ['núi Quy Sơn ở đâu', 'answer'],
      ['núi Yên Tử có gì', 'answer'],
      ['sông nào chảy qua Đông Triều xưa', 'answer'],
      ['danh nhân Đông Triều là ai', 'answer'],
      ['ai đỗ tiến sĩ đời Trần', 'answer'],
      ['thổ sản Đông Triều xưa có gì', 'answer'],
      ['cổ tích Đông Triều gồm những gì', 'answer'],
      ['phong tục Đông Triều xưa thế nào', 'answer'],
      ['Đông Triều xưa là phủ hay huyện', 'answer'],
      ['Mỹ Cụ nghĩa là gì', 'answer'],
      ['tên cũ của Mễ Xá', 'answer'],
      ['khu phố nào có tên từ xưa', 'answer'],
      ['khu phố Trạo Hà xưa tên gì', 'answer'],
      ['dia chi 1896 co nhung gi', 'answer'], // không dấu
      // Hai câu canh: PHẢI ra di tích, KHÔNG được rơi vào nhánh địa chí.
      ['địa chỉ chùa Mỹ Cụ', 'answer'],
      ['chùa Ngọc Thanh ở đâu', 'answer'],
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
      // Va chạm tên ngẫu nhiên: "tỷ" trùng "Tỵ" trong "Phở Bò Xuân Tỵ"
      ['tỷ giá đô la hôm nay', 'graceful'],
    ],
  },

  // ── Nhóm N–R: năng lực mở ra nhờ bộ dữ liệu khảo sát 2026 ──

  {
    group: 'N. Đánh giá & xếp hạng cơ sở',
    items: [
      ['quán nào đánh giá cao nhất', 'answer'],
      ['nhà hàng nào ngon nhất Đông Triều', 'answer'],
      ['khách sạn nào được đánh giá tốt', 'answer'],
      ['quán ăn nào giá mềm', 'answer'],
      ['chỗ nào ăn ngon bổ rẻ', 'answer'],
      // Hỏi đích danh cơ sở điểm thấp → vẫn phải trả lời đầy đủ, không né
      ['Ốc 94 thế nào', 'answer'],
      // Chưa có trong dữ liệu → phải từ chối, không được bịa
      ['quán nào wifi mạnh nhất', 'graceful'],
    ],
  },
  {
    group: 'O. Giờ mở cửa',
    items: [
      ['giờ này còn quán nào mở không', 'answer'],
      ['quán nào mở 24/24', 'answer'],
      ['ăn khuya ở đâu', 'answer'],
      ['quán nào mở sớm để ăn sáng', 'answer'],
      ['quán cà phê nào đang mở', 'answer'],
      ['nhà nghỉ nào nhận phòng 24h', 'answer'],
    ],
  },
  {
    group: 'P. Tìm quanh một di tích',
    items: [
      // Có toạ độ → khoảng cách thật
      ['quán ăn gần đền Yết Kiêu', 'answer'],
      // Không có toạ độ nhưng quy được khu phố
      ['quán ăn gần chùa Quán Ngọc Thanh', 'answer'],
      // Không có cả hai → vẫn phải trả lời trung thực, không bịa thứ tự gần nhất
      ['quán ăn gần Đồn Cao', 'answer'],
      ['khách sạn gần miếu Hậu', 'answer'],
    ],
  },
  {
    group: 'Q. Khu phố (cơ cấu hành chính 2025)',
    items: [
      ['phường có bao nhiêu khu phố', 'answer'],
      ['khu phố Mỹ Cụ gồm những khu nào', 'answer'],
      ['ăn gì ở khu phố Nguyễn Bình', 'answer'],
      ['nhà nghỉ khu phố Đạm Thuỷ', 'answer'],
      ['khu phố Đông Mai có bao nhiêu hộ', 'answer'],
    ],
  },
  {
    group: 'R. Cà phê & lễ hội chi tiết',
    items: [
      ['quán cà phê nào đẹp', 'answer'],
      ['trà sữa ở đâu ngon', 'answer'],
      ['lễ hội đền An Sinh thờ ai', 'answer'],
      ['lễ hội chùa Quỳnh Lâm có nghi lễ gì', 'answer'],
      ['đi lễ hội Ngọa Vân cần lưu ý gì', 'answer'],
      ['lễ hội Thái Miếu phần hội có gì', 'answer'],
      ['lễ hội Ngọc Thanh có ý nghĩa gì', 'answer'],
      // Hội làng nhỏ chưa có hồ sơ chi tiết → phải nói thật là chưa có
      ['hội làng Bình Lục có kinh nghiệm gì cho du khách', 'graceful'],
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
