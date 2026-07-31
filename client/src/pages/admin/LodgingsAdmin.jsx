import ResourceManager, { PublishedBadge } from './ResourceManager.jsx';
import { Field, Text, Textarea, Select, Toggle, ArrayInput, GalleryField, LatLngField, Number_ } from './fields.jsx';
import { LODGING_TYPES } from '../../lib/constants.js';

const typeOptions = Object.entries(LODGING_TYPES).map(([value, v]) => ({ value, label: v.label }));

const columns = [
  { key: 'name', label: 'Tên cơ sở', render: (it) => <span className="font-medium">{it.name}</span> },
  { key: 'type', label: 'Loại', render: (it) => LODGING_TYPES[it.type]?.label },
  { key: 'phones', label: 'Điện thoại', render: (it) => (it.phones || []).join(', ') },
  { key: 'published', label: 'Trạng thái', render: (it) => <PublishedBadge value={it.published} /> },
];

export default function LodgingsAdmin() {
  const emptyItem = () => ({ name: '', type: 'NHA_NGHI', address: '', owner: '', phones: [], description: '', priceRange: '', amenities: [], images: [], lat: null, lng: null, order: 0, published: true });

  const renderForm = (d, set) => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên cơ sở" required><Text value={d.name} onChange={(v) => set('name', v)} /></Field>
        <Field label="Loại"><Select value={d.type} onChange={(v) => set('type', v)} options={typeOptions} /></Field>
      </div>
      <Field label="Địa chỉ" required><Text value={d.address} onChange={(v) => set('address', v)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Người đại diện"><Text value={d.owner} onChange={(v) => set('owner', v)} /></Field>
        <Field label="Giá phòng (tham khảo)"><Text value={d.priceRange} onChange={(v) => set('priceRange', v)} /></Field>
      </div>
      <Field label="Số điện thoại"><ArrayInput value={d.phones} onChange={(v) => set('phones', v)} placeholder="Thêm số điện thoại…" /></Field>
      <Field label="Mô tả"><Textarea value={d.description} onChange={(v) => set('description', v)} rows={3} /></Field>
      <Field label="Tiện nghi"><ArrayInput value={d.amenities} onChange={(v) => set('amenities', v)} placeholder="Wifi, điều hoà…" /></Field>
      <Field label="Hình ảnh"><GalleryField value={d.images} onChange={(v) => set('images', v)} name={d.name} /></Field>
      <LatLngField
        lat={d.lat}
        lng={d.lng}
        onChange={({ lat, lng }) => { set('lat', lat); set('lng', lng); }}
        name={d.name}
        address={d.address}
        estimated={d.coordsEstimated}
        onEstimatedChange={(v) => set('coordsEstimated', v)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thứ tự"><Number_ value={d.order} onChange={(v) => set('order', v ?? 0)} /></Field>
        <div className="flex items-end"><Toggle value={d.published} onChange={(v) => set('published', v)} label="Hiển thị" /></div>
      </div>
    </>
  );

  const toPayload = ({ id, createdAt, updatedAt, ...rest }) => rest;

  return <ResourceManager title="Lưu trú" description="Quản lý khách sạn, nhà nghỉ trên địa bàn phường." resource="lodgings" columns={columns} renderForm={renderForm} emptyItem={emptyItem} toPayload={toPayload} />;
}
