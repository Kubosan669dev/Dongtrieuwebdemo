import { lazy, Suspense } from 'react';
import { MapPin, Phone, Mail, Clock, Facebook, Youtube, MessageCircle } from 'lucide-react';
import { useSettings } from '../hooks/useSettings.js';
import { useTheme } from '../hooks/useTheme.js';
import PageHero from '../components/PageHero.jsx';
import ContactForm from '../components/ContactForm.jsx';
import Seo from '../components/Seo.jsx';
import { phoneHref } from '../lib/format.js';
import { SITE_OWNER } from '../lib/site.js';
import { MAP_CENTER } from '../lib/mapKinds.js';

/** Cùng một `lazy` với trang chủ và /ban-do nên ba nơi dùng chung gói Leaflet đã tách. */
const DigitalMap = lazy(() => import('../components/DigitalMap.jsx'));

/**
 * Trang Liên hệ.
 *
 * Bản trước chỉ có một thẻ thông tin và một iframe Google Maps — trong khi thẻ SEO
 * của chính trang đó đã hứa "biểu mẫu gửi phản hồi". Nay lời hứa đó thành thật.
 *
 * Bản đồ đổi từ iframe Google sang Leaflet cho nhất quán với bản đồ số: cùng nền
 * bản đồ, cùng ghim, cùng cách đổi theo chế độ sáng/tối. Một điểm duy nhất là trụ
 * sở phường, đánh dấu bằng nhóm `heritage` vì đó là màu chủ đạo.
 */
export default function Contact() {
  const settings = useSettings();
  const { mode } = useTheme();
  const c = settings.contact ?? {};
  const s = settings.social ?? {};

  const diemTruSo = [
    {
      id: 'tru-so',
      kind: 'heritage',
      name: c.name || SITE_OWNER,
      lat: MAP_CENTER[0],
      lng: MAP_CENTER[1],
      address: c.address || 'Phường Đông Triều, tỉnh Quảng Ninh',
      // Toạ độ là tâm phường, không phải cửa trụ sở — nói thẳng bằng chính cơ chế
      // đã có cho ghim ước tính, thay vì để khách tưởng đây là địa chỉ chính xác.
      coordsEstimated: true,
    },
  ];

  return (
    <div>
      <Seo title="Liên hệ" description="Thông tin liên hệ và biểu mẫu gửi phản hồi cho cổng thông tin Khám phá Đông Triều, tỉnh Quảng Ninh." />
      <PageHero
        title="Liên hệ"
        description="Góp ý, báo thông tin chưa đúng, hoặc hỏi thêm về di tích và lễ hội."
        breadcrumb={[{ label: 'Liên hệ' }]}
      />

      <div className="container-page py-12">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Biểu mẫu đứng trước trên cột rộng: người vào trang Liên hệ phần lớn
              là để gửi một câu, không phải để đọc địa chỉ. */}
          <div className="lg:col-span-3">
            <ContactForm />
          </div>

          <div className="space-y-5 lg:col-span-2">
            <div className="card p-6">
              <h2 className="mb-4 font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">
                {c.name || SITE_OWNER}
              </h2>
              <Row icon={MapPin} label="Địa chỉ" value={c.address || 'Phường Đông Triều, tỉnh Quảng Ninh'} />
              {c.phone && <Row icon={Phone} label="Điện thoại" value={c.phone} href={phoneHref(c.phone)} />}
              {c.email && <Row icon={Mail} label="Email" value={c.email} href={`mailto:${c.email}`} />}
              <Row icon={Clock} label="Giờ làm việc" value="Thứ 2 – Thứ 6, 07:30 – 17:00" />

              {(s.facebook || s.youtube || s.zalo) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {s.facebook && <MangXaHoi href={s.facebook} icon={Facebook} label="Facebook" />}
                  {s.youtube && <MangXaHoi href={s.youtube} icon={Youtube} label="YouTube" />}
                  {s.zalo && <MangXaHoi href={s.zalo} icon={MessageCircle} label="Zalo" />}
                </div>
              )}
            </div>

            <div>
              <Suspense
                fallback={<div className="grid h-[320px] place-items-center rounded-3xl bg-jade-100 text-sm text-jade-500 dark:bg-jade-900/50">Đang tải bản đồ…</div>}
              >
                <DigitalMap points={diemTruSo} mode={mode} height={320} showPopup={false} />
              </Suspense>
              {/* Nói thẳng bằng chữ. Ghim có mang cờ `coordsEstimated` nên vẽ nét
                  đứt, nhưng ở đây tắt khung thông tin nên câu giải thích trong
                  khung đó không ai đọc được — một đường viền nét đứt tự nó không
                  nói lên điều gì. */}
              <p className="mt-2 text-xs text-jade-500 dark:text-jade-400">
                Ghim đặt ở trung tâm phường, không phải cửa trụ sở. Vui lòng gọi trước khi đến.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, href }) {
  return (
    <div className="flex items-start gap-3 border-b border-jade-900/5 py-3 last:border-0 dark:border-white/5">
      <Icon size={18} className="mt-0.5 shrink-0 text-jade-400" />
      <div className="min-w-0">
        <p className="text-xs text-jade-400">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-jade-700 hover:text-jade-500 dark:text-jade-100">{value}</a>
        ) : (
          <p className="text-sm text-jade-800 dark:text-jade-100">{value}</p>
        )}
      </div>
    </div>
  );
}

function MangXaHoi({ href, icon: Icon, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
      <Icon size={14} /> {label}
    </a>
  );
}
