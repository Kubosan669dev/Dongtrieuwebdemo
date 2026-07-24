import ResourceManager, { PublishedBadge } from './ResourceManager.jsx';
import { Field, Text, Textarea, Toggle, ArrayInput, ImageField, GalleryField, Number_ } from './fields.jsx';
import { slugify } from '../../lib/format.js';

const columns = [
  { key: 'name', label: 'Tên món', render: (it) => <span className="font-medium">{it.name}</span> },
  { key: 'priceRange', label: 'Giá' },
  { key: 'published', label: 'Trạng thái', render: (it) => <PublishedBadge value={it.published} /> },
];

export default function CuisinesAdmin() {
  const emptyItem = () => ({ name: '', slug: '', summary: '', description: '', priceRange: '', season: '', whereToBuy: [], coverUrl: null, coverIsIllustrative: false, images: [], order: 0, published: true });

  const renderForm = (d, set) => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên món" required><Text value={d.name} onChange={(v) => { set('name', v); if (!d.id) set('slug', slugify(v)); }} /></Field>
        <Field label="Slug" required><Text value={d.slug} onChange={(v) => set('slug', slugify(v))} /></Field>
      </div>
      <Field label="Ảnh bìa"><ImageField value={d.coverUrl} onChange={(v) => set('coverUrl', v)} /></Field>
      <Toggle value={d.coverIsIllustrative} onChange={(v) => set('coverIsIllustrative', v)} label="Ảnh minh hoạ" />
      <Field label="Tóm tắt" required><Textarea value={d.summary} onChange={(v) => set('summary', v)} rows={2} /></Field>
      <Field label="Giới thiệu" required><Textarea value={d.description} onChange={(v) => set('description', v)} rows={5} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Giá tham khảo"><Text value={d.priceRange} onChange={(v) => set('priceRange', v)} /></Field>
        <Field label="Mùa vụ"><Text value={d.season} onChange={(v) => set('season', v)} placeholder="Tháng 7–9" /></Field>
      </div>
      <Field label="Mua / thưởng thức tại"><ArrayInput value={d.whereToBuy} onChange={(v) => set('whereToBuy', v)} placeholder="Thêm địa điểm…" /></Field>
      <Field label="Hình ảnh"><GalleryField value={d.images} onChange={(v) => set('images', v)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thứ tự"><Number_ value={d.order} onChange={(v) => set('order', v ?? 0)} /></Field>
        <div className="flex items-end"><Toggle value={d.published} onChange={(v) => set('published', v)} label="Hiển thị" /></div>
      </div>
    </>
  );

  const toPayload = ({ id, createdAt, updatedAt, ...rest }) => rest;

  return <ResourceManager title="Ẩm thực" description="Quản lý 8 đặc sản tiêu biểu." resource="cuisines" columns={columns} renderForm={renderForm} emptyItem={emptyItem} toPayload={toPayload} />;
}
