import { MapPin, Phone, Mail, Clock, Facebook, Youtube, MessageCircle } from 'lucide-react';
import { useSettings } from '../hooks/useSettings.js';
import PageHero from '../components/PageHero.jsx';
import ContactForm from '../components/ContactForm.jsx';
import MapEmbed from '../components/MapEmbed.jsx';
import Seo from '../components/Seo.jsx';
import { phoneHref } from '../lib/format.js';
import { SITE_OWNER } from '../lib/site.js';
import { MAP_CENTER } from '../lib/mapKinds.js';

/**
 * Trang Liên hệ.
 *
 * Bản trước chỉ có một thẻ thông tin và một iframe Google Maps — trong khi thẻ SEO
 * của chính trang đó đã hứa "biểu mẫu gửi phản hồi". Nay lời hứa đó thành thật.
 *
 * Bản đồ dùng chung `MapEmbed` với trang chi tiết và /ban-do: cả cổng chỉ còn một
 * cách nhúng bản đồ, và cùng tự nâng lên Maps Embed API khi có khoá.
 */
export default function Contact() {
  const settings = useSettings();
  const c = settings.contact ?? {};
  const s = settings.social ?? {};

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
              {/* Mức phóng 14, không phải 16 mặc định: toạ độ là tâm phường chứ
                  không phải cửa trụ sở, phóng sát vào là bày ra một độ chính xác
                  không có thật. */}
              <MapEmbed
                lat={MAP_CENTER[0]}
                lng={MAP_CENTER[1]}
                query={c.address || 'Phường Đông Triều, tỉnh Quảng Ninh'}
                title={c.name || SITE_OWNER}
                height={320}
                zoom={14}
              />
              <p className="mt-2 text-xs text-muted">
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
      <Icon size={18} className="mt-0.5 shrink-0 text-subtle" />
      <div className="min-w-0">
        <p className="text-xs text-subtle">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-jade-700 hover:text-muted">{value}</a>
        ) : (
          <p className="text-sm text-body">{value}</p>
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
