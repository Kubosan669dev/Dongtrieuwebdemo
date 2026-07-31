import ResourceManager, { PublishedBadge } from './ResourceManager.jsx';
import { Field, Text, Textarea, Select, Toggle, ArrayInput, GalleryField, LatLngField, Number_ } from './fields.jsx';
import { RESTAURANT_TYPES } from '../../lib/constants.js';

const typeOptions = Object.entries(RESTAURANT_TYPES).map(([value, v]) => ({ value, label: v.label }));

const columns = [
  { key: 'name', label: 'Tên', render: (it) => <span className="font-medium">{it.name}{it.isPlaceholder && <span className="ml-2 text-xs text-gold-500">(mẫu)</span>}</span> },
  { key: 'type', label: 'Loại', render: (it) => RESTAURANT_TYPES[it.type]?.label },
  { key: 'area', label: 'Khu vực' },
  {
    key: 'isVerified',
    label: 'Xác minh',
    render: (it) =>
      it.isVerified ? (
        <span className="text-xs text-jade-600">✓ đã xác minh</span>
      ) : (
        <span className="text-xs text-gold-600">chưa xác minh</span>
      ),
  },
  { key: 'published', label: 'Trạng thái', render: (it) => <PublishedBadge value={it.published} /> },
];

export default function RestaurantsAdmin() {
  const emptyItem = () => ({
    name: '', type: 'NHA_HANG', address: '', area: '', phone: '', openHours: '', priceRange: '',
    specialties: [], description: '', images: [], lat: null, lng: null,
    coverUrl: null, coverIsIllustrative: false,
    sourceNote: '', isVerified: false, isPlaceholder: false, order: 0, published: true,
  });

  const renderForm = (d, set) => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên" required><Text value={d.name} onChange={(v) => set('name', v)} /></Field>
        <Field label="Loại"><Select value={d.type} onChange={(v) => set('type', v)} options={typeOptions} /></Field>
      </div>
      <Field label="Địa chỉ" required><Text value={d.address} onChange={(v) => set('address', v)} /></Field>
      <Field
        label="Khu vực hành chính"
        hint='Ghi rõ nếu không thuộc phường Đông Triều, vd "Phường Mạo Khê (lân cận)"'
      >
        <Text value={d.area} onChange={(v) => set('area', v)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Điện thoại"><Text value={d.phone} onChange={(v) => set('phone', v)} /></Field>
        <Field label="Giờ mở cửa"><Text value={d.openHours} onChange={(v) => set('openHours', v)} /></Field>
        <Field label="Khoảng giá"><Text value={d.priceRange} onChange={(v) => set('priceRange', v)} /></Field>
      </div>
      <Field label="Mô tả"><Textarea value={d.description} onChange={(v) => set('description', v)} rows={3} /></Field>
      <Field label="Món / đặc sản"><ArrayInput value={d.specialties} onChange={(v) => set('specialties', v)} placeholder="Thêm món…" /></Field>
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

      <Field label="Ghi chú nguồn" hint="Hiển thị cho du khách khi chưa xác minh">
        <Text value={d.sourceNote} onChange={(v) => set('sourceNote', v)} />
      </Field>
      <Toggle value={d.isVerified} onChange={(v) => set('isVerified', v)} label="Đã gọi xác minh" />
      <p className="-mt-2 text-xs text-jade-400">
        Bật sau khi bạn đã gọi kiểm tra số điện thoại và địa chỉ — ghi chú nguồn sẽ tự ẩn khỏi trang công khai.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Thứ tự"><Number_ value={d.order} onChange={(v) => set('order', v ?? 0)} /></Field>
        <div className="flex items-end"><Toggle value={d.isPlaceholder} onChange={(v) => set('isPlaceholder', v)} label="Dữ liệu mẫu" /></div>
        <div className="flex items-end"><Toggle value={d.published} onChange={(v) => set('published', v)} label="Hiển thị" /></div>
      </div>
    </>
  );

  const toPayload = ({ id, createdAt, updatedAt, ...rest }) => rest;

  return <ResourceManager title="Nhà hàng & điểm dừng chân" description="Bổ sung nhà hàng, quán ăn, điểm dừng chân thật (thay dữ liệu mẫu)." resource="restaurants" columns={columns} renderForm={renderForm} emptyItem={emptyItem} toPayload={toPayload} />;
}
