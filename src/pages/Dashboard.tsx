import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase, type Ceba, type Ficha } from '../lib/supabase';
import { EstadoBadge } from './UploadFicha';

export default function Dashboard() {
  const [cebas, setCebas] = useState<Ceba[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setError(null);
    const [cebasRes, fichasRes] = await Promise.all([
      supabase.from('cebas').select('*').order('nombre'),
      supabase.from('fichas_monitoreo').select('*').order('created_at', { ascending: false }),
    ]);
    if (cebasRes.error || fichasRes.error) {
      setError('No se pudo cargar la información. Revisa tu conexión e intenta de nuevo.');
      setLoading(false);
      return;
    }
    setCebas((cebasRes.data as Ceba[]) ?? []);
    setFichas((fichasRes.data as Ficha[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const porCeba = useMemo(() => {
    return cebas.map((c) => {
      const propias = fichas.filter((f) => f.ceba_id === c.id);
      const observadas = propias.filter((f) => f.estado === 'Observado').length;
      return {
        ceba: c,
        total: propias.length,
        observadas,
        estado: propias.length === 0 ? 'Pendiente' : observadas > 0 ? 'Observado' : 'Recibido',
      };
    });
  }, [cebas, fichas]);

  const totales = useMemo(() => {
    const recibidos = porCeba.filter((c) => c.estado === 'Recibido').length;
    const observados = porCeba.filter((c) => c.estado === 'Observado').length;
    const pendientes = porCeba.filter((c) => c.estado === 'Pendiente').length;
    const avance = cebas.length ? Math.round(((recibidos + observados) / cebas.length) * 100) : 0;
    return { recibidos, observados, pendientes, avance };
  }, [porCeba, cebas.length]);

  const chartData = porCeba
    .map((c) => ({ nombre: c.ceba.codigo, fichas: c.total }))
    .sort((a, b) => b.fichas - a.fichas);

  if (loading) return <p className="p-6 text-slate-500 text-sm">Cargando dashboard...</p>;
  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-danger-600 mb-3">{error}</p>
        <button onClick={cargar} className="rounded-lg bg-brand-700 text-white text-sm px-4 py-2">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Panel de monitoreo — AGEBATP</h1>
        <p className="text-sm text-slate-500">Avance de las 17 CEBA en tiempo real</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="CEBA con fichas" value={totales.recibidos + totales.observados} suffix={`/ ${cebas.length}`} />
        <StatCard label="Pendientes" value={totales.pendientes} tone="warn" />
        <StatCard label="Observadas" value={totales.observados} tone="danger" />
        <StatCard label="% de avance" value={`${totales.avance}%`} tone="brand" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Fichas recibidas por CEBA</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="fichas" fill="#0f766e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        <div className="p-4 grid grid-cols-[1fr_auto_auto] gap-4 text-xs font-semibold text-slate-400 uppercase">
          <span>CEBA / Director</span>
          <span>Fichas</span>
          <span>Estado</span>
        </div>
        {porCeba.map(({ ceba, total, estado }) => (
          <div key={ceba.id} className="p-4 grid grid-cols-[1fr_auto_auto] gap-4 items-center text-sm">
            <div>
              <p className="font-medium text-slate-800">{ceba.nombre}</p>
              <p className="text-slate-500">{ceba.director_nombre}</p>
            </div>
            <span className="text-slate-600">{total}</span>
            <EstadoBadge estado={estado as Ficha['estado']} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  suffix?: string;
  tone?: 'default' | 'warn' | 'danger' | 'brand';
}) {
  const toneClass = {
    default: 'text-slate-900',
    warn: 'text-accent-600',
    danger: 'text-danger-600',
    brand: 'text-brand-700',
  }[tone];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${toneClass}`}>
        {value} {suffix && <span className="text-sm text-slate-400 font-normal">{suffix}</span>}
      </p>
    </div>
  );
}
