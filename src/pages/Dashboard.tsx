import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Building2, CheckCircle2, Hourglass, AlertOctagon, PieChart, X } from "lucide-react";
import { supabase, type Ceba, type Ficha, type Monitoreo } from "../lib/supabase";
import { Card, Select, Skeleton, Alert, Button, PageHeader } from "../components/ui";

export default function Dashboard() {
  const [cebas, setCebas] = useState<Ceba[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [monitoreos, setMonitoreos] = useState<Monitoreo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroMonitoreo, setFiltroMonitoreo] = useState("");
  const [cebaSeleccionada, setCebaSeleccionada] = useState<string | null>(null);

  async function cargar() {
    setError(null);
    const [cebasRes, fichasRes, monitoreosRes] = await Promise.all([
      supabase.from("cebas").select("*").order("nombre"),
      supabase.from("fichas_monitoreo").select("*").order("created_at", { ascending: false }),
      supabase.from("monitoreos_pedagogicos").select("*").order("orden"),
    ]);
    if (cebasRes.error || fichasRes.error || monitoreosRes.error) {
      setError("No se pudo cargar la información. Revisa tu conexión e intenta de nuevo.");
      setLoading(false);
      return;
    }
    setCebas((cebasRes.data as Ceba[]) ?? []);
    setFichas((fichasRes.data as Ficha[]) ?? []);
    setMonitoreos((monitoreosRes.data as Monitoreo[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const fichasAlcance = useMemo(
    () => (filtroMonitoreo ? fichas.filter((f) => f.monitoreo_id === filtroMonitoreo) : fichas),
    [fichas, filtroMonitoreo]
  );

  const porCeba = useMemo(() => {
    return cebas.map((c) => {
      const propias = fichasAlcance.filter((f) => f.ceba_id === c.id);
      const observadas = propias.filter((f) => f.estado === "Observado").length;
      return {
        ceba: c,
        total: propias.length,
        observadas,
        estado: propias.length === 0 ? "Pendiente" : observadas > 0 ? "Observado" : "Recibido",
      };
    });
  }, [cebas, fichasAlcance]);

  const cebaActiva = useMemo(() => cebas.find((c) => c.id === cebaSeleccionada) ?? null, [cebas, cebaSeleccionada]);

  const fichasEnfoque = useMemo(
    () => (cebaSeleccionada ? fichasAlcance.filter((f) => f.ceba_id === cebaSeleccionada) : fichasAlcance),
    [fichasAlcance, cebaSeleccionada]
  );

  const totales = useMemo(() => {
    const recibidos = fichasEnfoque.filter((f) => f.estado === "Recibido" || f.estado === "Observado").length;
    const observados = fichasEnfoque.filter((f) => f.estado === "Observado").length;
    const cebasSinFicha = porCeba.filter((c) => c.total === 0).length;
    const cebasConAlMenosUna = porCeba.filter((c) => c.total > 0).length;
    const avance = cebas.length ? Math.round((cebasConAlMenosUna / cebas.length) * 100) : 0;
    return { recibidos, observados, cebasSinFicha, avance };
  }, [fichasEnfoque, porCeba, cebas.length]);

  const chartData = useMemo(() => {
    if (cebaActiva) {
      return monitoreos
        .map((m) => ({ nombre: m.codigo, fichas: fichasEnfoque.filter((f) => f.monitoreo_id === m.id).length }))
        .filter((d) => d.fichas > 0 || monitoreos.length <= 15);
    }
    return porCeba.map((c) => ({ nombre: c.ceba.codigo, fichas: c.total })).sort((a, b) => b.fichas - a.fichas);
  }, [cebaActiva, monitoreos, fichasEnfoque, porCeba]);

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="space-y-3">
        <Alert variant="error">{error}</Alert>
        <Button onClick={cargar}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard de Monitoreo"
        description={`${filtroMonitoreo ? `Solo ${monitoreos.find((m) => m.id === filtroMonitoreo)?.nombre ?? ""}` : "Suma general de todos los monitoreos"}${cebaActiva ? ` — filtrado a ${cebaActiva.codigo} · ${cebaActiva.nombre}` : ""} — AGEBATP, UGEL 06`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {cebaActiva && (
              <Button size="sm" variant="secondary" type="button" onClick={() => setCebaSeleccionada(null)} className="gap-1.5">
                <X className="size-3.5" />
                Quitar filtro de CEBA
              </Button>
            )}
            <Select value={filtroMonitoreo} onChange={(e) => setFiltroMonitoreo(e.target.value)} className="w-full sm:w-auto">
              <option value="">Todos los monitoreos (general)</option>
              {monitoreos.map((m) => (
                <option key={m.id} value={m.id}>
                  Solo {m.nombre}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Total CEBA" value={cebas.length} icon={Building2} iconClass="text-[var(--brand)]" sub="Instituciones asignadas" />
        <KpiCard label="Fichas Recibidas" value={totales.recibidos} icon={CheckCircle2} iconClass="text-teal-600" sub={`de ${cebas.length} CEBA`} />
        <KpiCard
          label="CEBA sin ficha"
          value={totales.cebasSinFicha}
          icon={Hourglass}
          iconClass="text-amber-600"
          sub="Meta total aún sin definir (falta cronograma)"
        />
        <KpiCard
          label="Fichas Observadas"
          value={totales.observados}
          icon={AlertOctagon}
          iconClass="text-rose-600"
          sub={totales.observados > 0 ? "Con observaciones del especialista" : "Ninguna observada"}
          subClass={totales.observados > 0 ? "text-rose-600" : "text-emerald-600"}
        />
        <Card className="flex flex-col justify-between p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="mb-2 flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">% Avance</span>
            <PieChart className="size-5 text-teal-400" />
          </div>
          <div>
            <div className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{totales.avance}%</div>
            <div className="mb-1 mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-1.5 rounded-full bg-[var(--brand)] transition-[width] duration-500 ease-out" style={{ width: `${totales.avance}%` }} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="flex flex-col p-5 xl:col-span-2">
          <h3 className="mb-4 font-bold text-slate-900 dark:text-white">
            {cebaActiva ? `Fichas de ${cebaActiva.codigo} por monitoreo` : "Fichas subidas por CEBA"}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
              <Tooltip contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)", color: "var(--chart-tooltip-text)" }} />
              <Bar dataKey="fichas" fill="var(--brand)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="flex flex-col overflow-hidden xl:col-span-1">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <h3 className="font-bold text-slate-900 dark:text-white">Resumen por CEBA</h3>
          </div>
          <div className="table-scroll max-h-[420px] overflow-y-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="border-b border-slate-100 text-xs text-slate-400 dark:border-slate-800">
                  <th className="px-4 py-2 font-medium">CEBA</th>
                  <th className="px-4 py-2 text-center font-medium">Fichas</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {porCeba.map(({ ceba, total, estado }) => (
                  <EstadoRow
                    key={ceba.id}
                    nombre={ceba.nombre}
                    total={total}
                    estado={estado}
                    seleccionada={cebaSeleccionada === ceba.id}
                    onClick={() => setCebaSeleccionada((actual) => (actual === ceba.id ? null : ceba.id))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
    <Card className="flex flex-col justify-between p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="mb-2 flex items-start justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
        <Icon className={`size-5 ${iconClass}`} />
      </div>
      <div>
        <div className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</div>
        <div className={`mt-1 text-xs ${subClass ?? "text-slate-500 dark:text-slate-400"}`}>{sub}</div>
      </div>
    </Card>
  );
}

const ESTADO_DOT: Record<string, string> = {
  Recibido: "bg-emerald-500",
  Pendiente: "bg-amber-500",
  Observado: "bg-rose-500",
};

const ESTADO_LABEL: Record<string, string> = {
  Recibido: "Al día",
  Pendiente: "Sin ficha",
  Observado: "Observado",
};

function EstadoRow({
  nombre,
  total,
  estado,
  seleccionada,
  onClick,
}: {
  nombre: string;
  total: number;
  estado: string;
  seleccionada: boolean;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer border-b border-slate-100 transition-colors dark:border-slate-800 ${
        seleccionada ? "bg-teal-50 dark:bg-teal-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
      }`}
    >
      <td className={`px-4 py-3 font-medium ${seleccionada ? "text-[var(--brand)]" : "text-slate-800 dark:text-slate-200"}`}>
        <div className="flex items-center gap-2">
          <div className={`size-1.5 shrink-0 rounded-full ${seleccionada ? "bg-[var(--brand)]" : "bg-transparent"}`} />
          {nombre}
        </div>
      </td>
      <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">{total}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`size-2.5 rounded-full ${ESTADO_DOT[estado]}`} />
          <span className={`text-[11px] font-medium uppercase ${estado === "Observado" ? "text-rose-600" : "text-slate-500 dark:text-slate-400"}`}>
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
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
