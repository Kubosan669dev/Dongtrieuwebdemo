import { useState } from 'react';
import { X, ImagePlus, Plus, MapPin } from 'lucide-react';
import MediaPicker from './MediaPicker.jsx';
import { mapEmbedUrl, cx } from '../../lib/format.js';

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

/** Chọn nhiều ảnh (gallery). */
export function GalleryField({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={i} className="relative">
            <img src={url} alt="" className="h-24 w-24 rounded-lg object-cover ring-1 ring-jade-200" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white"><X size={12} /></button>
          </div>
        ))}
        <button type="button" onClick={() => setOpen(true)} className="grid h-24 w-24 place-items-center rounded-lg border-2 border-dashed border-jade-200 text-jade-400 hover:border-jade-400 dark:border-jade-700"><Plus size={22} /></button>
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} onSelect={(urls) => onChange([...(value || []), ...urls])} mode="multiple" />
    </div>
  );
}

/** Toạ độ lat/lng + xem thử trên bản đồ. */
export function LatLngField({ lat, lng, onChange }) {
  const [preview, setPreview] = useState(false);
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
      {lat != null && lng != null && (
        <button type="button" onClick={() => setPreview((v) => !v)} className="btn-ghost mt-2 !py-2 text-xs">
          <MapPin size={14} /> {preview ? 'Ẩn' : 'Xem thử trên bản đồ'}
        </button>
      )}
      {preview && lat != null && lng != null && (
        <iframe title="preview" src={mapEmbedUrl({ lat, lng })} className="mt-2 h-56 w-full rounded-xl" style={{ border: 0 }} loading="lazy" />
      )}
    </div>
  );
}
