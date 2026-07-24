import ResourceManager, { PublishedBadge } from './ResourceManager.jsx';
import { Field, Text, Textarea, Select, Toggle, ArrayInput, ImageField } from './fields.jsx';
import RichEditor from './RichEditor.jsx';
import { ARTICLE_CATEGORIES } from '../../lib/constants.js';
import { slugify } from '../../lib/format.js';

const catOptions = Object.entries(ARTICLE_CATEGORIES).map(([value, v]) => ({ value, label: v.label }));

const columns = [
  { key: 'title', label: 'Tiêu đề', render: (it) => <span className="font-medium">{it.title}</span> },
  { key: 'category', label: 'Chuyên mục', render: (it) => ARTICLE_CATEGORIES[it.category]?.label },
  { key: 'views', label: 'Lượt xem' },
  { key: 'published', label: 'Trạng thái', render: (it) => <PublishedBadge value={it.published} /> },
];

export default function ArticlesAdmin() {
  const emptyItem = () => ({ title: '', slug: '', excerpt: '', contentHtml: '', category: 'TIN_TUC', coverUrl: null, author: 'Ban Biên tập', tags: [], published: false });

  const renderForm = (d, set) => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tiêu đề" required><Text value={d.title} onChange={(v) => { set('title', v); if (!d.id) set('slug', slugify(v)); }} /></Field>
        <Field label="Slug" required><Text value={d.slug} onChange={(v) => set('slug', slugify(v))} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Chuyên mục"><Select value={d.category} onChange={(v) => set('category', v)} options={catOptions} /></Field>
        <Field label="Tác giả"><Text value={d.author} onChange={(v) => set('author', v)} /></Field>
      </div>
      <Field label="Ảnh bìa"><ImageField value={d.coverUrl} onChange={(v) => set('coverUrl', v)} /></Field>
      <Field label="Tóm tắt" required><Textarea value={d.excerpt} onChange={(v) => set('excerpt', v)} rows={2} /></Field>
      <Field label="Nội dung" required><RichEditor value={d.contentHtml} onChange={(v) => set('contentHtml', v)} /></Field>
      <Field label="Thẻ (tags)"><ArrayInput value={d.tags} onChange={(v) => set('tags', v)} placeholder="Thêm thẻ…" /></Field>
      <Toggle value={d.published} onChange={(v) => set('published', v)} label="Xuất bản" />
    </>
  );

  const toPayload = ({ id, createdAt, updatedAt, views, publishedAt, ...rest }) => rest;

  return <ResourceManager title="Bài viết" description="Viết tin tức, cẩm nang, phóng sự và thông báo." resource="articles" columns={columns} renderForm={renderForm} emptyItem={emptyItem} toPayload={toPayload} />;
}
