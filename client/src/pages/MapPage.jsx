import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, MapPin, AlertTriangle, ExternalLink } from 'lucide-react';
import { api } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import MapEmbed from '../components/MapEmbed.jsx';
import { ErrorNote, EmptyState } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { MAP_KINDS, MAP_KIND_ORDER } from '../lib/mapKinds.js';
import { cx, deaccentLower } from '../lib/format.js';

/**
 * Trang bản đồ số.
 *
 * ── VÌ SAO KHUNG BẢN ĐỒ CHỈ HIỆN MỘT ĐIỂM ───────────────────────────────────
 *
 * Nền bản đồ là Google, nhúng bằng `<iframe>`. Đó là cách DUY NHẤT lấy được nền
 * Google mà không cần khoá API — nhưng iframe khác tên miền nên trang không gắn
 * được ghim của mình vào, không bắt được cú bấm, và mỗi lần chỉ hiện được một
 * điểm. Đây là đánh đổi đã cân nhắc: nền bản đồ đủ nhãn tiếng Việt cho vùng Đông
 * Triều, đổi lấy việc không xem được cả 66 điểm cùng lúc.
 *
 * Phần còn lại của trang giữ nguyên và chính nó gánh việc "xem toàn cảnh": bộ lọc
 * bật/tắt nhiều nhóm cùng lúc, ô tìm không dấu, và danh sách bên cạnh có đủ 66
 * điểm kèm màu theo nhóm. Bấm một mục thì khung bản đồ chạy tới điểm đó.
 */
export default function MapPage() {
  const [kinds, setKinds] = useState(MAP_KIND_ORDER);
  const [tim, setTim] = useState('');
  const [chonId, setChonId] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['map-points'],
    queryFn: () => api.get('/map-points'),
  });

  const nhom = data?.groups ?? [];
  const thieuToaDo = nhom.reduce((a, g) => a + g.missing, 0);

  // Lọc theo nhóm + từ khoá. Tìm không dấu để "den yet kieu" cũng ra "Đền Yết Kiêu".
  //
  // `data?.points ?? []` nằm TRONG useMemo, không tách ra ngoài: để ngoài thì mỗi
  // lần render lại sinh một mảng rỗng mới và phụ thuộc của useMemo đổi liên tục.
  const locDiem = useMemo(() => {
    const q = deaccentLower(tim.trim());
    return (data?.points ?? []).filter((p) => {
      if (!kinds.includes(p.kind)) return false;
      if (!q) return true;
      return deaccentLower(`${p.name} ${p.address ?? ''}`).includes(q);
    });
  }, [data, kinds, tim]);

  // Tìm trong danh sách ĐÃ LỌC chứ không trong toàn bộ điểm: tắt một nhóm hay gõ
  // từ khoá mới thì điểm đang xem có thể không còn trong danh sách nữa, lúc đó
  // phải rơi về điểm đầu tiên chứ không giữ một điểm mà bên cạnh không còn thấy.
  const diemXem = locDiem.find((p) => p.id === chonId) ?? locDiem[0] ?? null;
  const kindXem = diemXem ? (MAP_KINDS[diemXem.kind] ?? MAP_KINDS.heritage) : null;

  const doiNhom = (k) =>
    setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  return (
    <div>
      <Seo
        title="Bản đồ số"
        description="Bản đồ số phường Đông Triều: di tích, điểm lân cận, cơ sở lưu trú và điểm ẩm thực trên cùng một trang, kèm chỉ đường."
      />
      <PageHero
        title="Bản đồ số Đông Triều"
        description="Toàn bộ di tích, điểm lân cận, cơ sở lưu trú và điểm ẩm thực — chọn một điểm để xem trên bản đồ và lấy chỉ đường."
        breadcrumb={[{ label: 'Bản đồ số' }]}
      />

      <div className="container-page py-10">
        {isError ? (
          <ErrorNote onRetry={refetch} />
        ) : (
          <>
            {/* Bộ lọc nhóm — bật/tắt được nhiều nhóm cùng lúc, khác bản cũ chỉ
                cho chọn đúng một nhóm tại một thời điểm. */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {MAP_KIND_ORDER.map((k) => {
                const kind = MAP_KINDS[k];
                const g = nhom.find((x) => x.kind === k);
                const bat = kinds.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => doiNhom(k)}
                    aria-pressed={bat}
                    className={cx(
                      'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
                      bat
                        ? 'bg-jade-600 text-white shadow-soft'
                        : 'bg-white text-jade-600 ring-1 ring-jade-200 hover:bg-jade-50 dark:bg-jade-900/50 dark:text-jade-300 dark:ring-jade-700',
                    )}
                  >
                    {/* Chấm màu là khoá màu cho danh sách bên dưới — mỗi mục trong
                        danh sách mang đúng màu này ở biểu tượng ghim của nó.
                        Viền quanh chấm là bắt buộc: chip đang bật có nền jade-600,
                        mà hai nhóm Di tích (jade-700) và Lưu trú (jade-500) cùng họ
                        màu đó nên chấm chìm hẳn vào nền. */}
                    <span
                      aria-hidden="true"
                      className={cx(
                        'h-2.5 w-2.5 shrink-0 rounded-full bg-current ring-1',
                        kind.pinClass,
                        bat ? 'ring-white/80' : 'ring-black/15 dark:ring-white/30',
                      )}
                    />
                    <kind.icon size={15} />
                    {kind.label}
                    <span className={cx('tabular-nums', bat ? 'text-jade-100/80' : 'text-jade-400')}>
                      {g?.count ?? 0}
                    </span>
                  </button>
                );
              })}

              <div className="ml-auto flex min-w-[13rem] flex-1 items-center gap-2 rounded-full bg-white px-4 ring-1 ring-jade-200 sm:flex-none dark:bg-jade-900/50 dark:ring-jade-700">
                <Search size={16} className="shrink-0 text-jade-400" />
                <input
                  value={tim}
                  onChange={(e) => setTim(e.target.value)}
                  placeholder="Tìm theo tên hoặc địa chỉ…"
                  aria-label="Tìm điểm trên bản đồ"
                  className="w-full bg-transparent py-2 text-sm outline-none"
                />
              </div>
            </div>

            {/* Trên điện thoại: bản đồ lên trước, danh sách xuống dưới (order-*). */}
            <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
              <div className="order-2 lg:order-1">
                <p className="mb-2 text-xs text-jade-500">
                  {locDiem.length} điểm{tim ? ` khớp “${tim}”` : ''}
                </p>
                <ul className="no-scrollbar max-h-[30rem] space-y-1.5 overflow-y-auto pr-1 lg:max-h-[34rem]">
                  {locDiem.map((p) => {
                    const kind = MAP_KINDS[p.kind];
                    const dangXem = diemXem?.id === p.id;
                    return (
                      <li key={p.id}>
                        {/* Bấm là chọn, không bật/tắt: khung bản đồ luôn phải hiện
                            một điểm nào đó, nên "bỏ chọn" không còn nghĩa gì. */}
                        <button
                          type="button"
                          onClick={() => setChonId(p.id)}
                          aria-pressed={dangXem}
                          className={cx(
                            'flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition',
                            dangXem
                              ? 'bg-jade-600 text-white shadow-soft'
                              : 'bg-white ring-1 ring-jade-900/5 hover:bg-jade-50 dark:bg-jade-900/40 dark:ring-white/5 dark:hover:bg-jade-800/50',
                          )}
                        >
                          <MapPin
                            size={16}
                            className={cx('mt-0.5 shrink-0', dangXem ? 'text-gold-300' : kind.textClass)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold leading-snug">{p.name}</span>
                            <span
                              className={cx(
                                'mt-0.5 block text-xs',
                                dangXem ? 'text-jade-100/80' : 'text-jade-500',
                              )}
                            >
                              {kind.label}
                              {p.address ? ` · ${p.address}` : ''}
                            </span>
                          </span>
                          {p.coordsEstimated && (
                            <AlertTriangle
                              size={13}
                              className={cx('mt-0.5 shrink-0', dangXem ? 'text-gold-300' : 'text-gold-500')}
                              aria-label="Vị trí ước tính, chưa xác minh"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {locDiem.length === 0 && !isLoading && (
                  <EmptyState
                    title="Không có điểm nào"
                    description={tim ? 'Thử từ khoá khác hoặc bật thêm nhóm.' : 'Hãy bật ít nhất một nhóm.'}
                  />
                )}
              </div>

              <div className="order-1 lg:order-2">
                {diemXem ? (
                  <>
                    {/* Đang xem điểm nào — bắt buộc phải nói ra. Khung bản đồ chỉ
                        hiện một điểm, mà trên khổ máy tính danh sách nằm bên trái
                        nên bấm một mục xong rất dễ không nhận ra bản đồ vừa đổi. */}
                    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cx('chip', kindXem.tintClass)}>
                        <kindXem.icon size={14} /> {kindXem.label}
                      </span>
                      <span className="font-serif text-base font-semibold text-jade-900 dark:text-jade-50">
                        {diemXem.name}
                      </span>
                      {/* Ghim ước tính từng vẽ nét đứt trên bản đồ cũ. Nền Google
                          nhúng thì ghim là của Google, không đổi kiểu được — nên
                          cảnh báo phải chuyển thành chữ, không được lặng lẽ mất. */}
                      {diemXem.coordsEstimated && (
                        <span className="inline-flex items-center gap-1 text-xs text-gold-700 dark:text-gold-300">
                          <AlertTriangle size={12} /> vị trí ước tính theo địa chỉ, chưa xác minh
                        </span>
                      )}
                      {/* Lối vào trang chi tiết. Trước đây nút này nằm trong khung
                          thông tin nổi trên bản đồ; nền Google nhúng không gắn được
                          khung đó nữa nên phải đưa ra ngoài, không thì đường đi từ
                          bản đồ sang bài viết về di tích biến mất. Chỉ di tích mới
                          có trang riêng — xem `hasPage` trong lib/mapKinds.js. */}
                      {kindXem.hasPage && diemXem.slug && (
                        <Link to={`${kindXem.basePath}/${diemXem.slug}`} className="btn-ghost btn-sm ml-auto">
                          <ExternalLink size={13} /> Xem chi tiết
                        </Link>
                      )}
                    </div>
                    {/* `query` chỉ dùng làm nhãn dưới bản đồ và làm chuỗi tra cứu
                        dự phòng — mọi điểm ở đây đều có toạ độ (API `/map-points`
                        chỉ trả về điểm đã có toạ độ) nên URL luôn dựng theo toạ độ. */}
                    <MapEmbed
                      lat={diemXem.lat}
                      lng={diemXem.lng}
                      query={diemXem.address || diemXem.name}
                      title={diemXem.name}
                      height={520}
                    />
                  </>
                ) : (
                  <div className="grid h-[520px] place-items-center rounded-2xl bg-jade-50 text-sm text-jade-500 ring-1 ring-jade-900/5 dark:bg-jade-900/40 dark:ring-white/5">
                    {isLoading ? 'Đang tải bản đồ…' : 'Bật ít nhất một nhóm để xem bản đồ.'}
                  </div>
                )}
              </div>
            </div>

            {/* Nói thẳng số điểm còn thiếu toạ độ thay vì im lặng bỏ qua: khách
                thấy danh sách ngắn thì biết dữ liệu đang được bổ sung, chứ không
                nghĩ phường chỉ có mấy điểm đó. */}
            {thieuToaDo > 0 && (
              <p className="mt-5 flex items-start gap-2 rounded-xl bg-gold-50 p-4 text-sm text-gold-800 dark:bg-gold-900/20 dark:text-gold-200">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  Còn <strong>{thieuToaDo} địa điểm</strong> chưa có toạ độ nên chưa lên bản đồ. Mục mang dấu
                  tam giác là vị trí ước tính theo địa chỉ, đang được xác minh dần tại thực địa.
                </span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
