import ResourceManager, { PublishedBadge } from './ResourceManager.jsx';
import { Field, Text, Textarea, Select, Toggle, ArrayInput, ImageField, GalleryField, LatLngField, Number_ } from './fields.jsx';
import { HERITAGE_TYPES, RANK_LEVELS } from '../../lib/constants.js';
import { slugify } from '../../lib/format.js';

const typeOptions = Object.entries(HERITAGE_TYPES).map(([value, v]) => ({ value, label: v.label }));
const rankOptions = Object.entries(RANK_LEVELS).map(([value, v]) => ({ value, label: v.label }));

const columns = [
  { key: 'name', label: 'Tên di tích', render: (it) => <span className="font-medium">{it.name}</span> },
  { key: 'type', label: 'Loại', render: (it) => HERITAGE_TYPES[it.type]?.label },
  { key: 'rankLevel', label: 'Xếp hạng', render: (it) => RANK_LEVELS[it.rankLevel]?.short },
  { key: 'cover', label: 'Ảnh', render: (it) => (it.coverUrl ? '✓' : <span className="text-gold-500">placeholder</span>) },
  { key: 'published', label: 'Trạng thái', render: (it) => <PublishedBadge value={it.published} /> },
];

export default function HeritagesAdmin() {
  const emptyItem = () => ({
    name: '', slug: '', type: 'CHUA', rankLevel: 'CAP_TINH', address: '',
    altNames: [], worship: [], keywords: [], highlights: [],
    summary: '', history: '', architecture: '',
    featured: false, published: true, order: 0,
    coverUrl: null, coverIsIllustrative: false, images: [], travelTips: '', lat: null, lng: null, mapQuery: '',
    rankLevelText: '', rankDecision: '', rankAuthority: '', rankNote: '', typeText: '', wardOld: '', festivalNote: '',
  });

  const renderForm = (d, set) => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên di tích" required><Text value={d.name} onChange={(v) => { set('name', v); if (!d.id) set('slug', slugify(v)); }} /></Field>
        <Field label="Slug (đường dẫn)" required hint="Tự sinh từ tên; chỉ chữ thường, số, gạch ngang"><Text value={d.slug} onChange={(v) => set('slug', slugify(v))} /></Field>
        <Field label="Loại hình" required><Select value={d.type} onChange={(v) => set('type', v)} options={typeOptions} /></Field>
        <Field label="Cấp xếp hạng" required><Select value={d.rankLevel} onChange={(v) => set('rankLevel', v)} options={rankOptions} /></Field>
      </div>

      <Field label="Ảnh bìa"><ImageField value={d.coverUrl} onChange={(v) => set('coverUrl', v)} /></Field>
      <Toggle
        value={d.coverIsIllustrative}
        onChange={(v) => set('coverIsIllustrative', v)}
        label="Ảnh minh hoạ"
      />
      <p className="-mt-2 text-xs text-subtle">
        Bật khi ảnh không phải chụp chính di tích này — giao diện sẽ hiện nhãn “Ảnh minh hoạ” cho du khách.
      </p>

      <Field label="Thư viện ảnh" hint="Hiện ở cuối trang chi tiết, mỗi ảnh kèm chú thích">
        <GalleryField value={d.images} onChange={(v) => set('images', v)} name={d.name} />
      </Field>

      <Field label="Tên gọi khác"><ArrayInput value={d.altNames} onChange={(v) => set('altNames', v)} placeholder="Thêm tên gọi khác…" /></Field>
      <Field label="Địa chỉ" required><Text value={d.address} onChange={(v) => set('address', v)} /></Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Đơn vị cũ (xã/phường)"><Text value={d.wardOld} onChange={(v) => set('wardOld', v)} /></Field>
        <Field label="Chuỗi tra Google Maps" hint="Dùng khi chưa có toạ độ"><Text value={d.mapQuery} onChange={(v) => set('mapQuery', v)} /></Field>
      </div>

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
        <Field label="Xếp hạng (nguyên văn)"><Text value={d.rankLevelText} onChange={(v) => set('rankLevelText', v)} /></Field>
        <Field label="Số quyết định"><Text value={d.rankDecision} onChange={(v) => set('rankDecision', v)} /></Field>
        <Field label="Cơ quan xếp hạng"><Text value={d.rankAuthority} onChange={(v) => set('rankAuthority', v)} /></Field>
        <Field label="Ghi chú xếp hạng"><Text value={d.rankNote} onChange={(v) => set('rankNote', v)} /></Field>
      </div>

      <Field label="Thờ phụng"><ArrayInput value={d.worship} onChange={(v) => set('worship', v)} placeholder="Đối tượng thờ phụng…" /></Field>
      <Field label="Lễ hội (mô tả ngắn)"><Textarea value={d.festivalNote} onChange={(v) => set('festivalNote', v)} rows={2} /></Field>
      <Field label="Tóm tắt" hint="Hỗ trợ Markdown"><Textarea value={d.summary} onChange={(v) => set('summary', v)} rows={3} /></Field>
      <Field label="Lịch sử" hint="Hỗ trợ Markdown"><Textarea value={d.history} onChange={(v) => set('history', v)} rows={6} /></Field>
      <Field label="Kiến trúc & hiện vật" hint="Hỗ trợ Markdown"><Textarea value={d.architecture} onChange={(v) => set('architecture', v)} rows={5} /></Field>
      <Field label="Điểm nhấn"><ArrayInput value={d.highlights} onChange={(v) => set('highlights', v)} placeholder="Thêm điểm nhấn…" /></Field>
      <Field label="Cách đến & kinh nghiệm" hint="Hỗ trợ Markdown — hiển thị ở tab riêng trên trang chi tiết">
        <Textarea value={d.travelTips} onChange={(v) => set('travelTips', v)} rows={6} />
      </Field>
      <Field label="Từ khoá"><ArrayInput value={d.keywords} onChange={(v) => set('keywords', v)} placeholder="Thêm từ khoá…" /></Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Thứ tự"><Number_ value={d.order} onChange={(v) => set('order', v ?? 0)} /></Field>
        <div className="flex items-end"><Toggle value={d.featured} onChange={(v) => set('featured', v)} label="Nổi bật" /></div>
        <div className="flex items-end"><Toggle value={d.published} onChange={(v) => set('published', v)} label="Hiển thị" /></div>
      </div>
    </>
  );

  const toPayload = (d) => {
    // `festivals` là dữ liệu quan hệ chỉ để đọc, không gửi lên khi lưu.
    // `images` thì có gửi — trước đây bị loại ở đây nên quản trị viên chỉnh ảnh
    // di tích xong bấm lưu là mất trắng.
    const { id, createdAt, updatedAt, festivals, ...rest } = d;
    return rest;
  };

  return (
    <ResourceManager
      title="Di tích"
      description="Quản lý 13 cụm di tích đã xếp hạng và bổ sung ảnh, toạ độ."
      resource="heritages"
      columns={columns}
      renderForm={renderForm}
      emptyItem={emptyItem}
      toPayload={toPayload}
    />
  );
}
