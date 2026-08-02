import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, MessageSquarePlus } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings.js';
import { phoneHref } from '../../lib/format.js';
import { SITE_OWNER } from '../../lib/site.js';
import PagodaMotif from '../PagodaMotif.jsx';

/**
 * Dải liên hệ ở cuối trang chủ.
 *
 * Cố ý KHÔNG đặt biểu mẫu ở đây, chỉ ba thông tin liên lạc và một liên kết sang
 * trang Liên hệ. Hai lý do: biểu mẫu ở hai chỗ là hai chỗ phải cùng lúc đúng về
 * kiểm dữ liệu, ô bẫy và thông báo lỗi; và cuối trang chủ là nơi khách đang cuộn
 * qua chứ không phải nơi họ chủ ý ngồi viết.
 *
 * Khác với chân trang: chân trang là bản đồ site, dải này là một lời mời có việc
 * cụ thể — góp ý, báo thông tin sai, hỏi về lễ hội.
 */
export default function HomeContact() {
  const settings = useSettings();
  const c = settings.contact ?? {};

  return (
    <section data-vao className="container-page mt-16">
      <div className="relative overflow-hidden rounded-md bg-jade-800 p-7 text-white sm:p-9">
        <PagodaMotif className="text-white" opacity={0.1} scale={120} />
        <div className="relative grid gap-7 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-[-0.01em] sm:text-3xl">
              Thấy thông tin chưa đúng? Hãy cho chúng tôi biết
            </h2>
            <p className="mt-3 max-w-xl text-jade-100/85">
              Giờ mở cửa thay đổi, số điện thoại cũ, một lễ hội chưa có trên lịch — mọi góp ý đều giúp trang
              này chính xác hơn cho người đến sau.
            </p>
            <Link to="/lien-he" className="btn-gold mt-5">
              <MessageSquarePlus size={16} /> Gửi phản hồi
            </Link>
          </div>

          <dl className="space-y-3 text-sm">
            <Dong icon={MapPin} nhan="Địa chỉ">
              {c.address || 'Phường Đông Triều, tỉnh Quảng Ninh'}
            </Dong>
            {c.phone && (
              <Dong icon={Phone} nhan="Điện thoại">
                <a href={phoneHref(c.phone)} className="underline decoration-white/30 hover:decoration-white">
                  {c.phone}
                </a>
              </Dong>
            )}
            {c.email && (
              <Dong icon={Mail} nhan="Email">
                <a href={`mailto:${c.email}`} className="underline decoration-white/30 hover:decoration-white">
                  {c.email}
                </a>
              </Dong>
            )}
            <p className="pt-1 text-xs text-jade-100/60">{c.name || SITE_OWNER}</p>
          </dl>
        </div>
      </div>
    </section>
  );
}

function Dong({ icon: Icon, nhan, children }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={17} className="mt-0.5 shrink-0 text-gold-300" aria-hidden="true" />
      <div>
        <dt className="text-xs uppercase tracking-wide text-jade-100/60">{nhan}</dt>
        <dd className="text-jade-50">{children}</dd>
      </div>
    </div>
  );
}
