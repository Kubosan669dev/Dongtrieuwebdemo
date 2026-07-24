import { useEffect } from 'react';

/** Cập nhật thẻ <title>, meta description, Open Graph và JSON-LD theo trang. */
export default function Seo({ title, description, image, type = 'website', jsonLd }) {
  useEffect(() => {
    const full = title ? `${title} — Du lịch Đông Triều` : 'Du lịch phường Đông Triều — Quảng Ninh';
    document.title = full;

    setMeta('name', 'description', description);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    if (image) setMeta('property', 'og:image', image);

    let script;
    if (jsonLd) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => {
      if (script) document.head.removeChild(script);
    };
  }, [title, description, image, type, jsonLd]);

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
