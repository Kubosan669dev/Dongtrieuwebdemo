import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** Tiêu đề trang phụ (không phải trang chủ) + breadcrumb. */
export default function PageHero({ title, description, breadcrumb = [] }) {
  return (
    <div className="relative overflow-hidden bg-jade-700 text-white">
      <div className="pattern-bg absolute inset-0 opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-br from-jade-700 via-jade-800 to-jade-950" />
      <div className="container-page relative py-12 sm:py-16">
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-jade-100/80">
          <Link to="/" className="hover:text-gold-300">Trang chủ</Link>
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={14} />
              {b.to ? (
                <Link to={b.to} className="hover:text-gold-300">{b.label}</Link>
              ) : (
                <span className="text-white">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="font-serif text-3xl font-bold sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-jade-100/85">{description}</p>}
      </div>
    </div>
  );
}
