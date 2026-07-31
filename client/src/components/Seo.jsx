import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Tên, mô tả, ảnh chia sẻ mặc định đều lấy từ một nguồn duy nhất — xem lib/site.js.
// Các giá trị này phải khớp với thẻ tĩnh trong `client/index.html`, vì đó là những
// gì trình thu thập không chạy JavaScript đọc được.
import { SITE_DESCRIPTION, SITE_IMAGE, SITE_NAME, titleWithSite } from '../lib/site.js';
import { useSettings } from '../hooks/useSettings.js';

/** Đường dẫn tương đối → URL tuyệt đối. Thẻ Open Graph không nhận đường tương đối. */
function absolute(url) {
  if (!url) return null;
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return null;
  }
}

/**
 * Cập nhật thẻ <title>, meta description, Open Graph và JSON-LD theo trang.
 *
 * Mọi trường đều có giá trị mặc định và LUÔN được ghi lại mỗi lần đổi trang.
 * Bản trước bỏ qua trường rỗng (`if (!value) return`) nên trang không khai báo
 * mô tả sẽ giữ nguyên mô tả — và cả ảnh chia sẻ — của trang vừa xem trước đó:
 * từ một di tích bấm sang "Giới thiệu" là thẻ chia sẻ vẫn mang ảnh bìa di tích.
 */
export default function Seo({ title, description, image, type = 'website', jsonLd }) {
  const { pathname } = useLocation();
  const settings = useSettings();

  // Cài đặt do quản trị viên nhập được ưu tiên, `lib/site.js` là giá trị rơi về.
  //
  // Phải luôn có giá trị rơi về: `/api/settings` tải bất đồng bộ, nên lượt vẽ đầu
  // tiên chưa có gì — không có nó thì tiêu đề trang trống trong khoảnh khắc đó.
  // Khi cài đặt về, hiệu ứng bên dưới chạy lại và ghi đè. Đây cũng chính là lý do
  // hiệu ứng này ghi lại MỌI trường ở mỗi lần chạy chứ không bỏ qua trường rỗng.
  const tenSite = settings.seo?.title?.trim() || SITE_NAME;
  const moTaSite = settings.seo?.description?.trim() || SITE_DESCRIPTION;

  useEffect(() => {
    const full = titleWithSite(title, tenSite);
    const desc = description || moTaSite;

    document.title = full;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:image', absolute(image || SITE_IMAGE));
    setMeta('property', 'og:url', absolute(pathname));
  }, [title, description, image, type, pathname, tenSite, moTaSite]);

  // Tách khỏi hiệu ứng trên: `jsonLd` là object nên ở nơi gọi không bọc `useMemo`
  // thì nó đổi định danh mỗi lần render. Gộp chung một hiệu ứng thì cả khối chạy
  // lại liên tục và thẻ <script> bị xoá đi chèn lại không ngừng. `JSON.stringify`
  // cho một chuỗi ổn định để so sánh, nên hiệu ứng chỉ chạy khi nội dung đổi thật.
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : null;
  useEffect(() => {
    if (!jsonLdText) return undefined;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = jsonLdText;
    document.head.appendChild(script);
    return () => script.remove();
  }, [jsonLdText]);

  return null;
}

function setMeta(attr, key, value) {
  if (!value) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}
