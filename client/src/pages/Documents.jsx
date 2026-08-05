import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download, FileText, Landmark, Search, ScrollText, X } from 'lucide-react';
import { fetchList } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import Seo from '../components/Seo.jsx';
import { Badge, EmptyState, FilterChip, SectionHeading } from '../components/ui.jsx';
import { useSettings } from '../hooks/useSettings.js';
// `deaccentLower` để người dân gõ "my cu" vẫn ra "Mỹ Cụ" — dùng chung một bản
// với ô tìm của các trang khác, không tự viết lại.
import { cx, deaccentLower } from '../lib/format.js';

/**
 * `/van-ban` — các quyết định xếp hạng di tích & phê duyệt dự án tu bổ.
 *
 * ── TRANG NÀY LÀ MỘT TRANG TRA CỨU, KHÔNG PHẢI MỘT TRANG GIỚI THIỆU ────────
 * Người vào đây đang cầm một việc cụ thể: chép số hiệu vào hồ sơ, kiểm xem ngôi
 * đình làng mình đã được xếp hạng chưa, tải bản scan để nộp kèm. Nên thứ tự ưu
 * tiên là số hiệu → ngày → trích yếu → tệp tải về, và bảng phải lọc được ngay
 * trên thanh địa chỉ (`?nhom=`, `?coQuan=`, `?q=`) để gửi đường dẫn cho nhau.
 *
 * ── CHỖ TRỐNG PHẢI HIỆN RA CHỨ KHÔNG ĐƯỢC LẤP ─────────────────────────────
 * Cả 13 bản đều là ảnh scan qua OCR, và OCR hỏng đúng ở ô số hiệu với ô ngày —
 * hai chỗ đóng dấu và viết tay. Số hiệu nào đọc không ra thì hiện thẳng "chưa
 * đọc được" kèm lý do, ngày nào chỉ còn tháng thì ghi "tháng 5/2017" chứ không
 * bịa ra ngày mùng 1. Người dân chép số hiệu từ đây đi làm giấy tờ: một con số
 * suy đoán còn tệ hơn một ô để trống có ghi rõ vì sao trống.
 *
 * ── VÀ NÓI RÕ ĐÂY KHÔNG PHẢI BẢN SAO Y ────────────────────────────────────
 * Bản đăng ở đây để tra cứu. Trích dẫn vào hồ sơ, thủ tục hay tranh chấp thì
 * phải xin bản chính hoặc bản sao y của cơ quan ban hành — `luuYPhapLy` nói
 * điều đó ngay đầu trang, không giấu xuống chân trang.
 */

/** Mảng rỗng dùng chung, để `useMemo` không mất hiệu lực khi dữ liệu chưa về. */
const RONG = [];

/** Nhãn màu theo nhóm văn bản. Chỉ hai tông đạt AA ở cả chín bảng màu. */
const TONE_NHOM = {
  'qg-dac-biet': 'gold',
  qg: 'jade',
  'cap-tinh': 'line',
  'tu-bo': 'line',
};

function ONho({ icon: Icon, nhan, giaTri }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-subtle">
        <Icon size={15} aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{nhan}</span>
      </div>
      <p className="mt-1.5 font-serif text-2xl font-bold text-jade-900 dark:text-jade-50">{giaTri}</p>
    </div>
  );
}

/**
 * Một văn bản.
 *
 * Cố ý KHÔNG dùng <table>: bảng tám cột của các cổng văn bản mẫu chỉ đọc được
 * trên màn hình rộng, còn phần lớn người dân vào bằng điện thoại thì phải cuộn
 * ngang để đọc hết một dòng. Ở đây mỗi văn bản là một thẻ tự xếp lại theo khổ
 * màn hình, giữ nguyên đủ các trường mà bảng kia có.
 */
function TheVanBan({ vb, nhom, coQuan, diTich }) {
  const chuaCoSoHieu = !vb.soHieu;

  return (
    <li className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p
            className={cx(
              'font-serif text-lg font-bold',
              chuaCoSoHieu ? 'italic text-subtle' : 'text-jade-900 dark:text-jade-50',
            )}
          >
            {vb.soHieu ?? vb.soHieuHienThi ?? 'Số hiệu chưa đọc được'}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {vb.loai} · {coQuan?.tenNgan ?? coQuan?.ten ?? '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {nhom && <Badge tone={TONE_NHOM[nhom.id] ?? 'line'}>{nhom.ten}</Badge>}
          {/* Ngày chỉ còn tháng thì nói ra là chỉ còn tháng. */}
          <span
            className={cx(
              'text-sm font-medium',
              vb.doChinhXacNgay === 'thang' ? 'text-subtle' : 'text-jade-800 dark:text-jade-100',
            )}
          >
            {vb.ngayHienThi}
          </span>
        </div>
      </div>

      <p className="mt-3 text-body">{vb.trichYeu}</p>

      {/* Di tích liên quan — đường dẫn thẳng sang hồ sơ bên cổng du lịch. */}
      {diTich.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Landmark size={14} className="shrink-0 text-subtle" aria-hidden="true" />
          <span className="text-subtle">Di tích:</span>
          {diTich.map((d) => (
            <Link
              key={d.slug}
              to={`/di-tich/${d.slug}`}
              className="font-medium text-jade-700 underline decoration-jade-700/30 underline-offset-2 hover:decoration-jade-700 dark:text-jade-200 dark:decoration-jade-200/30"
            >
              {d.name}
            </Link>
          ))}
        </p>
      )}

      <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {vb.nguoiKy && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-subtle">Người ký:</dt>
            <dd className="text-body">
              {vb.nguoiKy}
              {vb.chucVu && <span className="text-muted"> — {vb.chucVu}</span>}
            </dd>
          </div>
        )}
        {!vb.nguoiKy && vb.chucVu && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-subtle">Ký bởi:</dt>
            <dd className="text-muted">{vb.chucVu}</dd>
          </div>
        )}
      </dl>

      {vb.ghiChu && <p className="mt-3 text-sm text-muted">{vb.ghiChu}</p>}

      {/* Mâu thuẫn ngay trong bản gốc — phải bày ra, kèm căn cứ chọn mốc nào. */}
      {vb.mauThuan && (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-gold-50 p-3 text-sm ring-1 ring-inset ring-gold-500/25 dark:bg-gold-500/10">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" />
          <span className="text-muted">{vb.mauThuan}</span>
        </p>
      )}

      {/* Chi tiết dự án tu bổ — chỉ Quyết định 368 có. */}
      {vb.duAn && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-jade-700 dark:text-jade-200">
            Nội dung dự án tu bổ
          </summary>
          <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {[
              ['Chủ đầu tư', vb.duAn.chuDauTu],
              ['Nhà thầu lập dự án', vb.duAn.nhaThau],
              ['Kinh phí', vb.duAn.kinhPhi],
              ['Nguồn vốn', vb.duAn.nguonVon],
              ['Thời gian', vb.duAn.thoiGian],
              ['Diện tích', vb.duAn.dienTich],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="shrink-0 text-subtle">{k}:</dt>
                  <dd className="text-body">{v}</dd>
                </div>
              ))}
          </dl>
          {vb.duAn.hangMuc?.length > 0 && (
            <p className="mt-2 text-muted">
              <span className="text-subtle">Hạng mục:</span> {vb.duAn.hangMuc.join(' · ')}
            </p>
          )}
        </details>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-jade-900/[0.07] pt-4 dark:border-white/10">
        {/* `download` để trình duyệt tải thẳng thay vì cố mở .docx trong tab. */}
        <a href={`/van-ban/${vb.tep}`} download className="btn-ghost">
          <Download size={15} aria-hidden="true" />
          Tải bản scan
          <span className="sr-only"> {vb.soHieu ?? vb.trichYeu} (tệp .docx)</span>
        </a>
        <span className="text-xs text-subtle">.docx · bản scan</span>

        {vb.chuaDocDuoc?.length > 0 && (
          <span className="text-xs text-subtle">
            <span className="font-medium">Chưa đọc được trên bản scan:</span> {vb.chuaDocDuoc.join(', ')}
          </span>
        )}
      </div>
    </li>
  );
}

export default function Documents() {
  const settings = useSettings();
  const vb = settings.vanBan;
  const [params, setParams] = useSearchParams();

  const nhom = params.get('nhom') || '';
  const coQuan = params.get('coQuan') || '';
  const q = params.get('q') || '';

  /**
   * Hồ sơ di tích để lấy TÊN và đường dẫn. Cố ý không chặn hiển thị theo truy vấn
   * này: danh sách văn bản nằm trong `settings`, đã có sẵn: mạng chậm hay endpoint
   * lỗi thì các thẻ vẫn hiện đủ, chỉ thiếu dòng "Di tích:".
   */
  const { data: dt } = useQuery({
    queryKey: ['heritages', 'van-ban'],
    queryFn: () => fetchList('heritages'),
    staleTime: 10 * 60 * 1000,
  });

  const theoSlug = useMemo(() => {
    const m = new Map();
    for (const h of dt?.items ?? []) m.set(h.slug, h);
    return m;
  }, [dt]);

  // `?? RONG` chứ không `?? []`: mảng rỗng viết thẳng tại chỗ là một tham chiếu
  // mới mỗi lần render, nên `useMemo` bên dưới tính lại toàn bộ bộ lọc ở mọi
  // nhịp gõ phím — kể cả khi dữ liệu chưa về.
  const danhSach = vb?.danhSach ?? RONG;

  const locDuoc = useMemo(() => {
    const tim = deaccentLower(q).trim();
    return danhSach
      .filter((d) => (!nhom || d.nhom === nhom) && (!coQuan || d.coQuan === coQuan))
      .filter((d) => {
        if (!tim) return true;
        const kho = deaccentLower(
          [d.soHieu, d.trichYeu, d.ghiChu, d.nguoiKy, d.ngayHienThi, ...(d.diTich ?? [])].join(' '),
        );
        // Mọi tiếng người dùng gõ đều phải có mặt — gõ thêm chữ thì kết quả hẹp lại.
        return tim.split(/\s+/).every((t) => kho.includes(t));
      })
      .sort((a, b) => String(b.ngay).localeCompare(String(a.ngay)));
  }, [danhSach, nhom, coQuan, q]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  if (!vb) {
    return (
      <>
        <Seo title="Văn bản chỉ đạo" />
        <PageHero title="Văn bản chỉ đạo" breadcrumb={[{ label: 'Văn bản' }]} />
        <div className="container-page py-16">
          <EmptyState
            icon={ScrollText}
            title="Chưa có dữ liệu văn bản"
            description="Khoá cài đặt `vanBan` chưa được nạp. Chạy `npm run db:seed` rồi tải lại trang."
          />
        </div>
      </>
    );
  }

  const soXepHang = danhSach.filter((d) => d.nhom !== 'tu-bo').length;
  const dangLoc = nhom || coQuan || q;

  return (
    <>
      <Seo
        title="Văn bản chỉ đạo"
        description="Các quyết định xếp hạng di tích và phê duyệt dự án tu bổ trên địa bàn phường Đông Triều, tỉnh Quảng Ninh — tra cứu số hiệu, ngày ban hành, cơ quan ban hành và tải bản scan."
      />
      <PageHero
        title="Văn bản chỉ đạo"
        description="Quyết định xếp hạng di tích và phê duyệt dự án tu bổ trên địa bàn phường Đông Triều."
        breadcrumb={[{ label: 'Văn bản' }]}
      />

      <div className="container-page py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          <ONho icon={ScrollText} nhan="Văn bản đang có" giaTri={danhSach.length} />
          <ONho icon={Landmark} nhan="Quyết định xếp hạng" giaTri={soXepHang} />
          <ONho icon={FileText} nhan="Được viện dẫn, chưa có bản" giaTri={vb.thieu?.length ?? 0} />
        </div>

        {/* ── Hai lời rào, đặt trên đầu chứ không giấu xuống chân trang ── */}
        {vb.luuYPhapLy && (
          <p className="card mt-4 flex items-start gap-2.5 p-5 text-sm ring-2 ring-gold-500/25">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" />
            <span className="text-muted">
              <strong className="text-jade-900 dark:text-jade-50">Đây không phải bản sao y.</strong>{' '}
              {vb.luuYPhapLy}
            </span>
          </p>
        )}

        {/* ── Bộ lọc ── */}
        <div className="mt-10 space-y-4">
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Tìm theo số hiệu, tên di tích, người ký…"
              aria-label="Tìm văn bản"
              className="w-full rounded-md border border-jade-900/[0.12] bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-jade-500 focus:ring-2 focus:ring-jade-500/20 dark:border-white/10 dark:bg-jade-900/50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip active={!nhom} onClick={() => setParam('nhom', '')}>
              Tất cả
            </FilterChip>
            {(vb.nhom ?? []).map((n) => (
              <FilterChip key={n.id} active={nhom === n.id} onClick={() => setParam('nhom', n.id)}>
                {n.ten}
              </FilterChip>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip active={!coQuan} onClick={() => setParam('coQuan', '')} tone="gold">
              Mọi cơ quan
            </FilterChip>
            {(vb.coQuan ?? []).map((c) => (
              <FilterChip key={c.id} active={coQuan === c.id} onClick={() => setParam('coQuan', c.id)} tone="gold">
                {c.tenNgan ?? c.ten}
              </FilterChip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>
              {locDuoc.length === danhSach.length
                ? `${danhSach.length} văn bản`
                : `${locDuoc.length} / ${danhSach.length} văn bản`}
            </span>
            {dangLoc && (
              <button
                type="button"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
                className="inline-flex items-center gap-1 font-medium text-jade-700 hover:underline dark:text-jade-200"
              >
                <X size={14} aria-hidden="true" />
                Bỏ lọc
              </button>
            )}
          </div>
        </div>

        {/* ── Danh sách ── */}
        {locDuoc.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={Search}
              title="Không có văn bản nào khớp"
              description="Thử bỏ bớt điều kiện lọc, hoặc tìm bằng số hiệu như “597” hay tên di tích như “Mỹ Cụ”."
            />
          </div>
        ) : (
          <ul className="mt-8 grid gap-4">
            {locDuoc.map((d) => (
              <TheVanBan
                key={d.id}
                vb={d}
                nhom={(vb.nhom ?? []).find((n) => n.id === d.nhom)}
                coQuan={(vb.coQuan ?? []).find((c) => c.id === d.coQuan)}
                diTich={(d.diTich ?? []).map((s) => theoSlug.get(s)).filter(Boolean)}
              />
            ))}
          </ul>
        )}

        {/* ── Văn bản được viện dẫn mà cổng không có ── */}
        {vb.thieu?.length > 0 && (
          <section className="mt-16">
            <SectionHeading
              eyebrow="Còn thiếu"
              title="Văn bản được viện dẫn nhưng chưa có bản scan"
              description="Hai quyết định dưới đây được nhắc tới ngay trong các văn bản ở trên, nhưng không nằm trong bộ hồ sơ phường đang giữ."
            />
            <ul className="grid gap-4 lg:grid-cols-2">
              {vb.thieu.map((t) => (
                <li key={t.soHieu} className="card border-dashed p-5">
                  <p className="font-serif text-base font-semibold text-jade-900 dark:text-jade-50">{t.soHieu}</p>
                  <p className="mt-1 text-sm text-body">{t.viec}</p>
                  <p className="mt-2 text-sm text-subtle">{t.biet}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Nguồn & giới hạn ── */}
        <section className="mt-16">
          <div className="card p-6">
            <h2 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">Nguồn & giới hạn</h2>
            {vb.canhBaoOcr && <p className="mt-2 text-sm text-muted">{vb.canhBaoOcr}</p>}
            <p className="mt-4 text-xs text-subtle">
              {vb.nguon ? `Nguồn: ${vb.nguon}. ` : ''}
              {vb.capNhat ? `Cập nhật: ${vb.capNhat}.` : ''}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
