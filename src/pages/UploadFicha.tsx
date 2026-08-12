import { useEffect, useMemo, useState } from "react";
import { UploadCloud, Bell, HelpCircle, LogOut, Eye, Download, Search, Paperclip, X } from "lucide-react";
import { supabase, type Ceba, type Docente, type Ficha, type Profile } from "../lib/supabase";
import { abrirFichaPdf } from "../lib/storage";
import { ESTADO_TONE } from "../lib/utils";
import { Card, Button, Select, Input, Badge, Alert } from "../components/ui";
import { Field } from "../components/form-field";

const AREAS = ["Comunicación", "Matemática", "Ciencia y Tecnología", "Ciencias Sociales", "Otra"];
const MESES = Array.from({ length: 12 }, (_, i) => `M${String(i + 1).padStart(2, "0")}`);
const NUEVO_DOCENTE = "__nuevo__";
const ACEPTA_FICHA = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "D";
}

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
  const [docenteId, setDocenteId] = useState("");
  const [nuevoNombres, setNuevoNombres] = useState("");
  const [nuevoApPaterno, setNuevoApPaterno] = useState("");
  const [nuevoApMaterno, setNuevoApMaterno] = useState("");
  const [titulo, setTitulo] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [fecha, setFecha] = useState("");
  const [nMonitoreo, setNMonitoreo] = useState(MESES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [anexos, setAnexos] = useState<File[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busqueda, setBusqueda] = useState("");

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
    if (!file || !ceba || !fecha || !docenteId) return;
    if (docenteId === NUEVO_DOCENTE && (!nuevoNombres.trim() || !nuevoApPaterno.trim())) return;
    setSaving(true);
    setStatus(null);

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
    const nombreArchivo = `${ceba.codigo}_${normaliza(docenteFinal.apellido_paterno)}_${fechaCompacta}_${nMonitoreo}${ext}`;
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
        n_monitoreo: nMonitoreo,
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

  return (
    <div className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950">
      <header className="safe-top sticky top-0 z-30 flex h-20 items-center border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85 sm:px-6">
        <span className="font-serif text-base font-bold text-slate-900 dark:text-white">Monitoreo CEBA</span>
        <div className="ml-auto flex items-center gap-1">
          <button className="relative grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            <Bell className="size-5" />
          </button>
          <button className="hidden size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:grid">
            <HelpCircle className="size-5" />
          </button>
          {ceba?.director_nombre && (
            <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-800">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{ceba.director_nombre}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Director de CEBA</p>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-teal-100 text-sm font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                {iniciales(ceba.director_nombre)}
              </div>
            </div>
          )}
          <button onClick={() => supabase.auth.signOut()} className="grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" title="Cerrar sesión">
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4 sm:px-6">
        {loadError && <Alert variant="error">{loadError}</Alert>}

        {ceba && (
          <section className="mb-2">
            <h1 className="font-serif text-2xl font-bold text-slate-950 dark:text-white">{ceba.nombre}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Código {ceba.codigo} · Monitoreo pedagógico AGEBATP</p>
          </section>
        )}

        <Button onClick={() => setShowForm((v) => !v)} className="w-full py-6 text-base">
          <UploadCloud className="size-6" />
          {showForm ? "Cerrar formulario" : "Subir Ficha de Monitoreo"}
        </Button>

        {showForm && (
          <Card className="space-y-4 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Título del archivo (opcional)" hint="Un nombre descriptivo para identificarlo en la lista." className="block">
                <Input placeholder="Ej: Ficha de monitoreo — 1er trimestre" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Docente" className="col-span-2 block">
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
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Input required autoFocus placeholder="Nombres" value={nuevoNombres} onChange={(e) => setNuevoNombres(e.target.value)} />
                      <Input required placeholder="Apellido paterno" value={nuevoApPaterno} onChange={(e) => setNuevoApPaterno(e.target.value)} />
                      <Input placeholder="Apellido materno (opcional)" value={nuevoApMaterno} onChange={(e) => setNuevoApMaterno(e.target.value)} />
                    </div>
                  )}
                </Field>
                <Field label="Área" className="col-span-2 block sm:col-span-1">
                  <Select value={area} onChange={(e) => setArea(e.target.value)} className="w-full">
                    {AREAS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Fecha de monitoreo" className="block">
                  <Input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full" />
                </Field>
                <Field label="N° de monitoreo" className="block">
                  <Select value={nMonitoreo} onChange={(e) => setNMonitoreo(e.target.value)} className="w-full">
                    {MESES.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </Select>
                </Field>
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

              {status && <Alert variant={statusError ? "error" : "info"}>{status}</Alert>}

              <Button type="submit" loading={saving} className="w-full sm:w-auto">
                Subir ficha
              </Button>
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {f.docente} · {f.area} · {f.fecha_monitoreo} · {f.n_monitoreo}
                  </p>
                  {f.estado === "Observado" && f.observaciones && <p className="mt-1 text-xs text-rose-600">Observación: {f.observaciones}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={async () => setLoadError((await abrirFichaPdf(f.storage_path, false)) ?? null)} className="rounded-lg p-1.5 text-[var(--brand)] hover:bg-teal-50 dark:hover:bg-teal-950" title="Ver documento">
                    <Eye className="size-[18px]" />
                  </button>
                  <button onClick={async () => setLoadError((await abrirFichaPdf(f.storage_path, true)) ?? null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-teal-50 hover:text-[var(--brand)] dark:hover:bg-teal-950" title="Descargar">
                    <Download className="size-[18px]" />
                  </button>
                  <Badge tone={ESTADO_TONE[f.estado]}>{f.estado}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
