import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Search, Eye, EyeOff } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Spinner } from '../../components/ui.jsx';

/**
 * Trang quản lý CRUD dùng chung cho mọi loại tài nguyên.
 *
 * @param {object} p
 * @param {string} p.title
 * @param {string} p.resource          tên endpoint, vd 'heritages'
 * @param {Array}  p.columns           [{key, label, render?}]
 * @param {(item,setField)=>JSX} p.renderForm  form chỉnh sửa
 * @param {()=>object} p.emptyItem      giá trị mặc định khi tạo mới
 * @param {(item)=>object} [p.toPayload] chuyển item → payload gửi API
 * @param {boolean} [p.searchable]
 */
export default function ResourceManager({ title, description, resource, columns, renderForm, emptyItem, toPayload = (x) => x, searchable = true }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // item đang sửa (hoặc emptyItem khi tạo)
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', resource],
    queryFn: () => api.get(`/${resource}?all=1`),
  });

  const save = useMutation({
    mutationFn: (item) => {
      const payload = toPayload(item);
      return item.id ? api.patch(`/${resource}/${item.id}`, payload) : api.post(`/${resource}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', resource] });
      qc.invalidateQueries({ queryKey: [resource] });
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => api.del(`/${resource}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', resource] }),
  });

  const items = (data?.items ?? []).filter((it) =>
    !search ? true : JSON.stringify(it).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        <button onClick={() => setEditing(emptyItem())} className="btn-primary"><Plus size={16} /> Thêm mới</button>
      </div>

      {searchable && (
        <div className="mb-4 flex max-w-sm items-center gap-2 rounded-md bg-white px-4 shadow-soft ring-1 ring-jade-900/5 dark:bg-jade-900/50">
          <Search size={16} className="text-subtle" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm…" className="w-full bg-transparent py-2.5 text-sm outline-none" />
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-jade-900/5 text-left text-xs uppercase text-subtle dark:border-white/5">
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jade-900/5 dark:divide-white/5">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-jade-50/50 dark:hover:bg-jade-800/30">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 align-middle">{c.render ? c.render(it) : String(it[c.key] ?? '')}</td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(structuredClone(it))} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-jade-100 dark:hover:bg-jade-800" title="Sửa"><Pencil size={15} /></button>
                        <button onClick={() => { if (confirm(`Xoá "${it.name || it.title}"?`)) remove.mutate(it.id); }} className="grid h-8 w-8 place-items-center rounded-md text-red-500 hover:bg-red-50" title="Xoá"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && <p className="px-4 py-10 text-center text-sm text-subtle">Chưa có dữ liệu.</p>}
        </div>
      )}

      {editing && (
        <EditModal
          title={editing.id ? `Sửa: ${editing.name || editing.title || ''}` : `Thêm ${title.toLowerCase()}`}
          item={editing}
          renderForm={renderForm}
          onClose={() => setEditing(null)}
          onSave={(item) => save.mutate(item)}
          saving={save.isPending}
          error={save.error?.message}
        />
      )}
    </div>
  );
}

function EditModal({ title, item, renderForm, onClose, onSave, saving, error }) {
  const [draft, setDraft] = useState(item);
  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-md bg-white shadow-lift dark:bg-jade-900">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-md border-b border-jade-900/5 bg-white p-4 dark:border-white/5 dark:bg-jade-900">
          <h3 className="font-serif text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-jade-100 dark:hover:bg-jade-800"><X size={18} /></button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          {renderForm(draft, setField)}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-b-md border-t border-jade-900/5 p-4 dark:border-white/5">
          {error ? <p className="text-sm text-red-500">{error}</p> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">Huỷ</button>
            <button onClick={() => onSave(draft)} disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ô hiển thị trạng thái published trong bảng. */
export function PublishedBadge({ value }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-xs text-jade-600"><Eye size={13} /> Hiển thị</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-subtle"><EyeOff size={13} /> Ẩn</span>
  );
}
