import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowRight, Award, Landmark, Mountain, Sparkles } from 'lucide-react';
import { fetchList } from '../lib/api.js';
import { useSettings } from '../hooks/useSettings.js';
import PageHero from '../components/PageHero.jsx';
import Seo from '../components/Seo.jsx';
import VungDat from '../components/VungDat.jsx';
import { SectionHeading } from '../components/ui.jsx';
import { RANK_LEVELS } from '../lib/constants.js';
import { cx } from '../lib/format.js';

const ICONS = [Landmark, Sparkles, Mountain];

/**
 * Ba trung tâm của nước Đại Việt thời Trần.
 *
 * Không phải thông tin mới: câu này nằm nguyên văn trong phần nội dung do quản
 * trị viên nhập (`about.sections`). Ở đây chỉ dựng lại thành hình để nó không
 * trôi mất giữa một đoạn văn — đây là câu định vị mạnh nhất mà Đông Triều có.
 */
const BA_TRUNG_TAM = [
  { ten: 'Thăng Long', nay: 'Hà Nội', vaiTro: 'Kinh đô' },
  { ten: 'Thiên Trường', nay: 'Nam Định', vaiTro: 'Hành cung' },
  { ten: 'Đông Triều', nay: 'Quảng Ninh', vaiTro: 'Quê gốc · lăng tẩm', dayLa: true },
];

export default function About() {
  const settings = useSettings();
  const sections = settings.about?.sections ?? [];

  // Ảnh bìa cho hero lấy từ một di tích thật đang xuất bản. Đánh dấu là ảnh minh
  // hoạ vì đây là trang về cả vùng đất, không phải về riêng di tích trong ảnh.
  const heritages = useQuery({ queryKey: ['heritages', 'featured'], queryFn: () => fetchList('heritages', { featured: '1' }) });
  const anhBia = (heritages.data?.items ?? []).find((h) => h.coverUrl)?.coverUrl;

  const tatCa = useQuery({ queryKey: ['heritages'], queryFn: () => fetchList('heritages') });
  const theoHang = (tatCa.data?.items ?? []).reduce((acc, h) => {
    acc[h.rankLevel] = (acc[h.rankLevel] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <Seo
        title="Giới thiệu"
        description="Giới thiệu về vùng đất Đông Triều — quê gốc và nơi yên nghỉ của các vị vua triều Trần, trung tâm Thiền phái Trúc Lâm."
      />
      <PageHero
        title="Về vùng đất Đông Triều"
        description="Quê gốc và nơi yên nghỉ của các vị vua triều Trần, ở phía Tây tỉnh Quảng Ninh."
        breadcrumb={[{ label: 'Giới thiệu' }]}
        image={anhBia}
        illustrative
      />

      <div className="container-page py-12">
        {/* Đoạn mở đầu — cùng nguồn dữ liệu với khối giới thiệu trên trang chủ, nên
            sửa một chỗ trong Cài đặt là cả hai trang đổi theo. */}
        {settings.about?.intro && (
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-body">
            {settings.about.intro}
          </p>
        )}

        {/* ── Ba trung tâm ── */}
        <section data-vao className="mt-12">
          <SectionHeading
            eyebrow="Vị thế lịch sử"
            title="Một trong ba trung tâm của Đại Việt"
            description="Dưới thời Trần, ba vùng cùng giữ vai trò văn hoá – chính trị – tôn giáo tiêu biểu nhất của cả nước."
            center
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {BA_TRUNG_TAM.map((t) => (
              <div
                key={t.ten}
                className={cx(
                  'card p-6 text-center',
                  // Làm nổi đúng một ô: đây là trang của Đông Triều, hai vùng kia
                  // đứng đây để cho thấy Đông Triều đứng cùng hàng với ai.
                  t.dayLa && 'ring-2 ring-gold-400 dark:ring-gold-500',
                )}
              >
                <p className="font-serif text-xl font-bold text-jade-900 dark:text-jade-50">{t.ten}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-subtle">nay là {t.nay}</p>
                <p className={cx('mt-3 text-sm', t.dayLa ? 'font-semibold text-gold-700 dark:text-gold-400' : 'text-muted')}>
                  {t.vaiTro}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Di sản đã xếp hạng ──
            Cố ý KHÔNG dựng "mốc thời gian nhà Trần": trong dữ liệu chỉ có các năm
            xây dựng và trùng tu của từng di tích, không phải niên biểu triều đại.
            Ghép chúng lại thành một dòng thời gian sẽ ra một niên biểu bịa, mà đây
            là trang thông tin chính thức của phường. Thay vào đó dùng con số ĐẾM
            THẬT trong cơ sở dữ liệu — cùng thay đổi theo khi có di tích được xếp
            hạng thêm. */}
        <section data-vao className="mt-14">
          <SectionHeading
            eyebrow="Di sản"
            title="Di tích đã được xếp hạng"
            description="Số liệu đếm trực tiếp từ danh mục di tích của phường. Bấm vào từng hạng để xem danh sách."
            action={<Link to="/di-tich" className="btn-ghost">Tất cả di tích <ArrowRight size={16} /></Link>}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {Object.entries(RANK_LEVELS).map(([key, r]) => (
              <Link key={key} to={`/di-tich?rank=${key}`} className="card-hover flex items-center gap-4 p-5">
                {/* Ô biểu tượng đậm dần đúng theo cấp xếp hạng, cùng quy tắc với
                    nhãn trên thẻ di tích (xem `TONES` trong components/ui.jsx):
                    vàng đặc → xanh đặc → viền. Ba cấp này là thang có thứ tự, nên
                    độ đậm phải nói được cấp nào cao hơn. */}
                <span
                  className={cx(
                    'grid h-12 w-12 shrink-0 place-items-center rounded-md',
                    r.color === 'gold' ? 'bg-gold-400 text-jade-950'
                      : r.color === 'jade' ? 'bg-jade-600 text-white'
                        : 'text-jade-700 ring-1 ring-inset ring-jade-300 dark:text-jade-100 dark:ring-jade-700',
                  )}
                >
                  <Award size={22} />
                </span>
                <span>
                  <span className="block font-serif text-2xl font-bold leading-none tabular-nums text-jade-900 dark:text-jade-50">
                    {theoHang[key] ?? '—'}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{r.label}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Bối cảnh vùng đất: vị trí · kinh tế · giao thông · dòng thời gian ──
            Đặt SAU hai khối di sản vì đây là phần tra cứu, còn di sản mới là thứ
            người đọc tới trang này để xem trước tiên. */}
        <VungDat vungDat={settings.vungDat} />

        {/* ── Nội dung dài, do quản trị viên nhập ── */}
        {sections.length > 0 && (
          <div className="mx-auto mt-14 max-w-4xl space-y-8">
            {sections.map((s, i) => {
              const Icon = ICONS[i % ICONS.length];
              return (
                <article key={i} className="card p-7">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-jade-100 text-jade-600 dark:bg-jade-800/60">
                      <Icon size={22} />
                    </span>
                    <h2 className="font-serif text-xl font-semibold text-jade-900 dark:text-jade-50">{s.title}</h2>
                  </div>
                  <div className="prose-vn"><ReactMarkdown>{s.body}</ReactMarkdown></div>
                </article>
              );
            })}
          </div>
        )}

        {/* Trường hợp cả `intro` và `sections` đều trống: nói rõ là chưa có nội
            dung, không để một trang trắng không giải thích gì. */}
        {sections.length === 0 && !settings.about?.intro && (
          <p className="mx-auto mt-12 max-w-3xl rounded-md border border-dashed border-jade-200 p-6 text-center text-sm text-muted dark:border-jade-700">
            Phần giới thiệu chi tiết đang được biên soạn. Trong lúc chờ, bạn có thể xem{' '}
            <Link to="/di-tich" className="font-medium text-jade-700 underline dark:text-jade-200">danh mục di tích</Link> hoặc{' '}
            <Link to="/le-hoi" className="font-medium text-jade-700 underline dark:text-jade-200">lịch lễ hội</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
