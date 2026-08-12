import { useEffect, useMemo, useState } from "react";
import { Search, Users, Pencil, Trash2 } from "lucide-react";
import { supabase, type Ceba, type Docente, type Ficha } from "../lib/supabase";
import { Card, Select, Input, Alert, Button, PageHeader, EmptyState, Skeleton } from "../components/ui";
import { Field } from "../components/form-field";
import { ConfirmDialog } from "../components/confirm-dialog";

const AVATAR_TONES = [
  "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
];

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

export default function Docentes() {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [cebas, setCebas] = useState<Ceba[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroCeba, setFiltroCeba] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [editando, setEditando] = useState<Docente | null>(null);
  const [nuevosNombres, setNuevosNombres] = useState("");
  const [nuevoApPaterno, setNuevoApPaterno] = useState("");
  const [nuevoApMaterno, setNuevoApMaterno] = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  const [borrarDocente, setBorrarDocente] = useState<Docente | null>(null);
  const [borrando, setBorrando] = useState(false);

  async function cargar() {
    setError(null);
    const [docentesRes, cebasRes, fichasRes] = await Promise.all([
      supabase.from("docentes").select("*").order("nombre"),
      supabase.from("cebas").select("*").order("nombre"),
      supabase.from("fichas_monitoreo").select("*"),
    ]);
    if (docentesRes.error || cebasRes.error || fichasRes.error) {
      setError("No se pudo cargar la información. Revisa tu conexión e intenta de nuevo.");
      setLoading(false);
      return;
    }
    setDocentes((docentesRes.data as Docente[]) ?? []);
    setCebas((cebasRes.data as Ceba[]) ?? []);
    setFichas((fichasRes.data as Ficha[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const cebaById = useMemo(() => Object.fromEntries(cebas.map((c) => [c.id, c])), [cebas]);

  const ultimaFichaPorDocente = useMemo(() => {
    const map = new Map<string, Ficha>();
    for (const f of fichas) {
      if (!f.docente_id) continue;
      const actual = map.get(f.docente_id);
      if (!actual || f.fecha_monitoreo > actual.fecha_monitoreo) map.set(f.docente_id, f);
    }
    return map;
  }, [fichas]);

  const conteoPorDocente = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of fichas) {
      if (!f.docente_id) continue;
      map.set(f.docente_id, (map.get(f.docente_id) ?? 0) + 1);
    }
    return map;
  }, [fichas]);

  const docentesFiltrados = useMemo(
    () =>
      docentes.filter((d) => {
        if (filtroCeba && d.ceba_id !== filtroCeba) return false;
        if (busqueda && !d.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
        return true;
      }),
    [docentes, filtroCeba, busqueda]
  );

  function abrirEdicion(d: Docente) {
    setEditando(d);
    setNuevosNombres(d.nombres);
    setNuevoApPaterno(d.apellido_paterno);
    setNuevoApMaterno(d.apellido_materno ?? "");
  }

  async function guardarNombre() {
    if (!editando) return;
    setGuardandoNombre(true);
    setError(null);
    const { error } = await supabase.rpc("rename_docente", {
      p_docente_id: editando.id,
      p_nombres: nuevosNombres,
      p_apellido_paterno: nuevoApPaterno,
      p_apellido_materno: nuevoApMaterno || null,
    });
    setGuardandoNombre(false);
    if (error) {
      setError(`Error al renombrar: ${error.message}`);
      return;
    }
    setEditando(null);
    cargar();
  }

  async function confirmarEliminar() {
    if (!borrarDocente) return;
    setBorrando(true);
    const { error } = await supabase.rpc("delete_docente", { p_docente_id: borrarDocente.id });
    setBorrando(false);
    if (error) {
      setError(`Error al eliminar: ${error.message}`);
      setBorrarDocente(null);
      return;
    }
    setBorrarDocente(null);
    cargar();
  }

  if (loading) return <DocentesSkeleton />;
  if (error && docentes.length === 0) {
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
        title="Directorio de Docentes"
        description={`${docentesFiltrados.length} docente(s) registrado(s) — se crean automáticamente cuando un director sube su primera ficha.`}
      />

      {error && <Alert variant="error">{error}</Alert>}

      <Card className="flex flex-col items-center justify-between gap-3 p-3 sm:flex-row">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar docente por nombre..." className="pl-9" />
        </div>
        <Select value={filtroCeba} onChange={(e) => setFiltroCeba(e.target.value)} className="w-full sm:w-56">
          <option value="">Todas las CEBA</option>
          {cebas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} · {c.nombre}
            </option>
          ))}
        </Select>
      </Card>

      {docentesFiltrados.length === 0 ? (
        <EmptyState icon={<Users className="size-6" />} title="Sin docentes" description="No hay docentes registrados todavía." />
      ) : (
        <Card className="overflow-hidden">
          <div className="table-scroll">
            <table className="w-full border-collapse whitespace-nowrap text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
                  <th className="px-4 py-3 font-medium">Docente</th>
                  <th className="px-4 py-3 font-medium">CEBA</th>
                  <th className="px-4 py-3 text-center font-medium">Total Fichas</th>
                  <th className="px-4 py-3 font-medium">Último Monitoreo</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {docentesFiltrados.map((d, i) => {
                  const ultima = ultimaFichaPorDocente.get(d.id);
                  const tieneFichas = (conteoPorDocente.get(d.id) ?? 0) > 0;
                  return (
                    <tr key={d.id} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}>
                            {iniciales(d.nombre)}
                          </div>
                          <div className="font-medium text-slate-800 dark:text-slate-200">{d.nombre}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
                        {cebaById[d.ceba_id]?.codigo} · {cebaById[d.ceba_id]?.nombre}
                      </td>
                      <td className="px-4 py-2 text-center text-sm font-medium text-slate-800 dark:text-slate-200">{conteoPorDocente.get(d.id) ?? 0}</td>
                      <td className="px-4 py-2">
                        {ultima ? (
                          <>
                            <div className="text-sm text-slate-800 dark:text-slate-200">{ultima.fecha_monitoreo}</div>
                            <div className={`text-xs ${ultima.estado === "Observado" ? "text-rose-600" : "text-teal-600"}`}>Estado: {ultima.estado}</div>
                          </>
                        ) : (
                          <div className="text-sm italic text-slate-300 dark:text-slate-600">Sin registros</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                          <button onClick={() => abrirEdicion(d)} className="rounded-lg p-1.5 text-slate-500 hover:bg-teal-50 hover:text-[var(--brand)] dark:hover:bg-teal-950" title="Editar nombre">
                            <Pencil className="size-[18px]" />
                          </button>
                          <button
                            onClick={() => setBorrarDocente(d)}
                            disabled={tieneFichas}
                            title={tieneFichas ? "No se puede eliminar: ya tiene fichas registradas" : "Eliminar"}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-rose-950"
                          >
                            <Trash2 className="size-[18px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editando && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setEditando(null)}>
          <Card className="w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Editar nombre del docente</h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Actualiza también el nombre en las fichas ya subidas de este docente.</p>
            <div className="space-y-3">
              <Field label="Nombres">
                <Input value={nuevosNombres} onChange={(e) => setNuevosNombres(e.target.value)} autoFocus className="w-full" />
              </Field>
              <Field label="Apellido paterno">
                <Input value={nuevoApPaterno} onChange={(e) => setNuevoApPaterno(e.target.value)} className="w-full" />
              </Field>
              <Field label="Apellido materno (opcional)">
                <Input value={nuevoApMaterno} onChange={(e) => setNuevoApMaterno(e.target.value)} className="w-full" />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button loading={guardandoNombre} onClick={guardarNombre} disabled={!nuevosNombres.trim() || !nuevoApPaterno.trim()}>
                Guardar
              </Button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!borrarDocente}
        onOpenChange={(open) => !open && setBorrarDocente(null)}
        title="¿Eliminar docente?"
        description={`Se eliminará "${borrarDocente?.nombre}" del directorio. Solo es posible porque todavía no tiene fichas registradas.`}
        loading={borrando}
        onConfirm={confirmarEliminar}
      />
    </div>
  );
}

function DocentesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-12" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}
