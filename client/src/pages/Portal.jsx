import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BedDouble, CalendarHeart, ClipboardList, CloudSun, Landmark, Map, MapPin, MapPinned, Megaphone, Newspaper, ScrollText, TreePalm, UtensilsCrossed } from 'lucide-react';
import { fetchList } from '../lib/api.js';
import Seo from '../components/Seo.jsx';
import { useSettings } from '../hooks/useSettings.js';
import { SITE_NAME, SITE_OWNER, SITE_SHORT } from '../lib/site.js';

/**
 * TRANG CHỦ CHUNG — cửa vào duy nhất của cả hai cổng.
 *
 * ── VÌ SAO NÓ THAY CHO NÚT "TÔI LÀ DU KHÁCH / TÔI LÀ NGƯỜI DÂN" ────────────
 * Nút cũ là một cặp chip bé xíu nép cạnh thanh điều hướng. Ba vấn đề cùng lúc,
 * và vấn đề thứ ba mới là nặng nhất:
 *
 *   · Chật. Nó tranh chỗ với bảy mục điều hướng trong một khung chứa đã kịch
 *     trần 1.280px, và chính nó là thứ đẩy cả hàng tràn dòng.
 *   · Khó đọc. Nằm trên đầu trang trong suốt đè lên ảnh bìa tối, chip chưa chọn
 *     là chữ sẫm trên nền sẫm.
 *   · **Không nói được nó làm gì.** Hai chữ "Du khách" cạnh thanh điều hướng
 *     trông như một bộ lọc. Không ai đoán được bấm vào đó là đổi hẳn nội dung,
 *     thanh điều hướng và cả trợ lý AI của cổng.
 *
 * Hai lối vào to bằng nửa màn hình thì nói được cả ba điều. Chọn xong một lần
 * rồi từ đó mỗi trang vẫn thuộc đúng một cổng như cũ — trang này không phá ranh
 * giới ấy, nó chỉ đứng trước ranh giới.
 *
 * ── DỮ LIỆU THẬT, KHÔNG PHẢI ẢNH TRANG TRÍ ────────────────────────────────
 * Ảnh nền, sáu tấm thẻ nổi và dải số liệu dưới chân màn hình đều lấy từ bảng
 * di tích trong cơ sở dữ liệu. Không có số nào gõ tay: thêm một di tích trong
 * trang quản trị thì con số ở đây tự đổi theo. Đây là cổng của phường, một con
 * số trưng ra ngoài cửa mà sai thì sai ở chỗ dễ thấy nhất.
 */

/** Hai lối vào — thứ tự này cũng là thứ tự đọc, nên bên nào đông người hơn đứng trước. */
const CONG = [
  {
    to: '/du-khach',
    icon: TreePalm,
    nhan: 'Tôi là du khách',
    vao: 'Vào cổng du khách',
    pitch: 'Về Đông Triều thăm di tích nhà Trần, đi lễ hội, ăn đặc sản và tìm chỗ nghỉ.',
    muc: [
      { icon: Landmark, ten: 'Di tích & danh thắng', phu: 'Hồ sơ từng cụm, đã xếp hạng' },
      { icon: CalendarHeart, ten: 'Lễ hội truyền thống', phu: 'Lịch âm quy đổi sang dương' },
      { icon: UtensilsCrossed, ten: 'Ẩm thực & đặc sản', phu: 'Na dai, rươi, gà đồi…' },
      { icon: BedDouble, ten: 'Lưu trú', phu: 'Khách sạn, nhà nghỉ, homestay' },
      { icon: Map, ten: 'Bản đồ số', phu: 'Toàn bộ điểm đến trên một bản đồ' },
      { icon: CloudSun, ten: 'Thời tiết & triều cường', phu: 'Cập nhật theo giờ' },
    ],
  },
  {
    to: '/nguoi-dan',
    icon: Landmark,
    nhan: 'Tôi là người dân',
    vao: 'Vào cổng người dân',
    pitch: 'Tra khu phố sau sắp xếp, làm thủ tục đất đai, đọc văn bản và gửi phản ánh tới phường.',
    muc: [
      { icon: MapPinned, ten: 'Khu phố của tôi', phu: '36 khu cũ → 11 khu mới' },
      { icon: ClipboardList, ten: 'Thủ tục đất đai', phu: '19 việc làm ngay tại phường' },
      { icon: ScrollText, ten: 'Văn bản chỉ đạo', phu: 'Quyết định xếp hạng di tích' },
      { icon: Landmark, ten: 'Hành chính phường', phu: 'Mã bưu chính, đơn vị cũ, trụ sở' },
      { icon: Megaphone, ten: 'Phản ánh & góp ý', phu: 'Gửi đúng nơi ngay từ đầu' },
      { icon: Newspaper, ten: 'Tin tức & thông báo', phu: 'Tin của chính quyền phường' },
    ],
  },
];

/**
 * Vị trí sáu tấm thẻ nổi hai bên màn hình.
 *
 * Chúng nằm trong LỀ hai bên, không phải trong cột chữ: khối chữ giữa màn hình
 * rộng tối đa 48rem, nên từ 1280px trở lên mỗi bên còn dư khoảng 250px — vừa đủ
 * một tấm thẻ 13rem mà không chạm vào chữ. Hẹp hơn mức đó thì ẩn hẳn (`xl:block`)
 * chứ không thu nhỏ: thẻ đè lên tiêu đề thì cả hai thứ cùng hỏng.
 */
// Góc nghiêng chỉ dùng các nấc CÓ SẴN của Tailwind (0·1·2·3·6·12…). `rotate-5`
// hay `-rotate-4` nghe hợp lý nhưng không tồn tại, và lớp không tồn tại thì
// không sinh ra CSS nào — thẻ nằm thẳng đơ mà chẳng có lỗi nào báo.
const VI_TRI_THE = [
  'left-[2%] top-[14%] -rotate-6',
  'left-[6%] top-[41%] rotate-3',
  'left-[3%] top-[67%] -rotate-3',
  'right-[3%] top-[11%] rotate-6',
  'right-[6%] top-[39%] -rotate-2',
  'right-[2%] top-[68%] rotate-2',
];

function TheNoi({ di, className, delay }) {
  return (
    <figure
      // `animate-float` đã có sẵn quy tắc tắt khi người dùng bật "giảm chuyển
      // động" trong hệ điều hành (xem styles/index.css) nên không cần canh riêng.
      className={`pointer-events-none absolute w-[13rem] animate-float rounded-xl bg-white/95 p-1.5 shadow-lift ${className}`}
      style={{ animationDelay: delay }}
      aria-hidden="true"
    >
      <div className="relative overflow-hidden rounded-lg">
        <img src={di.coverUrl} alt="" className="h-28 w-full object-cover" loading="lazy" />
        <figcaption className="absolute inset-x-0 bottom-0 bg-jade-950/75 px-2 py-1 text-center text-[11px] font-semibold text-white">
          {di.name}
        </figcaption>
      </div>
    </figure>
  );
}

export default function Portal() {
  const settings = useSettings();
  // Một lượt gọi cho cả ba việc: ảnh nền, sáu tấm thẻ và con số "N di tích".
  // Bảng chỉ có 13 bản ghi nên lấy hết vẫn nhẹ hơn hai lượt gọi riêng.
  const diTich = useQuery({ queryKey: ['heritages', 'portal'], queryFn: () => fetchList('heritages') });

  // `fetchList` trả về NGUYÊN phản hồi `{ items, total }`, không phải mảng —
  // xem `lib/api.js`. Quên `.items` là `.filter` ném "n.filter is not a
  // function" và React Router thay cả trang bằng màn hình lỗi.
  // `Array.isArray` chứ không phải `?? []` như các trang khác trong dự án. Đây là
  // CỬA VÀO của cả cổng: một kiểu dữ liệu bất ngờ ở đây không làm hỏng một khối,
  // nó ném lỗi lúc render và React Router thay TOÀN BỘ trang bằng màn hình
  // "Unexpected Application Error" — người vào không còn lối nào đi tiếp.
  const tatCa = Array.isArray(diTich.data?.items) ? diTich.data.items : [];
  const coAnh = tatCa.filter((h) => h.coverUrl);
  // Ưu tiên di tích được đánh dấu tiêu biểu; thiếu thì lấy thêm cho đủ sáu.
  const the = [...coAnh.filter((h) => h.featured), ...coAnh.filter((h) => !h.featured)].slice(0, 6);
  const anhNen = the[0]?.coverUrl ?? null;

  const soKhuPho = settings.khuPho?.danhSach?.length ?? null;
  // `total` là số bản ghi THẬT trong bảng, không phải số vừa tải về — dùng nó
  // thì con số vẫn đúng kể cả sau này danh sách có phân trang.
  const soDiTich = diTich.data?.total ?? tatCa.length;
  const soLieu = [
    { icon: MapPin, chu: `Phường ${SITE_SHORT}, Quảng Ninh` },
    soDiTich ? { icon: Landmark, chu: `${soDiTich} di tích đã xếp hạng` } : null,
    soKhuPho ? { icon: MapPinned, chu: `${soKhuPho} khu phố` } : null,
  ].filter(Boolean);

  return (
    <>
      {/* Không truyền `title`: trang chủ lấy đúng tên site làm thẻ <title>, không
          thêm hậu tố "— Phường Đông Triều" vào một cái tên đã là chính nó. */}
      <Seo
        description={`Cổng thông tin ${SITE_OWNER}. Chọn cổng du khách để xem di tích, lễ hội, ẩm thực, lưu trú; hoặc cổng người dân để tra khu phố, thủ tục đất đai, văn bản và gửi phản ánh.`}
      />

      {/* ── MÀN HÌNH ĐẦU ────────────────────────────────────────────────────
          Chiếm trọn chiều cao khung nhìn, và ở trang này là trọn thật: `Layout`
          không dựng đầu trang lẫn chân trang cho `/`, nên `min-h-screen` bằng
          đúng 100vh chứ không phải 100vh cộng thêm dải 4rem của đầu trang. */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-jade-950 text-white">
        {anhNen && (
          <img
            src={anhNen}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full animate-ken-burns object-cover"
          />
        )}
        {/* Hai lớp phủ: một lớp tối đều để chữ luôn đọc được, một lớp toả từ giữa
            để mắt rơi vào khối chữ trước rồi mới đi ra rìa. */}
        <div className="absolute inset-0 bg-jade-950/70" />
        {/* Lớp toả dùng `rgba()` đen thay cho biến màu của bảng màu: giá trị tuỳ
            ý của Tailwind hiểu dấu `/` là cú pháp độ mờ, nên `rgb(var(--x)/0.7)`
            nằm trong `bg-[…]` là hỏng cả lớp. Vệt tối ở rìa thì màu nào cũng vậy. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,rgba(0,0,0,0.65)_75%)]" />

        {/* Khung góc mạ vàng — thuần trang trí, chỉ hiện khi màn đủ rộng. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-6 hidden lg:block">
          <span className="absolute left-0 top-0 h-14 w-14 border-l-2 border-t-2 border-gold-400/50" />
          <span className="absolute right-0 top-0 h-14 w-14 border-r-2 border-t-2 border-gold-400/50" />
          <span className="absolute bottom-0 left-0 h-14 w-14 border-b-2 border-l-2 border-gold-400/50" />
          <span className="absolute bottom-0 right-0 h-14 w-14 border-b-2 border-r-2 border-gold-400/50" />
        </div>

        {the.map((di, i) => (
          <TheNoi key={di.slug} di={di} className={`hidden xl:block ${VI_TRI_THE[i]}`} delay={`${i * 0.4}s`} />
        ))}

        <div className="container-page relative py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-jade-100/70 sm:text-sm">
            Cổng thông tin
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold uppercase leading-tight sm:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-b from-gold-200 via-gold-400 to-gold-600 bg-clip-text text-transparent">
              Phường Đông Triều
            </span>
            <span className="mt-1 block text-2xl text-white sm:text-3xl lg:text-4xl">Tỉnh Quảng Ninh</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-jade-100/85">
            Vùng đất quê gốc và nơi yên nghỉ của các vị vua triều Trần, trung tâm của Thiền phái Trúc Lâm.
            Cổng này phục vụ hai nhóm người khác nhau — bạn chọn lối của mình để thấy đúng thứ mình cần.
          </p>

          {/* HAI LỐI VÀO — cố ý cùng kích thước, cùng kiểu nền, chỉ khác biểu
              tượng và chữ. Làm một cái nổi hơn cái kia là đã chọn hộ người dùng,
              mà cả hai nhóm đều là chủ nhà ở đây. */}
          <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row">
            {CONG.map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-white px-7 py-4 font-semibold text-jade-900 shadow-lift transition hover:bg-gold-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-jade-950"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-jade-600 text-white transition group-hover:bg-jade-700">
                  <c.icon size={19} aria-hidden="true" />
                </span>
                {c.nhan}
                <ArrowRight size={17} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
          </div>

          {soLieu.length > 1 && (
            <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-jade-100/75">
              {soLieu.map((s) => (
                <li key={s.chu} className="flex items-center gap-2">
                  <s.icon size={16} className="text-gold-400" aria-hidden="true" />
                  {s.chu}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── MỖI CỔNG CÓ GÌ ──────────────────────────────────────────────────
          Hai nút trên kia đủ cho người đã biết mình là ai. Phần này dành cho
          người chưa chắc: họ đang có một việc cụ thể trong đầu ("tìm mẫu đơn",
          "xem lễ hội tháng Giêng"), thấy đúng chữ ấy trong danh sách là biết
          bấm bên nào, không cần hiểu khái niệm "cổng". */}
      <section className="container-page grid gap-5 py-16 lg:grid-cols-2">
        {CONG.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group card flex flex-col p-6 transition hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade-500 sm:p-7"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-jade-600 text-white transition group-hover:bg-jade-700">
                <c.icon size={24} aria-hidden="true" />
              </span>
              <span className="font-serif text-xl font-bold text-jade-900 dark:text-jade-50">{c.nhan}</span>
            </span>

            <span className="mt-3 text-sm leading-relaxed text-muted">{c.pitch}</span>

            <span className="mt-5 grid gap-2 sm:grid-cols-2">
              {c.muc.map((m) => (
                <span key={m.ten} className="flex items-start gap-2.5">
                  <m.icon size={17} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-jade-900 dark:text-jade-50">{m.ten}</span>
                    <span className="block text-xs text-subtle">{m.phu}</span>
                  </span>
                </span>
              ))}
            </span>

            <span className="mt-6 inline-flex items-center gap-1.5 self-start rounded-full bg-jade-600 px-5 py-2.5 text-sm font-semibold text-white transition group-hover:bg-jade-700">
              {c.vao}
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>

      {/* ── DÒNG DANH TÍNH ──────────────────────────────────────────────────
          Thứ duy nhất còn lại dưới hai tấm thẻ cổng, và nó phải còn: câu này
          vốn nằm ở chân trang, mà trang chọn cổng thì không có chân trang. Đây
          là cổng thông tin của một cơ quan nhà nước — cửa vào mà khuyết tên cơ
          quan chủ quản thì người vào không biết mình đang đọc thông tin của ai.

          Một dòng, và chỉ một dòng. Mọi liên kết khác đã có chân trang của hai
          cổng lo; trang này chỉ hỏi đúng một câu là người vào thuộc bên nào. */}
      <section className="container-page pb-16">
        <p className="border-t border-jade-900/[0.08] pt-5 text-xs text-subtle dark:border-white/10">
          © {new Date().getFullYear()} {SITE_NAME} · {SITE_OWNER}.
        </p>
      </section>
    </>
  );
}
