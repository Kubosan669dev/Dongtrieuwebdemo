import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Check, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useMedia, useUpload } from './MediaPicker.jsx';
import { Spinner, EmptyState } from '../../components/ui.jsx';
import { formatDate } from '../../lib/format.js';

export default function MediaAdmin() {
  const { data, isLoading } = useMedia();
  const upload = useUpload();
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [editAlt, setEditAlt] = useState(null);
  const [altText, setAltText] = useState('');

  const items = data?.items ?? [];

  const onFiles = async (e) => {
    if (e.target.files?.length) await upload.mutateAsync(e.target.files);
    e.target.value = '';
  };

  const del = async (id) => {
    if (!confirm('Xoá ảnh này? Thao tác không thể hoàn tác.')) return;
    await api.del(`/media/${id}`);
    qc.invalidateQueries({ queryKey: ['media'] });
  };

  const saveAlt = async (id) => {
    await api.patch(`/media/${id}`, { alt: altText });
    qc.invalidateQueries({ queryKey: ['media'] });
    setEditAlt(null);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Thư viện ảnh</h1>
          <p className="mt-1 text-sm text-muted">{items.length} ảnh · tối đa 8MB mỗi ảnh, tự nén sang WebP.</p>
        </div>
        <button onClick={() => fileRef.current?.click()} className="btn-primary" disabled={upload.isPending}>
          <Upload size={16} /> {upload.isPending ? 'Đang tải…' : 'Tải ảnh lên'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      </div>

      {isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState title="Chưa có ảnh nào" description="Nhấn “Tải ảnh lên” để bắt đầu." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((m) => (
            <div key={m.id} className="card overflow-hidden">
              <div className="aspect-square bg-jade-100 dark:bg-jade-800">
                <img src={m.thumbUrl || m.url} alt={m.alt || m.filename} className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                {editAlt === m.id ? (
                  <div className="flex items-center gap-1">
                    <input value={altText} onChange={(e) => setAltText(e.target.value)} className="w-full rounded-md border border-jade-200 px-2 py-1 text-xs outline-none dark:border-jade-700 dark:bg-jade-900" placeholder="Mô tả ảnh…" />
                    <button onClick={() => saveAlt(m.id)} className="grid h-7 w-7 place-items-center rounded bg-jade-600 text-white"><Check size={13} /></button>
                    <button onClick={() => setEditAlt(null)} className="grid h-7 w-7 place-items-center rounded text-subtle"><X size={13} /></button>
                  </div>
                ) : (
                  <button onClick={() => { setEditAlt(m.id); setAltText(m.alt || ''); }} className="block w-full truncate text-left text-xs text-muted hover:text-jade-700">
                    {m.alt || m.filename}
                  </button>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-subtle">{formatDate(m.createdAt)}</span>
                  <button onClick={() => del(m.id)} className="grid h-7 w-7 place-items-center rounded-md text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
