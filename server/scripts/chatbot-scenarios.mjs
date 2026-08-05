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
  {
    // Từ chỉ buổi/ngày từng tự kích hoạt nhánh lộ trình dù câu hỏi chẳng liên
    // quan gì tới tham quan. Nhánh lộ trình đứng rất sớm (mục 3b) nên nó nuốt là
    // các nhánh sau không còn cơ hội — "ăn gì vào buổi sáng" nhận về một bản lộ
    // trình vãn cảnh chùa, còn "quán nào mở cả ngày" thì mất luôn nhánh giờ mở cửa.
    //
    // Nhóm này ghim CẢ HAI CHIỀU: câu hỏi ăn uống/giờ giấc không được thành lộ
    // trình, mà câu hỏi lộ trình thật thì vẫn phải ra lộ trình.
    group: 'S. Từ chỉ buổi/ngày không được nuốt nhánh khác',
    items: [
      ['ăn gì vào buổi sáng', 'answer', ['open_early']],
      ['buổi sáng ăn gì ngon', 'answer', ['open_early']],
      ['sáng nay ăn gì', 'answer', ['open_early']],
      ['ăn sáng ở đâu', 'answer', ['open_early']],
      ['cà phê buổi sáng ở đâu', 'answer', ['open_early']],
      ['quán nào mở cả ngày', 'answer', ['open_allday']],
      // Chiều ngược lại — hỏi lộ trình thật thì vẫn phải ra lộ trình
      ['lộ trình buổi sáng', 'answer', ['route']],
      ['buổi sáng đi đâu', 'answer', ['route']],
      ['buổi sáng nên làm gì', 'answer', ['route']],
      ['lộ trình cả ngày', 'answer', ['route']],
      ['đi trong ngày thì đi những đâu', 'answer', ['route']],
      // Và "sáng" trong câu hỏi thời tiết vẫn phải là thời tiết
      ['sáng nay trời thế nào', 'answer', ['weather_now', 'weather_day']],
    ],
  },
  {
    // Căn cước hành chính của phường — khoá `hanhChinh`, nguồn TinhThanhVN.
    //
    // Nhóm này ghim một ranh giới rất dễ trượt. Nhánh 3d chặn mọi câu có cụm
    // "hành chính" vì coi là thủ tục giấy tờ, ngoài phạm vi cổng du lịch. Nhưng
    // "mã hành chính của phường" thì lại đúng là thứ cổng phường phải biết.
    // Ranh giới đúng là: hỏi VỀ PHƯỜNG thì trả lời, hỏi CÁCH LÀM GIẤY TỜ thì
    // vẫn từ chối. Nửa dưới của nhóm canh đúng nửa còn lại của ranh giới đó.
    //
    // Năm tên đơn vị cũ vẫn sống trong dữ liệu hiện tại (khu phố Nguyễn Huệ,
    // Nhà hàng Thuỷ An, đền Trần Hưng Đạo), nên ba câu cuối canh việc gọi tên
    // không thôi thì KHÔNG được nhảy sang nhánh hành chính.
    group: 'T. Căn cước hành chính của phường',
    items: [
      ['phường Đông Triều sáp nhập từ những đơn vị nào', 'answer', ['about_admin_merge']],
      ['phường được lập từ những xã nào', 'answer', ['about_admin_merge']],
      ['xã Nguyễn Huệ giờ thuộc phường nào', 'answer', ['about_admin_merge']],
      ['phường Đức Chính còn không', 'answer', ['about_admin_merge']],
      ['mã bưu chính phường Đông Triều là gì', 'answer', ['about_admin_code']],
      ['mã định danh của phường', 'answer', ['about_admin_code']],
      ['mã hành chính của phường Đông Triều', 'answer', ['about_admin_code']],
      ['trụ sở UBND phường ở đâu', 'answer', ['about_admin_office']],
      ['cổng thông tin điện tử của phường', 'answer', ['about_admin_office']],
      // Hỏi THỦ TỤC thì vẫn phải từ chối trung thực như trước
      ['làm hộ chiếu ở đâu', 'reject'],
      ['thủ tục hành chính làm ở đâu', 'reject'],
      ['xin giấy phép xây dựng thế nào', 'reject'],
      // Gọi tên đơn vị cũ mà không hỏi chuyện sáp nhập — không được nhảy nhánh
      ['quán ăn khu Nguyễn Huệ', 'answer', ['list_restaurant', 'lookup_restaurant', 'khu_pho_detail']],
      ['Nhà Hàng Thủy An mở mấy giờ', 'answer', ['lookup_restaurant', 'open_hours']],
      ['số điện thoại UBND phường', 'answer', ['contact']],
    ],
  },
  {
    // Mốc ngày trong câu hỏi phải được tôn trọng.
    //
    // "Mai nên đi đâu" từng trả về lời khuyên của HÔM NAY: hôm nay mưa thì bot
    // bảo mai nên vào chỗ có mái che, dù mai có thể nắng ráo. Không có gì trong
    // câu trả lời tự tố cáo là nó đang nói về ngày khác — chỉ có ý định mới
    // phân biệt được, nên nhóm này ghim bằng ý định chứ không bằng `matched`.
    //
    // "Cuối tuần" và "thứ bảy" cố ý nhận CẢ HAI ý định: nếu chạy bộ kiểm đúng
    // vào thứ bảy thì mốc đó chính là hôm nay, `where_today` mới là đúng.
    group: 'U. Hỏi ngày nào thì khuyên theo ngày đó',
    items: [
      ['mai nên đi đâu', 'answer', ['where_day']],
      ['ngày mai nên đi đâu', 'answer', ['where_day']],
      ['mai đi đâu chơi', 'answer', ['where_day']],
      ['ngày kia nên đi đâu', 'answer', ['where_day']],
      ['cuối tuần nên đi đâu', 'answer', ['where_day', 'where_today']],
      ['thứ bảy nên đi đâu', 'answer', ['where_day', 'where_today']],
      // Không nhắc ngày, hoặc nhắc "hôm nay" → vẫn là hôm nay như cũ
      ['hôm nay nên đi đâu', 'answer', ['where_today']],
      ['nên đi đâu', 'answer', ['where_today']],
      ['gợi ý chỗ chơi', 'answer', ['where_today']],
      ['cả tuần tới nên đi đâu', 'answer', ['where_today']],
      // "Có nên đi không / nên làm gì" — chỉ tính khi có mốc ngày
      ['mai có nên đi chùa không', 'answer', ['where_day']],
      ['hôm nay có nên đi chùa không', 'answer', ['where_today']],
      ['mai nên làm gì', 'answer', ['where_day']],
      // …còn hỏi đích danh một di tích thì vẫn phải là tra cứu di tích
      ['có nên đi chùa Mỹ Cụ không', 'answer', ['lookup_heritage']],
      ['chùa Đông Mai ở đâu', 'answer', ['lookup_heritage']],
      // Hỏi thời tiết vẫn là thời tiết, hỏi lộ trình vẫn là lộ trình
      ['mai trời thế nào', 'answer', ['weather_day']],
      ['buổi sáng nên làm gì', 'answer', ['route']],
    ],
  },
  {
    // Phản ánh, góp ý, khiếu nại — ba việc khác nhau, ba câu trả lời khác nhau.
    //
    // Nhóm này canh một thứ quan trọng hơn cả định tuyến: **cổng không được
    // hứa hộ chính quyền**. Phản ánh đời sống (rác, đường hỏng, tiếng ồn) thì
    // biểu mẫu của cổng KHÔNG nhận được, nên câu trả lời phải nói thẳng ra thay
    // vì chỉ sang biểu mẫu cho có vẻ chu đáo.
    //
    // Ba câu cuối canh THỨ TỰ ƯU TIÊN: "cháy nhà báo ai" khớp cả cụm phản ánh
    // lẫn cụm khẩn cấp. Nhầm về phía số 114 thì cùng lắm là thừa; nhầm về phía
    // biểu mẫu web thì có thể là mất mạng người.
    group: 'V. Phản ánh, góp ý, liên hệ chính quyền',
    items: [
      ['tôi muốn phản ánh', 'answer', ['feedback_ward']],
      ['phản ánh ở đâu', 'answer', ['feedback_ward']],
      ['gửi phản ánh thế nào', 'answer', ['feedback_ward']],
      ['tôi muốn góp ý cho phường', 'answer', ['feedback_ward']],
      ['kiến nghị với phường', 'answer', ['feedback_ward']],
      ['đường hỏng báo ai', 'answer', ['feedback_ward']],
      ['đổ trộm rác báo cho ai', 'answer', ['feedback_ward']],
      ['mất điện báo ai', 'answer', ['feedback_ward']],
      // Khiếu nại, tố cáo — thủ tục pháp lý, cổng chỉ đường chứ không nhận
      ['muốn khiếu nại', 'answer', ['feedback_legal']],
      ['tố cáo cán bộ', 'answer', ['feedback_legal']],
      // Góp ý về CHÍNH CỔNG NÀY — thứ duy nhất cổng nhận trực tiếp được
      ['thông tin sai trên trang này báo ai', 'answer', ['feedback_portal']],
      ['bot trả lời sai thì báo ở đâu', 'answer', ['feedback_portal']],
      ['tôi muốn báo lỗi website', 'answer', ['feedback_portal']],
      // Việc khẩn cấp phải thắng nhánh phản ánh
      ['cháy nhà báo ai', 'answer', ['contact_emergency']],
      ['có trộm gọi số nào', 'answer', ['contact_emergency']],
      ['tai nạn giao thông gọi ai', 'answer', ['contact_emergency']],
      // Hỏi liên hệ thuần tuý thì vẫn là bảng liên hệ như cũ
      ['liên lạc với chính quyền', 'answer', ['contact']],
      ['liên hệ UBND phường', 'answer', ['contact']],
    ],
  },
  {
    // "tối muộn" ≡ "TÔI MUỐN" sau khi bỏ dấu.
    //
    // Cụm 'toi muon' trần từng là từ khoá của nhánh quán ăn khuya, nên mọi câu
    // mở đầu bằng "tôi muốn…" đều được đáp lại bằng danh sách quán ăn khuya.
    // Nửa trên canh việc đó không tái diễn; nửa dưới canh việc sửa xong thì
    // nhánh ăn khuya thật vẫn chạy.
    group: 'W. "tôi muốn" không được hiểu thành "tối muộn"',
    items: [
      ['tôi muốn biết lễ hội', 'answer', ['list_festival']],
      ['tôi muốn hỏi về di tích', 'answer', ['list_heritage']],
      ['tôi muốn phản ánh', 'answer', ['feedback_ward']],
      ['quán nào mở tối muộn', 'answer', ['open_late']],
      ['chỗ nào mở khuya', 'answer', ['open_late']],
      ['ăn tối muộn ở đâu', 'answer', ['open_late']],
      ['ăn đêm ở đâu', 'answer', ['open_late']],
      // Và "chay" trong "ăn chay" không được thành "cháy"
      ['quán ăn chay', 'answer', ['list_restaurant']],
      ['ăn chay ở đâu', 'answer', ['list_restaurant']],
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
  for (const [q, expect, accept] of items) {
    const a = await ask(q);
    const dungTrangThai = expect === 'answer' ? a.matched === true : a.matched === false;
    // `accept` (tuỳ chọn) = tập ý định hợp lệ. Có nó thì đi nhầm nhánh là TRƯỢT,
    // không phải chỉ cảnh báo. Cần mức chặt này vì lớp lỗi hay gặp nhất của trợ
    // lý là "trả lời trôi chảy nhưng lạc nhánh": bot vẫn `matched = true` nên
    // mọi phép kiểm chỉ nhìn `matched` đều cho qua. Ví dụ thật: "ăn gì vào buổi
    // sáng" từng trả về một bản lộ trình vãn cảnh chùa.
    const dungYDinh = !accept || accept.includes(a.intent);
    const ok = dungTrangThai && dungYDinh;
    if (ok) {
      pass++;
      gp++;
    } else {
      fail++;
      failures.push({
        group,
        q,
        expect,
        got: a.intent,
        matched: a.matched,
        lyDo: dungTrangThai ? `đi nhầm nhánh (mong ${accept.join('/')})` : null,
      });
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
    const mong = f.lyDo ?? `mong ${f.expect === 'answer' ? 'trả lời được' : 'từ chối'}`;
    console.log(`  ✗ "${f.q}" — ${mong}, nhận [${f.got}] matched=${f.matched}`);
  }
}

await prisma.$disconnect();
process.exitCode = fail ? 1 : 0;
