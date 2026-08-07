import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Building2, CheckCircle2, Hourglass, AlertOctagon, PieChart } from 'lucide-react';
import { supabase, type Ceba, type Ficha } from '../lib/supabase';

const MESES = Array.from({ length: 12 }, (_, i) => `M${String(i + 1).padStart(2, '0')}`);

export default function Dashboard() {
  const [cebas, setCebas] = useState<Ceba[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroMonitoreo, setFiltroMonitoreo] = useState('');

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

  const fichasAlcance = useMemo(
    () => (filtroMonitoreo ? fichas.filter((f) => f.n_monitoreo === filtroMonitoreo) : fichas),
    [fichas, filtroMonitoreo]
  );

  const porCeba = useMemo(() => {
    return cebas.map((c) => {
      const propias = fichasAlcance.filter((f) => f.ceba_id === c.id);
      const observadas = propias.filter((f) => f.estado === 'Observado').length;
      return {
        ceba: c,
        total: propias.length,
        observadas,
        estado: propias.length === 0 ? 'Pendiente' : observadas > 0 ? 'Observado' : 'Recibido',
      };
    });
  }, [cebas, fichasAlcance]);

  const totales = useMemo(() => {
    const recibidos = fichasAlcance.filter((f) => f.estado === 'Recibido' || f.estado === 'Observado').length;
    const observados = fichasAlcance.filter((f) => f.estado === 'Observado').length;
    const cebasSinFicha = porCeba.filter((c) => c.total === 0).length;
    const cebasConAlMenosUna = porCeba.filter((c) => c.total > 0).length;
    const avance = cebas.length ? Math.round((cebasConAlMenosUna / cebas.length) * 100) : 0;
    return { recibidos, observados, cebasSinFicha, avance };
  }, [fichasAlcance, porCeba, cebas.length]);

  const chartData = porCeba
    .map((c) => ({ nombre: c.ceba.codigo, fichas: c.total }))
    .sort((a, b) => b.fichas - a.fichas);

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="p-6">
        <p className="text-body-sm text-error mb-3">{error}</p>
        <button onClick={cargar} className="rounded-md bg-primary text-on-primary text-label-md px-4 py-2">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-headline-lg text-on-surface mb-1">Dashboard de Monitoreo</h2>
          <p className="text-body-md text-on-surface-variant">
            {filtroMonitoreo ? `Solo ${filtroMonitoreo}` : 'Suma general de todos los monitoreos'} — AGEBATP, UGEL 06
          </p>
        </div>
        <div>
          <select
            value={filtroMonitoreo}
            onChange={(e) => setFiltroMonitoreo(e.target.value)}
            className="bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 h-9 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos los monitoreos (general)</option>
            {MESES.map((m) => (
              <option key={m} value={m}>
                Solo {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total CEBA" value={cebas.length} icon={Building2} iconClass="text-primary" sub="Instituciones asignadas" />
        <KpiCard
          label="Fichas Recibidas"
          value={totales.recibidos}
          icon={CheckCircle2}
          iconClass="text-secondary"
          sub={`de ${cebas.length} CEBA`}
        />
        <KpiCard
          label="CEBA sin ficha"
          value={totales.cebasSinFicha}
          icon={Hourglass}
          iconClass="text-tertiary"
          sub="Meta total aún sin definir (falta cronograma)"
          subClass="text-on-surface-variant"
        />
        <KpiCard
          label="Fichas Observadas"
          value={totales.observados}
          icon={AlertOctagon}
          iconClass="text-error"
          sub={totales.observados > 0 ? 'Con observaciones del especialista' : 'Ninguna observada'}
          subClass={totales.observados > 0 ? 'text-error' : 'text-secondary'}
        />
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <PieChart className="absolute right-0 bottom-0 opacity-10" size={100} />
          <div className="flex justify-between items-start mb-2 relative z-10">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wide">% Avance</span>
            <PieChart size={20} className="text-secondary-container" />
          </div>
          <div className="relative z-10">
            <div className="text-display-sm text-on-surface">{totales.avance}%</div>
            <div className="w-full bg-surface-variant rounded-full h-1.5 mt-2 mb-1">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${totales.avance}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col">
          <h3 className="text-headline-sm text-on-surface mb-4">Fichas subidas por CEBA</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.3} />
              <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="fichas" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="xl:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low/50">
            <h3 className="text-headline-sm text-on-surface">Resumen por CEBA</h3>
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-bright">
                <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant">
                  <th className="py-2 px-4 font-medium">CEBA</th>
                  <th className="py-2 px-4 font-medium text-center">Fichas</th>
                  <th className="py-2 px-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="text-body-sm">
                {porCeba.map(({ ceba, total, estado }) => (
                  <EstadoRow key={ceba.id} nombre={ceba.nombre} total={total} estado={estado} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconClass,
  sub,
  subClass,
}: {
  label: string;
  value: string | number;
  icon: typeof Building2;
  iconClass: string;
  sub: string;
  subClass?: string;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <span className="text-label-sm text-on-surface-variant uppercase tracking-wide">{label}</span>
        <Icon size={20} className={iconClass} />
      </div>
      <div>
        <div className="text-display-sm text-on-surface">{value}</div>
        <div className={`text-label-md mt-1 ${subClass ?? 'text-on-surface-variant'}`}>{sub}</div>
      </div>
    </div>
  );
}

const ESTADO_DOT: Record<string, string> = {
  Recibido: 'bg-[#16a34a]',
  Pendiente: 'bg-[#ca8a04]',
  Observado: 'bg-error',
};

const ESTADO_LABEL: Record<string, string> = {
  Recibido: 'Al día',
  Pendiente: 'Sin ficha',
  Observado: 'Observado',
};

function EstadoRow({ nombre, total, estado }: { nombre: string; total: number; estado: string }) {
  return (
    <tr className="border-b border-outline-variant hover:bg-surface-variant/30 transition-colors">
      <td className="py-3 px-4 text-on-surface font-medium">{nombre}</td>
      <td className="py-3 px-4 text-center text-on-surface-variant">{total}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${ESTADO_DOT[estado]}`} />
          <span className={`text-[11px] font-medium uppercase ${estado === 'Observado' ? 'text-error' : 'text-on-surface-variant'}`}>
            {ESTADO_LABEL[estado]}
          </span>
        </div>
      </td>
    </tr>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-64 rounded skeleton-loader" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl skeleton-loader" />
        ))}
      </div>
      <div className="h-72 rounded-xl skeleton-loader" />
    </div>
  );
}
