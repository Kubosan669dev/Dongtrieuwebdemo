import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useSettings } from '../hooks/useSettings.js';
import PageHero from '../components/PageHero.jsx';
import MapEmbed from '../components/MapEmbed.jsx';
import Seo from '../components/Seo.jsx';

export default function Contact() {
  const settings = useSettings();
  const c = settings.contact ?? {};

  return (
    <div>
      <Seo title="Liên hệ" description="Thông tin liên hệ cổng thông tin du lịch phường Đông Triều, tỉnh Quảng Ninh." />
      <PageHero title="Liên hệ" description="Mọi thông tin phản hồi xin gửi về đơn vị quản lý cổng thông tin." breadcrumb={[{ label: 'Liên hệ' }]} />

      <div className="container-page py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="mb-4 font-serif text-xl font-semibold">{c.name || 'UBND phường Đông Triều'}</h2>
              <Row icon={MapPin} label="Địa chỉ" value={c.address || 'Phường Đông Triều, tỉnh Quảng Ninh'} />
              {c.phone && <Row icon={Phone} label="Điện thoại" value={c.phone} href={`tel:${c.phone}`} />}
              {c.email && <Row icon={Mail} label="Email" value={c.email} href={`mailto:${c.email}`} />}
              <Row icon={Clock} label="Giờ làm việc" value="Thứ 2 – Thứ 6, 07:30 – 17:00" />
            </div>
          </div>
          <MapEmbed query="Phường Đông Triều, Quảng Ninh" title="Phường Đông Triều" height={380} showDirections={false} />
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, href }) {
  return (
    <div className="flex items-start gap-3 border-b border-jade-900/5 py-3 last:border-0 dark:border-white/5">
      <Icon size={18} className="mt-0.5 shrink-0 text-jade-400" />
      <div>
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
