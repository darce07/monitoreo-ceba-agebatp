import { useEffect, useMemo, useState } from "react";
import { X, Trash2, Pencil, Eye, Download, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { supabase, type Ceba, type Docente, type Ficha } from "../lib/supabase";
import { abrirFichaPdf } from "../lib/storage";
import { ESTADO_TONE } from "../lib/utils";
import { Card, Button, Select, Input, Badge, Alert, PageHeader, EmptyState, Skeleton } from "../components/ui";
import { Field } from "../components/form-field";
import { ConfirmDialog } from "../components/confirm-dialog";

const AREAS = ["Comunicación", "Matemática", "Ciencia y Tecnología", "Ciencias Sociales", "Otra"];
const MESES = Array.from({ length: 12 }, (_, i) => `M${String(i + 1).padStart(2, "0")}`);
const ESTADOS: Ficha["estado"][] = ["Pendiente", "Recibido", "Observado"];
const PAGE_SIZE = 15;

export default function FichasAdmin() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [cebas, setCebas] = useState<Ceba[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroCeba, setFiltroCeba] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<Ficha["estado"] | "">("");
  const [filtroDocente, setFiltroDocente] = useState("");
  const [filtroMonitoreo, setFiltroMonitoreo] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [page, setPage] = useState(1);

  const [panelFicha, setPanelFicha] = useState<Ficha | null>(null);
  const [borrarFicha, setBorrarFicha] = useState<Ficha | null>(null);
  const [borrando, setBorrando] = useState(false);

  async function cargar() {
    setError(null);
    const [fichasRes, cebasRes, docentesRes] = await Promise.all([
      supabase.from("fichas_monitoreo").select("*").order("created_at", { ascending: false }),
      supabase.from("cebas").select("*").order("nombre"),
      supabase.from("docentes").select("*").order("nombre"),
    ]);
    if (fichasRes.error || cebasRes.error || docentesRes.error) {
      setError("No se pudo cargar la información. Revisa tu conexión e intenta de nuevo.");
      setLoading(false);
      return;
    }
    setFichas((fichasRes.data as Ficha[]) ?? []);
    setCebas((cebasRes.data as Ceba[]) ?? []);
    setDocentes((docentesRes.data as Docente[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const cebaById = useMemo(() => Object.fromEntries(cebas.map((c) => [c.id, c])), [cebas]);

  const fichasFiltradas = useMemo(() => {
    return fichas.filter((f) => {
      if (filtroCeba && f.ceba_id !== filtroCeba) return false;
      if (filtroEstado && f.estado !== filtroEstado) return false;
      if (filtroDocente && f.docente_id !== filtroDocente) return false;
      if (filtroMonitoreo && f.n_monitoreo !== filtroMonitoreo) return false;
      if (filtroDesde && f.fecha_monitoreo < filtroDesde) return false;
      if (filtroHasta && f.fecha_monitoreo > filtroHasta) return false;
      return true;
    });
  }, [fichas, filtroCeba, filtroEstado, filtroDocente, filtroMonitoreo, filtroDesde, filtroHasta]);

  const totalPages = Math.max(1, Math.ceil(fichasFiltradas.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const fichasPagina = fichasFiltradas.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  function aplicarFiltro<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  async function eliminar(ficha: Ficha) {
    setError(null);
    setBorrando(true);
    const { error } = await supabase.from("fichas_monitoreo").update({ deleted_at: new Date().toISOString() }).eq("id", ficha.id);
    setBorrando(false);
    if (error) {
      setError(`Error al eliminar: ${error.message}`);
      return;
    }
    setBorrarFicha(null);
    cargar();
  }

  if (loading) return <FichasSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Gestión de Fichas" description={`${fichasFiltradas.length} de ${fichas.length} ficha(s) — administre y revise los registros de monitoreo.`} />

      {error && <Alert variant="error">{error}</Alert>}

      <Card className="flex flex-col gap-4 p-4 xl:flex-row xl:items-end">
        <Field label="CEBA" className="min-w-[200px] flex-1">
          <Select value={filtroCeba} onChange={(e) => aplicarFiltro(setFiltroCeba, e.target.value)} className="w-full">
            <option value="">Todas las CEBA</option>
            {cebas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} · {c.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Docente" className="min-w-[200px] flex-1">
          <Select value={filtroDocente} onChange={(e) => aplicarFiltro(setFiltroDocente, e.target.value)} className="w-full">
            <option value="">Todos los docentes</option>
            {docentes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="N° Monitoreo" className="min-w-[140px]">
          <Select value={filtroMonitoreo} onChange={(e) => aplicarFiltro(setFiltroMonitoreo, e.target.value)} className="w-full">
            <option value="">Todos (suma general)</option>
            {MESES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Desde">
          <Input type="date" value={filtroDesde} onChange={(e) => aplicarFiltro(setFiltroDesde, e.target.value)} />
        </Field>
        <Field label="Hasta">
          <Input type="date" value={filtroHasta} onChange={(e) => aplicarFiltro(setFiltroHasta, e.target.value)} />
        </Field>
        <Field label="Estado">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={filtroEstado === "" ? "primary" : "secondary"}
              type="button"
              onClick={() => aplicarFiltro(setFiltroEstado, "")}
              className="rounded-full"
            >
              Todos
            </Button>
            {ESTADOS.map((e) => (
              <Button
                key={e}
                size="sm"
                variant={filtroEstado === e ? "primary" : "secondary"}
                type="button"
                onClick={() => aplicarFiltro(setFiltroEstado, e)}
                className="rounded-full"
              >
                {e}
              </Button>
            ))}
          </div>
        </Field>
      </Card>

      {fichasPagina.length === 0 ? (
        <EmptyState icon={<FileText className="size-6" />} title="Sin resultados" description="No hay fichas que coincidan con el filtro." />
      ) : (
        <Card className="flex flex-col overflow-hidden">
          <div className="table-scroll">
            <table className="w-full border-collapse whitespace-nowrap text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
                  <th className="px-4 py-3 font-medium">CEBA</th>
                  <th className="px-4 py-3 font-medium">Docente</th>
                  <th className="px-4 py-3 font-medium">Área</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Monitoreo</th>
                  <th className="px-4 py-3 font-medium">PDF</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {fichasPagina.map((f) => (
                  <tr key={f.id} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {cebaById[f.ceba_id]?.codigo} · {cebaById[f.ceba_id]?.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">{f.docente}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{f.area}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{f.fecha_monitoreo}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{f.n_monitoreo}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => abrirFichaPdf(f.storage_path, false)} className="rounded p-1 text-[var(--brand)] hover:bg-teal-50 dark:hover:bg-teal-950" title="Ver PDF">
                          <Eye className="size-[18px]" />
                        </button>
                        <button onClick={() => abrirFichaPdf(f.storage_path, true)} className="rounded p-1 text-slate-500 hover:bg-teal-50 hover:text-[var(--brand)] dark:hover:bg-teal-950" title="Descargar PDF">
                          <Download className="size-[18px]" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={ESTADO_TONE[f.estado]}>{f.estado}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <button onClick={() => setPanelFicha(f)} className="rounded-lg p-1.5 text-slate-500 hover:bg-teal-50 hover:text-[var(--brand)] dark:hover:bg-teal-950" title="Editar">
                          <Pencil className="size-[18px]" />
                        </button>
                        <button onClick={() => setBorrarFicha(f)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950" title="Eliminar">
                          <Trash2 className="size-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando {fichasFiltradas.length === 0 ? 0 : (pageClamped - 1) * PAGE_SIZE + 1}
              {"–"}
              {Math.min(pageClamped * PAGE_SIZE, fichasFiltradas.length)} de {fichasFiltradas.length}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageClamped <= 1} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800">
                <ChevronLeft className="size-5" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageClamped >= totalPages} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800">
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
        </Card>
      )}

      {panelFicha && (
        <EditPanel
          ficha={panelFicha}
          docentesDeCeba={docentes.filter((d) => d.ceba_id === panelFicha.ceba_id)}
          onClose={() => setPanelFicha(null)}
          onSaved={() => {
            setPanelFicha(null);
            cargar();
          }}
        />
      )}

      <ConfirmDialog
        open={!!borrarFicha}
        onOpenChange={(open) => !open && (setBorrarFicha(null), setError(null))}
        title="¿Eliminar ficha de monitoreo?"
        description={`Se eliminará "${borrarFicha?.nombre_pdf}". Queda registrada en la auditoría, pero dejará de aparecer en los listados.`}
        loading={borrando}
        error={borrarFicha ? error : null}
        onConfirm={() => borrarFicha && eliminar(borrarFicha)}
      />
    </div>
  );
}

function EditPanel({
  ficha,
  docentesDeCeba,
  onClose,
  onSaved,
}: {
  ficha: Ficha;
  docentesDeCeba: Docente[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [docenteId, setDocenteId] = useState(ficha.docente_id ?? "");
  const [area, setArea] = useState(ficha.area);
  const [fecha, setFecha] = useState(ficha.fecha_monitoreo);
  const [nMonitoreo, setNMonitoreo] = useState(ficha.n_monitoreo);
  const [estado, setEstado] = useState(ficha.estado);
  const [observaciones, setObservaciones] = useState(ficha.observaciones ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setSaving(true);
    setError(null);
    const docenteSel = docentesDeCeba.find((d) => d.id === docenteId);
    const { error } = await supabase
      .from("fichas_monitoreo")
      .update({
        docente_id: docenteId || null,
        docente: docenteSel?.nombre ?? ficha.docente,
        area,
        fecha_monitoreo: fecha,
        n_monitoreo: nMonitoreo,
        estado,
        observaciones,
      })
      .eq("id", ficha.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:w-[420px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Detalle de Ficha</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{ficha.nombre_pdf}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => abrirFichaPdf(ficha.storage_path, false)}>
              <Eye className="size-4" /> Ver PDF
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => abrirFichaPdf(ficha.storage_path, true)}>
              <Download className="size-4" /> Descargar
            </Button>
          </div>

          <Field label="Docente" className="block">
            <Select value={docenteId} onChange={(e) => setDocenteId(e.target.value)} className="w-full">
              <option value="">Sin docente</option>
              {docentesDeCeba.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Área" className="block">
              <Select value={area} onChange={(e) => setArea(e.target.value)} className="w-full">
                {AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </Select>
            </Field>
            <Field label="N° monitoreo" className="block">
              <Select value={nMonitoreo} onChange={(e) => setNMonitoreo(e.target.value)} className="w-full">
                {MESES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Fecha de monitoreo" className="block">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full" />
          </Field>

          <Field label="Estado de evaluación" className="block">
            <div className="flex gap-2">
              {ESTADOS.map((e) => (
                <Button key={e} type="button" size="sm" variant={estado === e ? "primary" : "secondary"} className="rounded-full" onClick={() => setEstado(e)}>
                  {e}
                </Button>
              ))}
            </div>
          </Field>

          <Field label="Observaciones" className="block">
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Escriba aquí las observaciones detectadas durante el monitoreo..."
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </Field>

          {error && <Alert variant="error">{error}</Alert>}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={guardar}>
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
}

function FichasSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24" />
      <Skeleton className="h-96" />
    </div>
  );
}
