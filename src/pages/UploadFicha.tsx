import { useEffect, useMemo, useState } from "react";
import { UploadCloud, Eye, Download, Search, Paperclip, X, FileText, User, CalendarDays, BookOpen, Trash2 } from "lucide-react";
import { supabase, type Ceba, type Docente, type Ficha, type Monitoreo, type Profile } from "../lib/supabase";
import { abrirFichaPdf, obtenerUrlVistaPrevia } from "../lib/storage";
import { PreviewModal } from "../components/preview-modal";
import { ESTADO_TONE } from "../lib/utils";
import { Card, Button, Select, Input, Badge, Alert, PageHeader } from "../components/ui";
import { Field } from "../components/form-field";
import { ConfirmDialog } from "../components/confirm-dialog";

const AREAS = ["Comunicación", "Matemática", "Ciencia y Tecnología", "Ciencias Sociales", "Otra"];
const NUEVO_DOCENTE = "__nuevo__";
const ACEPTA_FICHA = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function normaliza(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase();
}

function extensionDe(nombreArchivo: string) {
  const m = nombreArchivo.match(/\.[a-zA-Z0-9]+$/);
  return m ? m[0].toLowerCase() : ".pdf";
}

export default function UploadFicha({ profile }: { profile: Profile }) {
  const [ceba, setCeba] = useState<Ceba | null>(null);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [monitoreos, setMonitoreos] = useState<Monitoreo[]>([]);
  const [docenteId, setDocenteId] = useState("");
  const [nuevoNombres, setNuevoNombres] = useState("");
  const [nuevoApPaterno, setNuevoApPaterno] = useState("");
  const [nuevoApMaterno, setNuevoApMaterno] = useState("");
  const [titulo, setTitulo] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [fecha, setFecha] = useState("");
  const [monitoreoId, setMonitoreoId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [anexos, setAnexos] = useState<File[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [borrarFicha, setBorrarFicha] = useState<Ficha | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function verFicha(storagePath: string) {
    const { url, error } = await obtenerUrlVistaPrevia(storagePath);
    if (!url) {
      setLoadError(error);
      return;
    }
    setPreviewUrl(url);
  }

  useEffect(() => {
    if (!profile.ceba_id) return;
    supabase
      .from("cebas")
      .select("*")
      .eq("id", profile.ceba_id)
      .single()
      .then(({ data, error }) => {
        if (error) setLoadError("No se pudo cargar tu CEBA. Revisa tu conexión e intenta de nuevo.");
        else setCeba(data);
      });
    loadFichas();
    loadDocentes();
    loadMonitoreos();
  }, [profile.ceba_id]);

  async function loadFichas() {
    if (!profile.ceba_id) return;
    const { data } = await supabase.from("fichas_monitoreo").select("*").eq("ceba_id", profile.ceba_id).order("created_at", { ascending: false });
    setFichas((data as Ficha[]) ?? []);
  }

  async function loadDocentes() {
    if (!profile.ceba_id) return;
    const { data } = await supabase.from("docentes").select("*").eq("ceba_id", profile.ceba_id).order("nombre");
    setDocentes((data as Docente[]) ?? []);
  }

  async function loadMonitoreos() {
    const { data } = await supabase.from("monitoreos_pedagogicos").select("*").eq("activo", true).order("orden");
    const lista = (data as Monitoreo[]) ?? [];
    setMonitoreos(lista);
    if (lista.length) setMonitoreoId((v) => v || lista[0].id);
  }

  const fichasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return fichas;
    const q = busqueda.toLowerCase();
    return fichas.filter((f) => (f.titulo ?? "").toLowerCase().includes(q) || f.nombre_pdf.toLowerCase().includes(q) || f.docente.toLowerCase().includes(q));
  }, [fichas, busqueda]);

  function agregarAnexos(nuevos: FileList | null) {
    if (!nuevos) return;
    setAnexos((prev) => [...prev, ...Array.from(nuevos)]);
  }

  function quitarAnexo(i: number) {
    setAnexos((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !ceba || !fecha || !docenteId || !monitoreoId) return;
    if (docenteId === NUEVO_DOCENTE && (!nuevoNombres.trim() || !nuevoApPaterno.trim())) return;
    setSaving(true);
    setStatus(null);

    const monitoreo = monitoreos.find((m) => m.id === monitoreoId);
    if (!monitoreo) {
      setSaving(false);
      return;
    }

    let docenteFinal: Docente | null = docentes.find((d) => d.id === docenteId) ?? null;

    if (docenteId === NUEVO_DOCENTE) {
      const { data: nuevo, error: docenteError } = await supabase
        .from("docentes")
        .insert({
          ceba_id: ceba.id,
          nombres: nuevoNombres.trim(),
          apellido_paterno: nuevoApPaterno.trim(),
          apellido_materno: nuevoApMaterno.trim() || null,
        })
        .select()
        .single();
      if (docenteError) {
        setStatus(`Error al registrar el docente: ${docenteError.message}`);
        setStatusError(true);
        setSaving(false);
        return;
      }
      docenteFinal = nuevo as Docente;
      setDocentes((prev) => [...prev, docenteFinal!].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    }

    if (!docenteFinal) {
      setSaving(false);
      return;
    }

    const fechaCompacta = fecha.replaceAll("-", "");
    const ext = extensionDe(file.name);
    const codigoMonitoreo = normaliza(monitoreo.codigo) || "MON";
    const nombreArchivo = `${ceba.codigo}_${normaliza(docenteFinal.apellido_paterno)}_${fechaCompacta}_${codigoMonitoreo}${ext}`;
    const storagePath = `${ceba.codigo}/${nombreArchivo}`;

    const { error: uploadError } = await supabase.storage.from("fichas_monitoreo").upload(storagePath, file, { upsert: true, contentType: file.type || "application/pdf" });

    if (uploadError) {
      setStatus(`Error al subir el archivo: ${uploadError.message}`);
      setStatusError(true);
      setSaving(false);
      return;
    }

    const { data: fichaCreada, error: insertError } = await supabase
      .from("fichas_monitoreo")
      .insert({
        ceba_id: ceba.id,
        director_id: profile.id,
        docente: docenteFinal.nombre,
        docente_id: docenteFinal.id,
        titulo: titulo.trim() || null,
        area,
        fecha_monitoreo: fecha,
        monitoreo_id: monitoreo.id,
        n_monitoreo: monitoreo.codigo,
        nombre_pdf: nombreArchivo,
        storage_path: storagePath,
        estado: "Recibido",
      })
      .select()
      .single();

    if (insertError || !fichaCreada) {
      setSaving(false);
      setStatus(`Error al registrar la ficha: ${insertError?.message}`);
      setStatusError(true);
      return;
    }

    for (const anexo of anexos) {
      const anexoPath = `${ceba.codigo}/anexos/${fichaCreada.id}/${anexo.name}`;
      const { error: anexoUploadError } = await supabase.storage.from("fichas_monitoreo").upload(anexoPath, anexo, { upsert: true, contentType: anexo.type });
      if (!anexoUploadError) {
        await supabase.from("ficha_anexos").insert({ ficha_id: fichaCreada.id, nombre_archivo: anexo.name, storage_path: anexoPath });
      }
    }

    setSaving(false);
    setStatus(`Ficha subida como ${nombreArchivo}`);
    setStatusError(false);
    setDocenteId("");
    setNuevoNombres("");
    setNuevoApPaterno("");
    setNuevoApMaterno("");
    setTitulo("");
    setFile(null);
    setAnexos([]);
    setShowForm(false);
    loadFichas();
  }

  async function eliminarFicha() {
    if (!borrarFicha) return;
    setBorrando(true);
    const { error } = await supabase.rpc("soft_delete_ficha", { p_ficha_id: borrarFicha.id });
    setBorrando(false);
    if (error) {
      setLoadError(`Error al eliminar: ${error.message}`);
      setBorrarFicha(null);
      return;
    }
    setBorrarFicha(null);
    loadFichas();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Registrar Fichas" description={ceba ? `${ceba.nombre} · Código ${ceba.codigo} · Monitoreo pedagógico AGEBATP` : "Monitoreo pedagógico AGEBATP"} />

      {loadError && <Alert variant="error">{loadError}</Alert>}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/50 p-8 text-center transition hover:border-[var(--brand)] hover:bg-teal-50 dark:border-teal-800 dark:bg-teal-950/20 dark:hover:bg-teal-950/40"
        >
          <div className="grid size-14 place-items-center rounded-full bg-[var(--brand)] text-white shadow-lg shadow-teal-900/20">
            <UploadCloud className="size-7" />
          </div>
          <span className="text-base font-bold text-slate-900 dark:text-white">Registrar nueva ficha de monitoreo</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">PDF o Word · se puede adjuntar anexos</span>
        </button>
      )}

      {showForm && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/40">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Nueva ficha de monitoreo</h2>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Sección: identificación */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
                <FileText className="size-4" /> Datos de la ficha
              </div>
              <Field label="Título del archivo (opcional)" hint="Un nombre descriptivo para identificarlo en la lista." className="block">
                <Input placeholder="Ej: Ficha de monitoreo — 1er trimestre" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Área monitoreada" className="block">
                  <Select value={area} onChange={(e) => setArea(e.target.value)} className="w-full">
                    {AREAS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Monitoreo pedagógico" hint="Definido por el especialista AGEBATP." className="block">
                  <Select required value={monitoreoId} onChange={(e) => setMonitoreoId(e.target.value)} className="w-full">
                    {monitoreos.length === 0 && <option value="">Sin monitoreos activos</option>}
                    {monitoreos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Fecha del monitoreo" className="block">
                  <Input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full" />
                </Field>
              </div>
            </div>

            {/* Sección: docente */}
            <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
                <User className="size-4" /> Docente aplicado
              </div>
              <Select required value={docenteId} onChange={(e) => setDocenteId(e.target.value)} className="w-full">
                <option value="" disabled>
                  Selecciona un docente
                </option>
                {docentes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
                <option value={NUEVO_DOCENTE}>+ Agregar nuevo docente</option>
              </Select>
              {docenteId === NUEVO_DOCENTE && (
                <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50 sm:grid-cols-3">
                  <Input required autoFocus placeholder="Nombres" value={nuevoNombres} onChange={(e) => setNuevoNombres(e.target.value)} />
                  <Input required placeholder="Apellido paterno" value={nuevoApPaterno} onChange={(e) => setNuevoApPaterno(e.target.value)} />
                  <Input placeholder="Apellido materno (opcional)" value={nuevoApMaterno} onChange={(e) => setNuevoApMaterno(e.target.value)} />
                </div>
              )}
            </div>

            {/* Sección: archivos */}
            <div className="space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
                <Paperclip className="size-4" /> Documentos
              </div>
              <Field label="Ficha (PDF o Word)" hint="El nombre del archivo se genera automáticamente al subir." className="block">
                <input type="file" accept={ACEPTA_FICHA} required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
              </Field>
              <Field label="Anexos (opcional)" hint="Documentos adicionales relacionados a esta ficha." className="block">
                <input type="file" multiple onChange={(e) => agregarAnexos(e.target.files)} className="w-full text-sm" />
                {anexos.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {anexos.map((a, i) => (
                      <li key={i} className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">
                        <span className="flex items-center gap-2 truncate">
                          <Paperclip className="size-3.5 shrink-0" /> {a.name}
                        </span>
                        <button type="button" onClick={() => quitarAnexo(i)} className="text-slate-400 hover:text-rose-600">
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            </div>

            {status && <Alert variant={statusError ? "error" : "info"}>{status}</Alert>}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Subir ficha
              </Button>
            </div>
          </form>
        </Card>
      )}

      <section className="mt-2">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-bold text-slate-950 dark:text-white">Mis Fichas</h2>
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por título, nombre de archivo o docente..." className="w-full pl-9" />
        </div>
        <div className="flex flex-col gap-3">
          {fichasFiltradas.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{fichas.length === 0 ? "Aún no subiste ninguna ficha." : "Sin resultados para tu búsqueda."}</p>}
          {fichasFiltradas.map((f) => (
            <Card key={f.id} className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{f.titulo || f.docente}</h3>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="size-3.5" /> {f.docente}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="size-3.5" /> {f.area}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5" /> {f.fecha_monitoreo} · {f.n_monitoreo}
                  </span>
                </p>
                {f.estado === "Observado" && f.observaciones && <p className="mt-1 text-xs text-rose-600">Observación: {f.observaciones}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => verFicha(f.storage_path)} className="rounded-lg p-1.5 text-[var(--brand)] hover:bg-teal-50 dark:hover:bg-teal-950" title="Ver documento">
                  <Eye className="size-[18px]" />
                </button>
                <button onClick={async () => setLoadError((await abrirFichaPdf(f.storage_path, true)) ?? null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-teal-50 hover:text-[var(--brand)] dark:hover:bg-teal-950" title="Descargar">
                  <Download className="size-[18px]" />
                </button>
                <button onClick={() => setBorrarFicha(f)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950" title="Eliminar">
                  <Trash2 className="size-[18px]" />
                </button>
                <Badge tone={ESTADO_TONE[f.estado]}>{f.estado}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={!!borrarFicha}
        onOpenChange={(open) => !open && setBorrarFicha(null)}
        title="¿Eliminar ficha de monitoreo?"
        description={`Se eliminará "${borrarFicha?.nombre_pdf}". Queda registrada en la auditoría.`}
        loading={borrando}
        onConfirm={eliminarFicha}
      />

      {previewUrl && <PreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </div>
  );
}
