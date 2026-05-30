import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, Badge, PageHeader, EmptyState, Spinner, fmt, apiFetch } from '../ui';
import { useTranslation } from '../../context/LanguageContext';

export default function CaretakerDashboard() {
  const t = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiFetch('/api/caretaker/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return null;

  return (
    <div className="animate-up space-y-6">
      <PageHeader title={t.dashboard} subtitle={t.mogadishuPropertyManagement} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-display font-bold mb-4">{t.properties}</h3>
          {data.properties?.map((p) => (
            <div key={p.id} className="flex justify-between py-2 border-b border-border/50 text-sm">
              <span className="font-semibold">{p.name}</span>
              <span className="text-text-3">{p.occupied_units}/{p.total_units} {t.occupied.toLowerCase()}</span>
            </div>
          ))}
          {!data.properties?.length && <EmptyState title={t.noDataFound} />}
        </Card>
        <Card>
          <div className="flex justify-between mb-4">
            <h3 className="font-display font-bold">{t.maintenance}</h3>
            <button type="button" className="text-xs text-accent" onClick={() => router.push('/maintenance')}>
              View all →
            </button>
          </div>
          {data.openMaintenance?.map((m) => (
            <div
              key={m.id}
              className="p-3 mb-2 bg-surface rounded-sm border border-border cursor-pointer"
              onClick={() => router.push(`/maintenance/${m.id}`)}
            >
              <div className="font-semibold text-sm">{m.title}</div>
              <div className="text-xs text-text-3">{m.property_name} · {m.unit_number}</div>
              <Badge status={m.status} compact className="mt-1" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
