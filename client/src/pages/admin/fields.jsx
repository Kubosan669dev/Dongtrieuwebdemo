import { lazy, Suspense, useState } from 'react';
import { X, ImagePlus, Plus, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import MediaPicker from './MediaPicker.jsx';
import { cx } from '../../lib/format.js';

/** Nạp trễ: Leaflet không được nằm trong gói khởi động của khu quản trị. */
const MapPicker = lazy(() => import('./MapPicker.jsx'));
import { normalizeImages } from '../../../../shared/images.js';

export function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-jade-700 dark:text-jade-200">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-jade-400">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full rounded-xl border border-jade-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 dark:border-jade-700 dark:bg-jade-900 dark:text-jade-50';

export function Text({ value, onChange, ...props }) {
  return <input className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...props} />;
}

export function Number_({ value, onChange, ...props }) {
  return (
    <input
      type="number"
      className={inputCls}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      {...props}
    />
  );
}

export function Textarea({ value, onChange, rows = 4, ...props }) {
  return <textarea className={inputCls} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...props} />;
}

export function Select({ value, onChange, options }) {
  return (
    <select className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Toggle({ value, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cx('inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition', value ? 'bg-jade-600 text-white' : 'bg-jade-100 text-jade-600 dark:bg-jade-800')}
    >
      <span className={cx('h-2.5 w-2.5 rounded-full', value ? 'bg-gold-300' : 'bg-jade-400')} />
      {label}: {value ? 'Bật' : 'Tắt'}
    </button>
  );
}

/** Danh sách chuỗi (mảng): thêm/bớt từng dòng. */
export function ArrayInput({ value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v) {
      onChange([...(value || []), v]);
      setDraft('');
    }
  };
  return (
    <div>
      <div className="flex gap-2">
        <input
          className={inputCls}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
        />
        <button type="button" onClick={add} className="btn-ghost shrink-0 !px-3"><Plus size={16} /></button>
      </div>
      {value?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-jade-100 px-3 py-1 text-sm text-jade-700 dark:bg-jade-800 dark:text-jade-100">
              {item}
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-jade-400 hover:text-red-500"><X size={13} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Chọn 1 ảnh bìa. */
export function ImageField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="cover" className="h-40 w-64 rounded-xl object-cover ring-1 ring-jade-200" />
          <button type="button" onClick={() => onChange(null)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white"><X size={14} /></button>
          <button type="button" onClick={() => setOpen(true)} className="absolute bottom-2 right-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-jade-700">Đổi ảnh</button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex h-40 w-64 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-jade-200 text-jade-400 hover:border-jade-400 hover:text-jade-600 dark:border-jade-700">
          <ImagePlus size={28} />
          <span className="text-sm">Chọn ảnh bìa</span>
        </button>
      )}
      <MediaPicker open={open} onClose={() => setOpen(false)} onSelect={onChange} mode="single" />
    </div>
  );
}

/**
 * Thư viện ảnh minh hoạ: chọn nhiều ảnh, mỗi ảnh có ô nhập chú thích riêng và
 * đổi được thứ tự.
 *
 * Giá trị là mảng `{ url, caption }`. Vẫn nhận mảng chuỗi URL của dạng cũ để mở
 * bản ghi lưu từ trước không bị lỗi (xem `shared/images.js`).
 */
export function GalleryField({ value, onChange, name }) {
  const [open, setOpen] = useState(false);
  const items = normalizeImages(value);

  const patch = (i, changes) => onChange(items.map((img, j) => (j === i ? { ...img, ...changes } : img)));
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((img, i) => (
        <div key={`${img.url}-${i}`} className="flex gap-3 rounded-xl border border-jade-200 p-2 dark:border-jade-700">
          <img src={img.url} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover ring-1 ring-jade-200 dark:ring-jade-700" />
          <div className="min-w-0 flex-1">
            <input
              className={inputCls}
              value={img.caption}
              maxLength={300}
              onChange={(e) => patch(i, { caption: e.target.value })}
              placeholder={`Chú thích ảnh${name ? ` — vd "Cổng tam quan ${name}"` : ''}`}
            />
            <p className="mt-1 truncate text-[11px] text-jade-400">{img.url}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Lên trên"
              className="grid h-7 w-7 place-items-center rounded-md text-jade-500 hover:bg-jade-100 disabled:opacity-30 dark:hover:bg-jade-800"><ChevronUp size={15} /></button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Xuống dưới"
              className="grid h-7 w-7 place-items-center rounded-md text-jade-500 hover:bg-jade-100 disabled:opacity-30 dark:hover:bg-jade-800"><ChevronDown size={15} /></button>
            <button type="button" onClick={() => remove(i)} title="Bỏ ảnh"
              className="grid h-7 w-7 place-items-center rounded-md text-jade-400 hover:bg-red-50 hover:text-red-600"><X size={14} /></button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-jade-200 text-sm text-jade-400 hover:border-jade-400 hover:text-jade-600 dark:border-jade-700"
      >
        <Plus size={18} /> Thêm ảnh minh hoạ
      </button>
      <p className="text-xs text-jade-400">
        Chú thích hiện ngay dưới ảnh ở trang chi tiết. Ảnh không chụp đúng địa điểm thì nên ghi rõ
        trong chú thích để du khách không hiểu nhầm.
      </p>

      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(urls) => onChange([...items, ...urls.map((url) => ({ url, caption: '' }))])}
        mode="multiple"
      />
    </div>
  );
}

/**
 * Toạ độ cho bản đồ số.
 *
 * Bản trước CHỈ có hai hộp số, bắt gõ tay 5 chữ số thập phân — và kết quả là
 * 12/13 di tích không có toạ độ, tức bản đồ số gần như trống ở đúng loại nội dung
 * quan trọng nhất. Nay mặc định là bấm lên bản đồ; hai hộp số vẫn giữ cho ai muốn
 * dán toạ độ chính xác từ nguồn khác.
 *
 * Truyền `name` / `address` / `ward` xuống để nút "Dò từ địa chỉ" có gì mà tra.
 * Nạp trễ bản đồ: Leaflet không được nằm trong gói khởi động của khu quản trị.
 */
export function LatLngField({ lat, lng, onChange, name, address, ward, estimated, onEstimatedChange }) {
  const [moBanDo, setMoBanDo] = useState(() => lat == null || lng == null);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vĩ độ (lat)">
          <Number_ value={lat} onChange={(v) => onChange({ lat: v, lng })} step="0.00001" placeholder="21.04330" />
        </Field>
        <Field label="Kinh độ (lng)">
          <Number_ value={lng} onChange={(v) => onChange({ lat, lng: v })} step="0.00001" placeholder="106.55440" />
        </Field>
      </div>

      <button type="button" onClick={() => setMoBanDo((v) => !v)} className="btn-ghost btn-sm mt-2">
        <MapPin size={14} /> {moBanDo ? 'Ẩn bản đồ' : 'Chọn trên bản đồ'}
      </button>

      {moBanDo && (
        <div className="mt-2">
          <Suspense fallback={<div className="grid h-[300px] place-items-center rounded-xl bg-jade-50 text-sm text-jade-500 dark:bg-jade-900/40">Đang tải bản đồ…</div>}>
            <MapPicker
              lat={lat}
              lng={lng}
              name={name}
              address={address}
              ward={ward}
              onPick={onChange}
            />
          </Suspense>
        </div>
      )}

      {/* Cờ "chưa xác minh" phải sửa được ngay tại đây: script dò toạ độ đặt cờ
          này, và người kiểm tra thực địa cần một chỗ để bỏ nó sau khi đã kéo ghim
          cho đúng. Không có chỗ bỏ thì mọi ghim sẽ mãi mang nhãn ước tính. */}
      {onEstimatedChange && lat != null && lng != null && (
        <div className="mt-3">
          <Toggle
            value={estimated}
            onChange={onEstimatedChange}
            label="Toạ độ chưa xác minh (do máy dò theo địa chỉ)"
          />
          {estimated && (
            <p className="mt-1 text-xs text-gold-700 dark:text-gold-300">
              Bản đồ công khai vẽ ghim này bằng nét đứt và có ghi chú. Sau khi kéo ghim đúng vị trí thực
              địa, hãy tắt công tắc này.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
