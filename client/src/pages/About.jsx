import { useSettings } from '../hooks/useSettings.js';
import PageHero from '../components/PageHero.jsx';
import Seo from '../components/Seo.jsx';
import ReactMarkdown from 'react-markdown';
import { Landmark, Sparkles, Mountain } from 'lucide-react';

const ICONS = [Landmark, Sparkles, Mountain];

export default function About() {
  const settings = useSettings();
  const sections = settings.about?.sections ?? [];

  return (
    <div>
      <Seo title="Giới thiệu" description="Giới thiệu về vùng đất Đông Triều — quê gốc và nơi yên nghỉ của các vị vua triều Trần, trung tâm Thiền phái Trúc Lâm." />
      <PageHero
        title="Về vùng đất Đông Triều"
        description="Vùng đất địa linh nhân kiệt phía Tây tỉnh Quảng Ninh."
        breadcrumb={[{ label: 'Giới thiệu' }]}
      />

      <div className="container-page py-12">
        {sections.length === 0 ? (
          <div className="prose-vn mx-auto max-w-3xl">
            <p>
              Đông Triều là vùng đất địa linh nhân kiệt nằm ở phía Tây của tỉnh Quảng Ninh, sở hữu quần thể
              di tích quốc gia đặc biệt nhà Trần với những giá trị to lớn về lịch sử, văn hóa, kiến trúc và
              tâm linh. Dưới thời Trần, cùng với Thăng Long và Thiên Trường, Đông Triều là một trong ba
              trung tâm văn hóa, chính trị, tôn giáo tiêu biểu nhất của nước Đại Việt.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-10">
            {sections.map((s, i) => {
              const Icon = ICONS[i % ICONS.length];
              return (
                <div key={i} className="card p-7">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-jade-100 text-jade-600 dark:bg-jade-800/60">
                      <Icon size={22} />
                    </span>
                    <h2 className="font-serif text-xl font-semibold text-jade-900 dark:text-jade-50">{s.title}</h2>
                  </div>
                  <div className="prose-vn"><ReactMarkdown>{s.body}</ReactMarkdown></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
