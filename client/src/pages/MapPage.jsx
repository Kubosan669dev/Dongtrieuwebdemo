import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, AlertTriangle, ArrowRight, ChevronDown, Info, MapPin, Navigation } from 'lucide-react';
import { api } from '../lib/api.js';
import MapEmbed from '../components/MapEmbed.jsx';
import { ErrorNote } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { MAP_KINDS, MAP_KIND_ORDER } from '../lib/mapKinds.js';
import { cx, deaccentLower, mapDirectionsUrl } from '../lib/format.js';

/**
 * Trang bản đồ số — bố cục tràn màn hình, thanh bên tra cứu bên trái.
 *
 * ── VÌ SAO KHUNG BẢN ĐỒ CHỈ HIỆN MỘT ĐIỂM ───────────────────────────────────
 *
 * Nền bản đồ là Google, nhúng bằng `<iframe>` — cách duy nhất lấy được nền Google
 * mà không cần khoá API. Iframe khác tên miền nên trang không gắn được ghim của
 * mình vào, không bắt được cú bấm, và mỗi lần chỉ hiện được một điểm.
 *
 * Việc "xem có những gì" vì thế do thanh bên gánh, và đó là lý do mỗi mục ở đây
 * mang theo cả đoạn giới thiệu chứ không chỉ tên với địa chỉ: danh sách phải tự
 * nó đủ để chọn, vì bản đồ không bày ra được 66 điểm cùng lúc.
 *
 * ── VỀ CHIỀU CAO ────────────────────────────────────────────────────────────
 *
 * Từ khổ `lg` trở lên, cả khối cao đúng phần màn hình còn lại dưới thanh điều
 * hướng (`h-16` = 4rem, xem Header.jsx) và tự cuộn bên trong. Dưới khổ đó thì bỏ
 * khoá chiều cao: chia đôi một màn hình điện thoại là cả bản đồ lẫn danh sách
 * đều chật, nên xếp dọc theo thứ tự tiêu đề → bản đồ → danh sách.
 */
export default function MapPage() {
  const [kinds, setKinds] = useState(MAP_KIND_ORDER);
  const [tim, setTim] = useState('');
  const [chonId, setChonId] = useState(null);
  const [hienChiTiet, setHienChiTiet] = useState(true);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['map-points'],
    queryFn: () => api.get('/map-points'),
  });

  const nhom = data?.groups ?? [];
  const thieuToaDo = nhom.reduce((a, g) => a + g.missing, 0);

  // Lọc theo nhóm + từ khoá. Tìm không dấu để "den yet kieu" cũng ra "Đền Yết Kiêu".
  const locDiem = useMemo(() => {
    const q = deaccentLower(tim.trim());
    return (data?.points ?? []).filter((p) => {
      if (!kinds.includes(p.kind)) return false;
      if (!q) return true;
      return deaccentLower(`${p.name} ${p.address ?? ''}`).includes(q);
    });
  }, [data, kinds, tim]);

  // Tìm trong danh sách ĐÃ LỌC: tắt một nhóm hay gõ từ khoá mới thì điểm đang xem
  // có thể không còn trong danh sách nữa, lúc đó phải rơi về điểm đầu tiên chứ
  // không giữ một điểm mà bên cạnh không còn thấy.
  const diemXem = locDiem.find((p) => p.id === chonId) ?? locDiem[0] ?? null;

  const doiNhom = (k) =>
    setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  if (isError) {
    return (
      <div className="container-page py-16">
        <ErrorNote onRetry={refetch} />
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Bản đồ số"
        description="Bản đồ số phường Đông Triều: di tích, điểm lân cận, cơ sở lưu trú và điểm ẩm thực — tra cứu vị trí, xem giới thiệu và lấy chỉ đường."
      />

      <div className="grid lg:h-[calc(100vh-4rem)] lg:grid-cols-[24rem_1fr] lg:grid-rows-[auto_minmax(0,1fr)] xl:grid-cols-[27rem_1fr]">
        {/* ── Tiêu đề + tìm kiếm + bộ lọc ── */}
        <div className="border-b border-jade-900/10 bg-paper px-5 pb-4 pt-6 lg:col-start-1 lg:row-start-1 lg:border-r dark:border-white/10 dark:bg-jade-950 lg:dark:border-r-white/10">
          {/* Dùng lớp `.eyebrow` chung thay vì tự ghi lại: bản cũ ghi tay bằng
              `text-terra-600`, mà terra tụt xuống 3.56 ở ba bảng màu. Nhãn chung
              cũng mang sẵn gạch vàng mở đầu như mọi mục khác của cổng. */}
          <p className="eyebrow">Tra cứu vị trí</p>
          <h1 className="mt-1 font-serif text-2xl font-bold leading-tight text-jade-900 xl:text-3xl dark:text-jade-50">
            Bản đồ số Đông Triều
          </h1>

          <div className="mt-4 flex items-center gap-2 rounded-md bg-jade-50 px-4 ring-1 ring-jade-900/10 focus-within:ring-jade-500 dark:bg-jade-900/60 dark:ring-white/10">
            <Search size={16} className="shrink-0 text-subtle" />
            <input
              value={tim}
              onChange={(e) => setTim(e.target.value)}
              placeholder="Tìm di tích, quán ăn, nhà nghỉ…"
              aria-label="Tìm điểm trên bản đồ"
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-ink/50 dark:placeholder:text-jade-50/50"
            />
          </div>

          {/* Bật/tắt được nhiều nhóm cùng lúc, không phải chọn một. Chấm màu là
              khoá màu cho danh sách bên dưới — mỗi mục mang đúng màu này. */}
          <div className="mt-3 flex flex-wrap gap-1.5">
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
                  data-loc-nhom={k}
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                    bat
                      ? 'bg-jade-600 text-white shadow-soft'
                      : 'bg-jade-50 text-jade-600 ring-1 ring-jade-900/10 hover:bg-jade-100 dark:bg-jade-900/60 dark:text-jade-300 dark:ring-white/10 dark:hover:bg-jade-800',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'h-2 w-2 shrink-0 rounded-full bg-current ring-1',
                      kind.pinClass,
                      bat ? 'ring-white/80' : 'ring-black/15 dark:ring-white/30',
                    )}
                  />
                  {kind.label}
                  <span className={cx('tabular-nums', bat ? 'text-jade-100/80' : 'text-subtle')}>
                    {g?.count ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/*
          ── Bản đồ ──

          Khung chi tiết NỔI trên bản đồ từ khổ `lg` trở lên, còn dưới khổ đó thì
          nằm dưới bản đồ theo dòng chảy bình thường. Bắt buộc phải tách hai kiểu:
          trên điện thoại khung này cao hơn cả vùng bản đồ (46vh), để nó nổi thì
          nó tràn ngược lên che mất dải chip lọc, mà bản đồ thì gần như không còn
          nhìn thấy gì.

          Vì thế `relative` chỉ bật từ `lg`, và bản đồ có chiều cao riêng thay vì
          lấp đầy ô lưới.
        */}
        <div className="lg:relative lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="h-[46vh] min-h-[18rem] lg:h-full">
            {diemXem ? (
              /* `query` chỉ là chuỗi tra cứu dự phòng — mọi điểm ở đây đều có toạ
                 độ (API `/map-points` chỉ trả về điểm đã có toạ độ) nên URL luôn
                 dựng theo toạ độ. */
              <MapEmbed
                fill
                showDirections={false}
                lat={diemXem.lat}
                lng={diemXem.lng}
                query={diemXem.address || diemXem.name}
                title={diemXem.name}
                className="h-full"
              />
            ) : (
              <div className="grid h-full place-items-center bg-jade-50 text-sm text-muted dark:bg-jade-900/40">
                {isLoading ? 'Đang tải bản đồ…' : 'Bật ít nhất một nhóm để xem bản đồ.'}
              </div>
            )}
          </div>

          {/* `lg:bottom-24` chứ không phải `bottom-4`: nút trợ lý AI là
              `fixed bottom-5 right-5 h-14 w-14` (xem ChatWidget.jsx), tức nó chiếm
              đúng góc dưới phải tới 76px. Để khung ở `bottom-4` là nút trợ lý nằm
              đè lên nút "Khám phá chi tiết". */}
          {diemXem &&
            (hienChiTiet ? (
              <KhungChiTiet point={diemXem} onAn={() => setHienChiTiet(false)} />
            ) : (
              <div className="p-3 lg:absolute lg:bottom-24 lg:right-4 lg:z-20 lg:p-0">
                <button
                  type="button"
                  onClick={() => setHienChiTiet(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-jade-900/90 px-4 py-2 text-xs font-semibold text-white shadow-lift backdrop-blur hover:bg-jade-900"
                >
                  <Info size={14} /> Hiện thông tin
                </button>
              </div>
            ))}
        </div>

        {/* ── Danh sách ── */}
        <div className="flex min-h-0 flex-col bg-paper lg:col-start-1 lg:row-start-2 lg:border-r lg:border-white/10 dark:bg-jade-950 lg:dark:border-r-white/10">
          <p className="shrink-0 border-b border-jade-900/5 px-5 py-2.5 text-xs text-muted lg:border-r-0 dark:border-white/5">
            {locDiem.length} điểm{tim ? ` khớp “${tim}”` : ''}
          </p>

          {/* `id` là mốc ổn định cho bài kiểm tự động bám vào. Trước đây bộ kiểm
              trỏ vào class Tailwind của danh sách, nên đổi thiết kế một cái là 16
              phép kiểm khớp 0 phần tử mà không ai biết. Class đổi theo thiết kế là
              chuyện bình thường; một `id` thì không. */}
          <ul id="danh-sach-diem" className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 lg:p-3">
            {locDiem.map((p) => {
              const kind = MAP_KINDS[p.kind];
              const dangXem = diemXem?.id === p.id;
              return (
                <li key={p.id}>
                  {/* Bấm là chọn, không bật/tắt: khung bản đồ luôn phải hiện một
                      điểm nào đó, nên "bỏ chọn" không còn nghĩa gì. */}
                  <button
                    type="button"
                    onClick={() => {
                      setChonId(p.id);
                      setHienChiTiet(true);
                    }}
                    aria-pressed={dangXem}
                    // Mốc cho bài kiểm bám vào. Dò theo chữ không được: nhãn nhóm
                    // in hoa bằng CSS nên `innerText` trả về "ĐIỂM LÂN CẬN", mà
                    // đoạn giới thiệu thì lại có thể chứa đúng chữ của nhóm khác.
                    data-kind={p.kind}
                    className={cx(
                      'w-full rounded-md border-l-4 p-3.5 text-left transition',
                      dangXem
                        ? 'border-jade-600 bg-jade-600/10 dark:border-jade-400 dark:bg-jade-400/10'
                        : 'border-transparent bg-jade-50/70 hover:bg-jade-100 dark:bg-jade-900/50 dark:hover:bg-jade-800/60',
                    )}
                  >
                    <span className="flex items-start gap-2">
                      <MapPin size={15} className={cx('mt-0.5 shrink-0', kind.textClass)} />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cx(
                            'block font-serif text-[0.95rem] font-semibold leading-snug',
                            dangXem
                              ? 'text-muted'
                              : 'text-jade-900 dark:text-jade-50',
                          )}
                        >
                          {p.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-subtle">
                          {kind.label}
                        </span>
                      </span>
                      {p.coordsEstimated && (
                        <AlertTriangle
                          size={13}
                          className="mt-0.5 shrink-0 text-gold-500"
                          aria-label="Vị trí ước tính, chưa xác minh"
                        />
                      )}
                    </span>
                    {/* Đoạn giới thiệu là thứ làm danh sách tự đứng được. Máy chủ
                        đã cắt sẵn ~320 ký tự (xem routes/mapPoints.js); ở đây cắt
                        tiếp còn ba dòng, phần đầy đủ nằm trong khung trên bản đồ. */}
                    {p.summary ? (
                      <span className="mt-2 block line-clamp-3 text-[13px] leading-relaxed text-muted">
                        {p.summary}
                      </span>
                    ) : (
                      p.address && (
                        <span className="mt-2 block line-clamp-2 text-[13px] leading-relaxed text-muted">
                          {p.address}
                        </span>
                      )
                    )}
                  </button>
                </li>
              );
            })}

            {locDiem.length === 0 && !isLoading && (
              <li className="rounded-md bg-jade-50 p-6 text-center text-sm text-muted dark:bg-jade-900/50">
                {tim ? `Không tìm thấy điểm nào khớp “${tim}”.` : 'Hãy bật ít nhất một nhóm.'}
              </li>
            )}
          </ul>

          {/* Nói thẳng số điểm còn thiếu toạ độ thay vì im lặng bỏ qua: khách thấy
              danh sách ngắn thì biết dữ liệu đang được bổ sung, chứ không nghĩ
              phường chỉ có mấy điểm đó. */}
          {thieuToaDo > 0 && (
            <p className="flex shrink-0 items-start gap-2 border-t border-jade-900/5 bg-gold-50 px-5 py-3 text-[11px] leading-relaxed text-gold-800 dark:border-white/5 dark:bg-gold-900/20 dark:text-gold-200">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                Còn <strong>{thieuToaDo} địa điểm</strong> chưa có toạ độ nên chưa lên bản đồ. Mục mang dấu
                tam giác là vị trí ước tính theo địa chỉ.
              </span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Khung thông tin nổi trên bản đồ.
 *
 * Là HTML của chính trang, không phải popup do Google dựng — iframe khác tên miền
 * nên không chèn được gì vào trong. Nhờ vậy `<Link>` ở đây vẫn là điều hướng phía
 * máy khách, bấm "Khám phá chi tiết" không tải lại cả trang.
 *
 * Ẩn được, vì trên màn hình hẹp nó che mất một góc bản đồ đáng kể.
 */
function KhungChiTiet({ point: p, onAn }) {
  const kind = MAP_KINDS[p.kind] ?? MAP_KINDS.heritage;
  // Chỉ di tích có trang chi tiết riêng. Ba nhóm còn lại hiện chi tiết bằng cửa
  // sổ trong trang danh sách, nên nút chính đổi thành chỉ đường — thứ khách cần
  // nhất ở một quán ăn hay nhà nghỉ.
  const duongDanChiTiet = kind.hasPage && p.slug ? `${kind.basePath}/${p.slug}` : null;

  return (
    <div id="khung-chi-tiet" className="p-3 lg:absolute lg:bottom-24 lg:right-4 lg:z-20 lg:w-[21rem] lg:p-0">
      <div className="overflow-hidden rounded-md bg-paper shadow-lift ring-1 ring-jade-900/10 dark:bg-jade-950 dark:ring-white/10">
        <div className="flex items-start gap-2 px-4 pt-3.5">
          <div className="min-w-0 flex-1">
            <p className={cx('text-[10px] font-semibold uppercase tracking-wider', kind.textClass)}>
              {kind.label}
            </p>
            <p className="mt-0.5 font-serif text-[0.95rem] font-bold leading-snug text-jade-900 dark:text-jade-50">
              {p.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onAn}
            className="-mr-1 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted hover:bg-jade-100 dark:hover:bg-jade-800"
          >
            Ẩn <ChevronDown size={13} />
          </button>
        </div>

        {p.thumb && (
          <img src={p.thumb} alt="" className="mt-3 h-32 w-full object-cover" />
        )}

        <div className="px-4 py-3">
          {/* `max-h-32` ≈ 6–7 dòng: máy chủ đã cắt `summary` còn 320 ký tự nên
              phần lớn điểm vừa trọn, cuộn chỉ là trường hợp lẻ. Để thấp hơn thì
              gần như mục nào cũng bị cắt ngang câu, trông như lỗi dựng trang. */}
          {p.summary && (
            <p className="no-scrollbar max-h-32 overflow-y-auto text-[13px] leading-relaxed text-muted">
              {p.summary}
            </p>
          )}
          {p.address && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted">
              <MapPin size={12} className="mt-0.5 shrink-0" />
              {p.address}
            </p>
          )}
          {p.coordsEstimated && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-gold-700 dark:text-gold-300">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              Vị trí ước tính theo địa chỉ, chưa xác minh tại thực địa.
            </p>
          )}
        </div>

        {duongDanChiTiet ? (
          <Link
            to={duongDanChiTiet}
            className="flex items-center justify-center gap-2 bg-jade-600 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-jade-700"
          >
            Khám phá chi tiết <ArrowRight size={14} />
          </Link>
        ) : (
          <a
            href={mapDirectionsUrl({ lat: p.lat, lng: p.lng, query: p.name })}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 bg-jade-600 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-jade-700"
          >
            <Navigation size={14} /> Chỉ đường tới đây
          </a>
        )}
      </div>
    </div>
  );
}
