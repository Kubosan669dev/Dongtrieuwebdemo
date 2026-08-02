// Lớp nền phủ của hộp thoại đóng được bằng cách bấm ra ngoài. Cố ý KHÔNG gắn
// thêm xử lý bàn phím lên lớp nền: bàn phím đã có hai lối thoát đúng chuẩn là
// phím Esc và nút đóng có thể Tab tới. Biến lớp nền thành phần tử hội tụ được
// chỉ thêm một chặng Tab vô nghĩa trước khi tới nội dung thật của hộp thoại.
/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, Check, Trash2, ImagePlus } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Spinner } from '../../components/ui.jsx';
import { cx } from '../../lib/format.js';

/** Lấy danh sách ảnh trong thư viện. */
export function useMedia() {
  return useQuery({ queryKey: ['media'], queryFn: () => api.get('/media?limit=200') });
}

/** Tải ảnh lên (FormData). */
export function useUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files) => {
      const fd = new FormData();
      [...files].forEach((f) => fd.append('files', f));
      return api.post('/media/upload', fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  });
}

/**
 * Modal chọn ảnh từ thư viện (hoặc tải lên mới).
 * @param {'single'|'multiple'} mode
 * @param {(urls:string[]|string)=>void} onSelect
 */
export default function MediaPicker({ open, onClose, onSelect, mode = 'single' }) {
  const { data, isLoading } = useMedia();
  const upload = useUpload();
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [picked, setPicked] = useState([]);

  if (!open) return null;
  const items = data?.items ?? [];

  const toggle = (url) => {
    if (mode === 'single') {
      onSelect(url);
      onClose();
      return;
    }
    setPicked((p) => (p.includes(url) ? p.filter((x) => x !== url) : [...p, url]));
  };

  // Trước đây hàm này tên là `confirm`, che mất `window.confirm` của trình duyệt.
  // Hậu quả: nút xoá ảnh bên dưới gọi nhầm vào đây — không xoá được ảnh nào, mà
  // còn lặng lẽ chèn danh sách đang chọn rồi đóng hộp thoại.
  const confirmSelection = () => {
    onSelect(picked);
    setPicked([]);
    onClose();
  };

  const onFiles = async (e) => {
    if (e.target.files?.length) await upload.mutateAsync(e.target.files);
    e.target.value = '';
  };

  const del = async (id) => {
    if (!window.confirm('Xoá ảnh này khỏi thư viện?')) return;
    await api.del(`/media/${id}`);
    qc.invalidateQueries({ queryKey: ['media'] });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Thư viện ảnh"
        className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-md bg-white shadow-lift dark:bg-jade-900"
      >
        <div className="flex items-center justify-between border-b border-jade-900/5 p-4 dark:border-white/5">
          <h3 className="font-serif text-lg font-semibold">Thư viện ảnh</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="btn-primary !py-2 text-sm" disabled={upload.isPending}>
              <Upload size={15} /> {upload.isPending ? 'Đang tải…' : 'Tải ảnh lên'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-jade-100 dark:hover:bg-jade-800"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-subtle">
              <ImagePlus size={40} />
              <p className="mt-2 text-sm">Chưa có ảnh nào. Hãy tải ảnh lên.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {items.map((m) => {
                const active = mode === 'multiple' && picked.includes(m.url);
                return (
                  <div key={m.id} className="group relative">
                    <button
                      onClick={() => toggle(m.url)}
                      className={cx('block aspect-square w-full overflow-hidden rounded-md ring-2 transition', active ? 'ring-jade-600' : 'ring-transparent hover:ring-jade-300')}
                    >
                      <img src={m.thumbUrl || m.url} alt={m.alt || m.filename} className="h-full w-full object-cover" />
                      {active && <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-jade-600 text-white"><Check size={14} /></span>}
                    </button>
                    <button onClick={() => del(m.id)} className="absolute left-1.5 top-1.5 hidden h-6 w-6 place-items-center rounded-full bg-red-600 text-white group-hover:grid" title="Xoá">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {mode === 'multiple' && (
          <div className="flex items-center justify-between border-t border-jade-900/5 p-4 dark:border-white/5">
            <span className="text-sm text-muted">Đã chọn {picked.length} ảnh</span>
            <button onClick={confirmSelection} className="btn-primary !py-2" disabled={picked.length === 0}>Thêm ảnh đã chọn</button>
          </div>
        )}
      </div>
    </div>
  );
}
