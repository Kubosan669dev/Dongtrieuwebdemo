import ResourceManager, { PublishedBadge } from './ResourceManager.jsx';
import { Field, Text, Textarea, Select, Toggle, ArrayInput, ImageField, GalleryField, LatLngField, Number_ } from './fields.jsx';
import { slugify } from '../../lib/format.js';

const typeOptions = [
  { value: 'TAM_LINH', label: 'Tâm linh (chùa, đền, am)' },
  { value: 'LICH_SU', label: 'Lịch sử' },
  { value: 'SINH_THAI', label: 'Sinh thái, làng quê' },
];

const columns = [
  { key: 'name', label: 'Tên điểm đến', render: (it) => <span className="font-medium">{it.name}</span> },
  { key: 'ward', label: 'Địa bàn' },
  { key: 'distanceKm', label: 'Cách (km)', render: (it) => (it.distanceKm ? `~${it.distanceKm}` : '—') },
  { key: 'published', label: 'Trạng thái', render: (it) => <PublishedBadge value={it.published} /> },
];

export default function AttractionsAdmin() {
  const emptyItem = () => ({
    name: '', slug: '', type: 'TAM_LINH', ward: '', distanceKm: null,
    address: '', mapQuery: '', lat: null, lng: null,
    summary: '', description: '', highlights: [],
    coverUrl: null, coverIsIllustrative: false, images: [], order: 0, published: true,
  });

  const renderForm = (d, set) => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên điểm đến" required><Text value={d.name} onChange={(v) => { set('name', v); if (!d.id) set('slug', slugify(v)); }} /></Field>
        <Field label="Slug" required><Text value={d.slug} onChange={(v) => set('slug', slugify(v))} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Loại"><Select value={d.type} onChange={(v) => set('type', v)} options={typeOptions} /></Field>
        <Field label="Địa bàn" hint="vd Xã An Sinh"><Text value={d.ward} onChange={(v) => set('ward', v)} /></Field>
        <Field label="Cách trung tâm (km)"><Number_ value={d.distanceKm} onChange={(v) => set('distanceKm', v)} step="0.5" /></Field>
      </div>

      <Field label="Ảnh bìa"><ImageField value={d.coverUrl} onChange={(v) => set('coverUrl', v)} /></Field>
      <Toggle value={d.coverIsIllustrative} onChange={(v) => set('coverIsIllustrative', v)} label="Ảnh minh hoạ" />
      <Field label="Thư viện ảnh" hint="Hiện ở cuối trang chi tiết, mỗi ảnh kèm chú thích">
        <GalleryField value={d.images} onChange={(v) => set('images', v)} name={d.name} />
      </Field>

      <Field label="Địa chỉ"><Text value={d.address} onChange={(v) => set('address', v)} /></Field>
      <Field label="Chuỗi tra Google Maps" hint="Dùng khi chưa có toạ độ"><Text value={d.mapQuery} onChange={(v) => set('mapQuery', v)} /></Field>
      <LatLngField
        lat={d.lat}
        lng={d.lng}
        onChange={({ lat, lng }) => { set('lat', lat); set('lng', lng); }}
        name={d.name}
        address={d.address}
        ward={d.ward}
        estimated={d.coordsEstimated}
        onEstimatedChange={(v) => set('coordsEstimated', v)}
      />

      <Field label="Tóm tắt" required><Textarea value={d.summary} onChange={(v) => set('summary', v)} rows={3} /></Field>
      <Field label="Mô tả chi tiết"><Textarea value={d.description} onChange={(v) => set('description', v)} rows={6} /></Field>
      <Field label="Điểm nhấn"><ArrayInput value={d.highlights} onChange={(v) => set('highlights', v)} placeholder="Thêm điểm nhấn…" /></Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thứ tự"><Number_ value={d.order} onChange={(v) => set('order', v ?? 0)} /></Field>
        <div className="flex items-end"><Toggle value={d.published} onChange={(v) => set('published', v)} label="Hiển thị" /></div>
      </div>
    </>
  );

  const toPayload = ({ id, createdAt, updatedAt, ...rest }) => rest;

  return (
    <ResourceManager
      title="Điểm đến lân cận"
      description="Các điểm ngoài phường Đông Triều nhưng nên kết hợp tham quan (Ngọa Vân, Quỳnh Lâm, đền An Sinh…)."
      resource="attractions"
      columns={columns}
      renderForm={renderForm}
      emptyItem={emptyItem}
      toPayload={toPayload}
    />
  );
}
