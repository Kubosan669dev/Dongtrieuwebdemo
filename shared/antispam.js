/**
 * Tên ô bẫy chống bot (honeypot), dùng CHUNG cho cả máy chủ và trình duyệt.
 *
 * Phải nằm ở đây chứ không phải mỗi bên một chuỗi: máy chủ loại yêu cầu khi ô
 * này có nội dung, còn trình duyệt là nơi vẽ ra ô đó. Hai bên lệch tên nhau thì
 * cái bẫy im lặng ngừng hoạt động — không lỗi, không cảnh báo, chỉ là spam bắt
 * đầu lọt lưới mà không ai biết.
 *
 * Đặt bằng tiếng Việt có chủ ý: các heuristic tự động điền của trình duyệt nhận
 * ra `website`, `url`, `company`… và sẽ điền hộ người dùng thật, biến ô bẫy
 * thành cái bẫy chính khách hàng. Tên này thì không trình duyệt nào đoán, còn
 * bot điền mù mọi `<input>` vẫn sập.
 */
export const HONEYPOT_FIELD = 'thongTinThem';
