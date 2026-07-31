import { lazy, Suspense, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import { ErrorNote, EmptyState } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { useTheme } from '../hooks/useTheme.js';
import { MAP_KINDS, MAP_KIND_ORDER } from '../lib/mapKinds.js';
import { cx, deaccentLower } from '../lib/format.js';

/**
 * Nạp trễ Leaflet: thư viện bản đồ nặng ~42KB nén, không được nằm trong gói khởi
 * động vì phần lớn khách vào trang chủ chứ không vào trang bản đồ.
 */
const DigitalMap = lazy(() => import('../components/DigitalMap.jsx'));

/**
 * Trang bản đồ số.
 *
 * Bản trước là một iframe Google Maps hiện đúng MỘT điểm; chọn điểm khác thì
 * iframe tải lại từ đầu. Nay là một bản đồ Leaflet duy nhất hiện mọi điểm, lọc
 * theo nhóm, tìm theo tên, và danh sách bên cạnh đồng bộ hai chiều với ghim.
 */
export default function MapPage() {
  const { mode } = useTheme();
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
  // lần render lại sinh một mảng rỗng mới, làm phụ thuộc của useMemo đổi liên tục
  // và bản đồ vẽ lại toàn bộ ghim vô ích.
  const locDiem = useMemo(() => {
    const q = deaccentLower(tim.trim());
    return (data?.points ?? []).filter((p) => {
      if (!kinds.includes(p.kind)) return false;
      if (!q) return true;
      return deaccentLower(`${p.name} ${p.address ?? ''}`).includes(q);
    });
  }, [data, kinds, tim]);

  const doiNhom = (k) =>
    setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  return (
    <div>
      <Seo
        title="Bản đồ số"
        description="Bản đồ số phường Đông Triều: di tích, điểm lân cận, cơ sở lưu trú và điểm ẩm thực trên cùng một bản đồ, kèm chỉ đường."
      />
      <PageHero
        title="Bản đồ số Đông Triều"
        description="Toàn bộ di tích, điểm lân cận, cơ sở lưu trú và điểm ẩm thực trên cùng một bản đồ."
        breadcrumb={[{ label: 'Bản đồ số' }]}
      />

      <div className="container-page py-10">
        {isError ? (
          <ErrorNote onRetry={refetch} />
        ) : (
          <>
            {/* Bộ lọc nhóm — bật/tắt được nhiều nhóm cùng lúc, khác với bản cũ
                chỉ cho chọn đúng một nhóm tại một thời điểm. */}
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
                    {/* Chấm màu = chú giải bản đồ. Bốn màu ghim mà không có khoá
                        màu ở đâu thì khách không biết ghim nào thuộc nhóm nào;
                        gắn ngay vào chip lọc thì chip vừa lọc vừa làm chú giải. */}
                    {/* Viền quanh chấm là bắt buộc: chip đang bật có nền jade-600,
                        mà hai nhóm Di tích (jade-700) và Lưu trú (jade-500) cùng họ
                        màu đó nên chấm chìm hẳn vào nền. Viền tách chấm khỏi mọi nền. */}
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

            {/* Trên điện thoại: bản đồ lên trước, danh sách xuống dưới (order-*).
                Bản đồ mới là thứ khách vào trang này để xem. */}
            <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
              <div className="order-2 lg:order-1">
                <p className="mb-2 text-xs text-jade-500">
                  {locDiem.length} điểm{tim ? ` khớp “${tim}”` : ''}
                </p>
                <ul className="no-scrollbar max-h-[30rem] space-y-1.5 overflow-y-auto pr-1 lg:max-h-[32.5rem]">
                  {locDiem.map((p) => {
                    const kind = MAP_KINDS[p.kind];
                    const dangChon = chonId === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setChonId(dangChon ? null : p.id)}
                          aria-pressed={dangChon}
                          className={cx(
                            'flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition',
                            dangChon
                              ? 'bg-jade-600 text-white shadow-soft'
                              : 'bg-white ring-1 ring-jade-900/5 hover:bg-jade-50 dark:bg-jade-900/40 dark:ring-white/5 dark:hover:bg-jade-800/50',
                          )}
                        >
                          <MapPin
                            size={16}
                            className={cx('mt-0.5 shrink-0', dangChon ? 'text-gold-300' : kind.textClass)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold leading-snug">{p.name}</span>
                            <span
                              className={cx(
                                'mt-0.5 block text-xs',
                                dangChon ? 'text-jade-100/80' : 'text-jade-500',
                              )}
                            >
                              {kind.label}
                              {p.address ? ` · ${p.address}` : ''}
                            </span>
                          </span>
                          {p.coordsEstimated && (
                            <AlertTriangle
                              size={13}
                              className={cx('mt-0.5 shrink-0', dangChon ? 'text-gold-300' : 'text-gold-500')}
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
                <Suspense fallback={<KhungCho />}>
                  {isLoading ? (
                    <KhungCho />
                  ) : (
                    <DigitalMap
                      points={locDiem}
                      selectedId={chonId}
                      onSelect={(p) => setChonId(p?.id ?? null)}
                      mode={mode}
                      height={520}
                    />
                  )}
                </Suspense>
              </div>
            </div>

            {/* Nói thẳng số điểm còn thiếu toạ độ thay vì im lặng bỏ qua: khách
                thấy bản đồ ít điểm thì biết là dữ liệu đang được bổ sung, chứ
                không nghĩ phường chỉ có mấy điểm đó. */}
            {thieuToaDo > 0 && (
              <p className="mt-5 flex items-start gap-2 rounded-xl bg-gold-50 p-4 text-sm text-gold-800 dark:bg-gold-900/20 dark:text-gold-200">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  Còn <strong>{thieuToaDo} địa điểm</strong> chưa có toạ độ nên chưa hiện trên bản đồ. Điểm
                  mang dấu tam giác là vị trí ước tính theo địa chỉ, đang được xác minh dần tại thực địa.
                </span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KhungCho() {
  return (
    <div className="grid h-[520px] place-items-center rounded-3xl bg-jade-50 ring-1 ring-jade-900/5 dark:bg-jade-900/40 dark:ring-white/5">
      <span className="flex items-center gap-2 text-sm text-jade-500">
        <Loader2 size={16} className="animate-spin" /> Đang tải bản đồ…
      </span>
    </div>
  );
}
