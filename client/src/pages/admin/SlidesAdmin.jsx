import { useQuery } from '@tanstack/react-query';
import ResourceManager from './ResourceManager.jsx';
import { Field, Text, Toggle, ImageField, Select, Number_ } from './fields.jsx';
import { api } from '../../lib/api.js';

const columns = [
  { key: 'title', label: 'Tiêu đề', render: (it) => <span className="font-medium">{it.title}</span> },
  { key: 'heritageSlug', label: 'Di tích liên kết' },
  { key: 'active', label: 'Kích hoạt', render: (it) => (it.active ? '✓' : '—') },
  { key: 'order', label: 'Thứ tự' },
];

export default function SlidesAdmin() {
  const heritages = useQuery({ queryKey: ['admin', 'heritages'], queryFn: () => api.get('/heritages?all=1') });
  const heritageOptions = [{ value: '', label: '— Không —' }, ...(heritages.data?.items ?? []).map((h) => ({ value: h.slug, label: h.name }))];

  const emptyItem = () => ({ title: '', subtitle: '', imageUrl: null, heritageSlug: '', ctaLabel: 'Khám phá', ctaHref: '', order: 0, active: true });

  const renderForm = (d, set) => (
    <>
      <Field label="Tiêu đề" required><Text value={d.title} onChange={(v) => set('title', v)} /></Field>
      <Field label="Phụ đề"><Text value={d.subtitle} onChange={(v) => set('subtitle', v)} /></Field>
      <Field label="Ảnh nền" hint="Bỏ trống để dùng ảnh bìa của di tích liên kết"><ImageField value={d.imageUrl} onChange={(v) => set('imageUrl', v)} /></Field>
      <Field label="Di tích liên kết"><Select value={d.heritageSlug || ''} onChange={(v) => set('heritageSlug', v)} options={heritageOptions} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nhãn nút"><Text value={d.ctaLabel} onChange={(v) => set('ctaLabel', v)} /></Field>
        <Field label="Đường dẫn nút" hint="vd /di-tich/chua-quan-ngoc-thanh"><Text value={d.ctaHref} onChange={(v) => set('ctaHref', v)} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thứ tự"><Number_ value={d.order} onChange={(v) => set('order', v ?? 0)} /></Field>
        <div className="flex items-end"><Toggle value={d.active} onChange={(v) => set('active', v)} label="Kích hoạt" /></div>
      </div>
    </>
  );

  const toPayload = ({ id, createdAt, updatedAt, ...rest }) => {
    if (!rest.ctaHref && rest.heritageSlug) rest.ctaHref = `/di-tich/${rest.heritageSlug}`;
    return rest;
  };

  return <ResourceManager title="Slider trang chủ" description="Quản lý ảnh trình chiếu ở đầu trang chủ." resource="slides" columns={columns} renderForm={renderForm} emptyItem={emptyItem} toPayload={toPayload} searchable={false} />;
}
