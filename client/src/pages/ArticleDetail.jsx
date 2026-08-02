import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { CalendarDays, User, Eye } from 'lucide-react';
import { fetchOne, api } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import { Badge, Spinner, ErrorNote } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { ARTICLE_CATEGORIES } from '../lib/constants.js';
import { formatDate } from '../lib/format.js';

export default function ArticleDetail() {
  const { slug } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => fetchOne('articles', slug),
  });

  useEffect(() => {
    if (slug) api.post(`/articles/${slug}/view`).catch(() => {});
  }, [slug]);

  if (isLoading) return <Spinner className="min-h-[60vh]" />;
  if (isError) return <div className="container-page py-16"><ErrorNote onRetry={refetch} /></div>;

  const a = data.item;
  const cat = ARTICLE_CATEGORIES[a.category];

  return (
    <div>
      <Seo title={a.title} description={a.excerpt} type="article" image={a.coverUrl} />
      <PageHero title={a.title} breadcrumb={[{ label: 'Tin tức', to: '/tin-tuc' }, { label: a.title }]} />

      <article className="container-page py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted">
            <Badge tone={cat?.color}>{cat?.label}</Badge>
            {a.publishedAt && <span className="flex items-center gap-1"><CalendarDays size={14} /> {formatDate(a.publishedAt)}</span>}
            {a.author && <span className="flex items-center gap-1"><User size={14} /> {a.author}</span>}
            <span className="flex items-center gap-1"><Eye size={14} /> {a.views} lượt xem</span>
          </div>

          {a.coverUrl && <img src={a.coverUrl} alt={a.title} className="mb-8 aspect-[16/9] w-full rounded-md object-cover shadow-soft" />}

          <p className="mb-6 text-lg font-medium text-muted">{a.excerpt}</p>
          <div className="prose-vn" dangerouslySetInnerHTML={{ __html: a.contentHtml }} />

          {a.tags?.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 border-t border-jade-900/5 pt-6 dark:border-white/5">
              {a.tags.map((t) => (
                <span key={t} className="rounded-md bg-jade-50 px-3 py-1 text-xs text-jade-600 dark:bg-jade-800/50 dark:text-jade-200">#{t}</span>
              ))}
            </div>
          )}

          <div className="mt-8">
            <Link to="/tin-tuc" className="btn-ghost">← Về danh sách bài viết</Link>
          </div>
        </div>
      </article>
    </div>
  );
}
