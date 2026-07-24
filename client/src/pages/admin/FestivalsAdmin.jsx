import { useQuery } from '@tanstack/react-query';
import ResourceManager, { PublishedBadge } from './ResourceManager.jsx';
import { Field, Text, Textarea, Select, Toggle, ArrayInput, ImageField, Number_ } from './fields.jsx';
import { FESTIVAL_SCALES, LUNAR_MONTH_LABELS } from '../../lib/constants.js';
import { api } from '../../lib/api.js';
import { slugify } from '../../lib/format.js';

const scaleOptions = Object.entries(FESTIVAL_SCALES).map(([value, v]) => ({ value, label: v.label }));

const columns = [
  { key: 'name', label: 'Tên lễ hội', render: (it) => <span className="font-medium">{it.name}</span> },
  { key: 'lunar', label: 'Âm lịch', render: (it) => it.lunarMonth ? LUNAR_MONTH_LABELS[it.lunarMonth] : '—' },
  { key: 'scale', label: 'Quy mô', render: (it) => FESTIVAL_SCALES[it.scale]?.label },
  { key: 'published', label: 'Trạng thái', render: (it) => <PublishedBadge value={it.published} /> },
];

export default function FestivalsAdmin() {
  const heritages = useQuery({ queryKey: ['admin', 'heritages'], queryFn: () => api.get('/heritages?all=1') });
  const heritageOptions = [{ value: '', label: '— Không liên kết —' }, ...(heritages.data?.items ?? []).map((h) => ({ value: h.id, label: h.name }))];

  const emptyItem = () => ({
    name: '', slug: '', lunarMonth: null, lunarDay: null, lunarTimeText: '', solarEstimate: '',
    location: '', scale: 'HOI_LANG', intro: '', rituals: [], heritageId: '', coverUrl: null, coverIsIllustrative: false, images: [], order: 0, published: true,
  });

  const renderForm = (d, set) => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên lễ hội" required><Text value={d.name} onChange={(v) => { set('name', v); if (!d.id) set('slug', slugify(v)); }} /></Field>
        <Field label="Slug" required><Text value={d.slug} onChange={(v) => set('slug', slugify(v))} /></Field>
      </div>
      <Field label="Ảnh bìa"><ImageField value={d.coverUrl} onChange={(v) => set('coverUrl', v)} /></Field>
      <Toggle value={d.coverIsIllustrative} onChange={(v) => set('coverIsIllustrative', v)} label="Ảnh minh hoạ" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tháng âm lịch" hint="1–12"><Number_ value={d.lunarMonth} onChange={(v) => set('lunarMonth', v)} min={1} max={12} /></Field>
        <Field label="Ngày âm lịch"><Number_ value={d.lunarDay} onChange={(v) => set('lunarDay', v)} min={1} max={30} /></Field>
        <Field label="Quy mô"><Select value={d.scale} onChange={(v) => set('scale', v)} options={scaleOptions} /></Field>
      </div>
      <Field label="Thời gian (nguyên văn)" required><Text value={d.lunarTimeText} onChange={(v) => set('lunarTimeText', v)} placeholder="13 – 17 tháng Giêng âm lịch" /></Field>
      <Field label="Dương lịch (ước tính)"><Text value={d.solarEstimate} onChange={(v) => set('solarEstimate', v)} /></Field>
      <Field label="Địa điểm" required><Text value={d.location} onChange={(v) => set('location', v)} /></Field>
      <Field label="Di tích liên quan"><Select value={d.heritageId || ''} onChange={(v) => set('heritageId', v || null)} options={heritageOptions} /></Field>
      <Field label="Giới thiệu" required><Textarea value={d.intro} onChange={(v) => set('intro', v)} rows={5} /></Field>
      <Field label="Nghi lễ & hoạt động"><ArrayInput value={d.rituals} onChange={(v) => set('rituals', v)} placeholder="Thêm nghi lễ…" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thứ tự"><Number_ value={d.order} onChange={(v) => set('order', v ?? 0)} /></Field>
        <div className="flex items-end"><Toggle value={d.published} onChange={(v) => set('published', v)} label="Hiển thị" /></div>
      </div>
    </>
  );

  const toPayload = (d) => {
    const { id, createdAt, updatedAt, heritage, ...rest } = d;
    if (!rest.heritageId) rest.heritageId = null;
    return rest;
  };

  return <ResourceManager title="Lễ hội" description="Quản lý lịch 17 lễ hội theo tháng âm lịch." resource="festivals" columns={columns} renderForm={renderForm} emptyItem={emptyItem} toPayload={toPayload} />;
}
