import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Facebook, Youtube } from 'lucide-react';
import { useSettings } from '../hooks/useSettings.js';
import Brand from './Brand.jsx';
import { SITE_NAME, SITE_OWNER } from '../lib/site.js';

export default function Footer() {
  const settings = useSettings();
  const contact = settings.contact ?? {};
  const social = settings.social ?? {};

  return (
    <footer className="mt-20 border-t border-jade-900/5 bg-jade-950 text-jade-100">
      {/* Năm cột từ lg trở lên (giới thiệu chiếm 2, rồi ba cột liên kết). Ở md
          chỉ hai cột: nhồi năm cột vào 768px thì mỗi cột hẹp tới mức tên trang
          nào cũng gãy làm hai dòng. */}
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="md:col-span-2">
          <Brand size={44} title={SITE_NAME} titleClass="text-xl" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-jade-200/80">
            Cổng thông tin chính thức của phường Đông Triều, tỉnh Quảng Ninh — nơi bà con trong phường và khách
            phương xa cùng tra cứu về vùng đất địa linh nhân kiệt, quê gốc và nơi yên nghỉ của các vị vua triều
            Trần, trung tâm của Thiền phái Trúc Lâm.
          </p>
          <div className="mt-5 flex gap-3">
            {social.facebook && (
              <a href={social.facebook} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-jade-800 hover:bg-jade-700" aria-label="Facebook">
                <Facebook size={16} />
              </a>
            )}
            {social.youtube && (
              <a href={social.youtube} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-jade-800 hover:bg-jade-700" aria-label="YouTube">
                <Youtube size={16} />
              </a>
            )}
          </div>
        </div>

        {/* ── CHÂN TRANG LÀ NƠI DUY NHẤT HAI CỔNG GẶP NHAU ────────────────────
            Thanh điều hướng của mỗi cổng cố ý không chứa mục của cổng kia, nên
            nếu chân trang cũng tách đôi thì người dân muốn xem lễ hội sẽ không
            có lối nào ngoài việc bấm nút chuyển cổng rồi tự mò. Chân trang là
            bản đồ toàn cổng — nó liệt kê hết, chia rõ hai cột theo cổng. */}
        <div>
          <h3 className="font-serif text-base font-semibold text-white">Cổng du lịch</h3>
          <ul className="mt-4 space-y-2 text-sm text-jade-200/80">
            <li><Link to="/di-tich" className="hover:text-gold-300">Di tích &amp; danh thắng</Link></li>
            <li><Link to="/le-hoi" className="hover:text-gold-300">Lễ hội truyền thống</Link></li>
            <li><Link to="/am-thuc" className="hover:text-gold-300">Ẩm thực &amp; đặc sản</Link></li>
            <li><Link to="/luu-tru" className="hover:text-gold-300">Lưu trú cho khách tới thăm</Link></li>
            <li><Link to="/ban-do" className="hover:text-gold-300">Bản đồ số</Link></li>
            <li><Link to="/thoi-tiet" className="hover:text-gold-300">Thời tiết &amp; triều cường</Link></li>
            <li><Link to="/gioi-thieu" className="hover:text-gold-300">Giới thiệu vùng đất</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-serif text-base font-semibold text-white">Cổng người dân</h3>
          <ul className="mt-4 space-y-2 text-sm text-jade-200/80">
            <li><Link to="/nguoi-dan" className="hover:text-gold-300">Trang chủ cổng người dân</Link></li>
            <li><Link to="/khu-pho" className="hover:text-gold-300">11 khu phố của phường</Link></li>
            <li><Link to="/hanh-chinh" className="hover:text-gold-300">Hành chính phường</Link></li>
            <li><Link to="/van-ban" className="hover:text-gold-300">Văn bản chỉ đạo</Link></li>
            <li><Link to="/phan-anh" className="hover:text-gold-300">Phản ánh &amp; góp ý</Link></li>
            <li><Link to="/tin-tuc" className="hover:text-gold-300">Tin tức &amp; thông báo</Link></li>
            <li><Link to="/lien-he" className="hover:text-gold-300">Liên hệ phường</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-serif text-base font-semibold text-white">Liên hệ</h3>
          <ul className="mt-4 space-y-3 text-sm text-jade-200/80">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-gold-400" />
              <span>{contact.address || 'Phường Đông Triều, tỉnh Quảng Ninh'}</span>
            </li>
            {contact.phone && (
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-gold-400" />
                <a href={`tel:${contact.phone}`} className="hover:text-gold-300">{contact.phone}</a>
              </li>
            )}
            {contact.email && (
              <li className="flex items-start gap-2">
                <Mail size={16} className="mt-0.5 shrink-0 text-gold-400" />
                {/* `break-all` + `min-w-0`: địa chỉ thư của phường dài và không có
                    chỗ ngắt tự nhiên, để nguyên là nó đẩy rộng cả trang ở khổ máy
                    tính bảng và sinh thanh cuộn ngang. */}
                <a href={`mailto:${contact.email}`} className="min-w-0 break-all hover:text-gold-300">
                  {contact.email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-jade-800/60">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-jade-300/70 sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE_NAME} · {SITE_OWNER}.</p>
          <p>
            Dữ liệu di tích biên soạn từ hồ sơ lý lịch di tích &amp; quyết định xếp hạng chính thức.
          </p>
        </div>
      </div>
    </footer>
  );
}
