import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Navigation, Landmark, BedDouble } from 'lucide-react';
import { fetchList } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import { Spinner } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { HERITAGE_TYPES } from '../lib/constants.js';
import { mapEmbedUrl, mapDirectionsUrl, cx } from '../lib/format.js';

export default function MapPage() {
  const heritages = useQuery({ queryKey: ['heritages', 'map'], queryFn: () => fetchList('heritages') });
  const lodgings = useQuery({ queryKey: ['lodgings', 'map'], queryFn: () => fetchList('lodgings') });
  const [group, setGroup] = useState('heritage');
  const [selected, setSelected] = useState(null);

  const points = useMemo(() => {
    if (group === 'heritage') {
      return (heritages.data?.items ?? []).map((h) => ({
        id: h.id,
        name: h.name,
        sub: HERITAGE_TYPES[h.type]?.label,
        address: h.address,
        query: h.mapQuery || h.address,
        lat: h.lat,
        lng: h.lng,
      }));
    }
    return (lodgings.data?.items ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      sub: 'Lưu trú',
      address: l.address + ', phường Đông Triều, Quảng Ninh',
      query: l.name + ', ' + l.address + ', Đông Triều, Quảng Ninh',
      lat: l.lat,
      lng: l.lng,
    }));
  }, [group, heritages.data, lodgings.data]);

  const active = selected || points[0];

  return (
    <div>
      <Seo title="Bản đồ du lịch" description="Bản đồ các di tích và cơ sở lưu trú của phường Đông Triều với chỉ đường Google Maps." />
      <PageHero
        title="Bản đồ du lịch Đông Triều"
        description="Chọn một điểm để xem trên bản đồ và lấy chỉ đường."
        breadcrumb={[{ label: 'Bản đồ' }]}
      />

      <div className="container-page py-10">
        <div className="mb-6 flex gap-2">
          <GroupBtn active={group === 'heritage'} onClick={() => { setGroup('heritage'); setSelected(null); }} icon={Landmark}>
            Di tích ({heritages.data?.items?.length ?? 0})
          </GroupBtn>
          <GroupBtn active={group === 'lodging'} onClick={() => { setGroup('lodging'); setSelected(null); }} icon={BedDouble}>
            Lưu trú ({lodgings.data?.items?.length ?? 0})
          </GroupBtn>
        </div>

        {heritages.isLoading ? (
          <Spinner />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Danh sách điểm */}
            <div className="no-scrollbar max-h-[560px] space-y-2 overflow-y-auto lg:col-span-1">
              {points.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={cx(
                    'flex w-full items-start gap-3 rounded-xl p-3 text-left transition',
                    active?.id === p.id
                      ? 'bg-jade-600 text-white shadow-soft'
                      : 'bg-white ring-1 ring-jade-900/5 hover:bg-jade-50 dark:bg-jade-900/40 dark:ring-white/5 dark:hover:bg-jade-800/50',
                  )}
                >
                  <MapPin size={17} className={cx('mt-0.5 shrink-0', active?.id === p.id ? 'text-gold-300' : 'text-jade-400')} />
                  <div>
                    <p className="text-sm font-semibold leading-snug">{p.name}</p>
                    <p className={cx('mt-0.5 text-xs', active?.id === p.id ? 'text-jade-100/80' : 'text-jade-500')}>
                      {p.sub} · {p.address}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Bản đồ */}
            <div className="lg:col-span-2">
              {active && (
                <div className="overflow-hidden rounded-2xl shadow-soft ring-1 ring-jade-900/10 dark:ring-white/10">
                  <iframe
                    key={active.id}
                    title={active.name}
                    src={mapEmbedUrl({ lat: active.lat, lng: active.lng, query: active.query })}
                    width="100%"
                    height={480}
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                  <div className="flex items-center justify-between gap-3 bg-white p-4 dark:bg-jade-900">
                    <div>
                      <p className="font-serif font-semibold text-jade-900 dark:text-jade-50">{active.name}</p>
                      <p className="text-sm text-jade-500">{active.address}</p>
                    </div>
                    <a href={mapDirectionsUrl({ lat: active.lat, lng: active.lng, query: active.query })} target="_blank" rel="noreferrer" className="btn-primary shrink-0 !py-2">
                      <Navigation size={15} /> Chỉ đường
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
        active ? 'bg-jade-600 text-white' : 'bg-white text-jade-700 ring-1 ring-jade-200 hover:bg-jade-50 dark:bg-jade-900/50 dark:text-jade-100 dark:ring-jade-700',
      )}
    >
      <Icon size={15} /> {children}
    </button>
  );
}
