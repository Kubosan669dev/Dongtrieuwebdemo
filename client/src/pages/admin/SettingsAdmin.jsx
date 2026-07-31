import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Spinner } from '../../components/ui.jsx';
import { Field, Text, Textarea, Number_ } from './fields.jsx';

export default function SettingsAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings') });
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  // Nạp bản nháp từ dữ liệu máy chủ khi câu truy vấn trả về lần đầu, và mỗi khi
  // máy chủ trả về bản mới. Đặt state ngay trong render (mẫu "state phái sinh")
  // thay vì trong useEffect: qua effect thì có một nhịp form còn rỗng bị vẽ ra
  // trước, người dùng thấy các ô trắng loé lên rồi mới có giá trị.
  const [loadedFrom, setLoadedFrom] = useState(null);
  if (data?.settings && data.settings !== loadedFrom) {
    setLoadedFrom(data.settings);
    setForm(structuredClone(data.settings));
  }

  const save = useMutation({
    mutationFn: async () => {
      // Lưu từng khoá
      await Promise.all(
        ['contact', 'social', 'weather', 'tide', 'seo'].map((key) =>
          api.put(`/settings/${key}`, { value: form[key] }),
        ),
      );
      // `about` lưu riêng: biểu mẫu này chỉ sửa `intro`, còn `sections` (bài giới
      // thiệu dài ở trang /gioi-thieu) phải giữ nguyên. Gửi thiếu `sections` là
      // xoá trắng nội dung trang đó.
      await api.put('/settings/about', {
        value: { intro: form.about?.intro ?? '', sections: form.about?.sections ?? [] },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (isLoading || !form) return <Spinner />;

  const setField = (group, key, value) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }));

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Cài đặt chung</h1>
          <p className="mt-1 text-sm text-jade-500">Thông tin liên hệ, mạng xã hội và cấu hình dự báo.</p>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary disabled:opacity-60">
          <Save size={16} /> {save.isPending ? 'Đang lưu…' : saved ? 'Đã lưu ✓' : 'Lưu thay đổi'}
        </button>
      </div>

      <div className="space-y-6">
        <Card title="Thông tin liên hệ">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên đơn vị"><Text value={form.contact?.name} onChange={(v) => setField('contact', 'name', v)} /></Field>
            <Field label="Điện thoại"><Text value={form.contact?.phone} onChange={(v) => setField('contact', 'phone', v)} /></Field>
            <Field label="Email"><Text value={form.contact?.email} onChange={(v) => setField('contact', 'email', v)} /></Field>
            <Field label="Địa chỉ"><Text value={form.contact?.address} onChange={(v) => setField('contact', 'address', v)} /></Field>
          </div>
        </Card>

        <Card title="Mạng xã hội">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Facebook"><Text value={form.social?.facebook} onChange={(v) => setField('social', 'facebook', v)} /></Field>
            <Field label="YouTube"><Text value={form.social?.youtube} onChange={(v) => setField('social', 'youtube', v)} /></Field>
            <Field label="Zalo"><Text value={form.social?.zalo} onChange={(v) => setField('social', 'zalo', v)} /></Field>
          </div>
        </Card>

        <Card title="Toạ độ dự báo thời tiết">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Vĩ độ"><Number_ value={form.weather?.lat} onChange={(v) => setField('weather', 'lat', v)} step="0.0001" /></Field>
            <Field label="Kinh độ"><Number_ value={form.weather?.lon} onChange={(v) => setField('weather', 'lon', v)} step="0.0001" /></Field>
            <Field label="Nhãn hiển thị"><Text value={form.weather?.label} onChange={(v) => setField('weather', 'label', v)} /></Field>
          </div>
        </Card>

        <Card title="Toạ độ tham chiếu triều cường">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Vĩ độ"><Number_ value={form.tide?.lat} onChange={(v) => setField('tide', 'lat', v)} step="0.0001" /></Field>
            <Field label="Kinh độ"><Number_ value={form.tide?.lon} onChange={(v) => setField('tide', 'lon', v)} step="0.0001" /></Field>
            <Field label="Nhãn hiển thị"><Text value={form.tide?.label} onChange={(v) => setField('tide', 'label', v)} /></Field>
          </div>
          <p className="mt-2 text-xs text-jade-400">Lưu ý: toạ độ Đông Triều nằm ngoài lưới hải văn của Open-Meteo. Nên giữ điểm cửa Nam Triệu – Bạch Đằng (~20.70, 106.80) để có dữ liệu triều.</p>
        </Card>

        <Card title="Giới thiệu ngắn ở trang chủ">
          <Field
            label="Đoạn mở đầu"
            hint="Hai đến ba câu, hiện ngay dưới thanh tìm kiếm cùng dải số liệu. Bài giới thiệu dài ở trang /gioi-thieu không đổi theo ô này."
          >
            <Textarea value={form.about?.intro} onChange={(v) => setField('about', 'intro', v)} rows={4} maxLength={2000} />
          </Field>
        </Card>

        <Card title="SEO">
          <Field
            label="Tên site trong tiêu đề trang"
            hint='Hiện sau tên trang con: "Lễ hội — <tên này>". Để trống thì dùng "Khám phá Đông Triều".'
          >
            <Text value={form.seo?.title} onChange={(v) => setField('seo', 'title', v)} />
          </Field>
          <Field
            label="Mô tả mặc định"
            hint="Dùng cho thẻ mô tả và ảnh xem trước khi chia sẻ link, ở những trang không có mô tả riêng."
          >
            <Textarea value={form.seo?.description} onChange={(v) => setField('seo', 'description', v)} rows={3} />
          </Field>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="card p-6">
      <h2 className="mb-4 font-serif text-lg font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
