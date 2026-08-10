import { useEffect, useState } from "react";
import { UploadCloud, Bell, HelpCircle, LogOut, Eye, Download } from "lucide-react";
import { supabase, type Ceba, type Docente, type Ficha, type Profile } from "../lib/supabase";
import { abrirFichaPdf } from "../lib/storage";
import { ESTADO_TONE } from "../lib/utils";
import { Card, Button, Select, Input, Badge, Alert } from "../components/ui";
import { Field } from "../components/form-field";

const AREAS = ["Comunicación", "Matemática", "Ciencia y Tecnología", "Ciencias Sociales", "Otra"];
const MESES = Array.from({ length: 12 }, (_, i) => `M${String(i + 1).padStart(2, "0")}`);
const NUEVO_DOCENTE = "__nuevo__";

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

export default function UploadFicha({ profile }: { profile: Profile }) {
  const [ceba, setCeba] = useState<Ceba | null>(null);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [docenteId, setDocenteId] = useState("");
  const [nuevoDocenteNombre, setNuevoDocenteNombre] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [fecha, setFecha] = useState("");
  const [nMonitoreo, setNMonitoreo] = useState(MESES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !ceba || !fecha || !docenteId) return;
    if (docenteId === NUEVO_DOCENTE && !nuevoDocenteNombre.trim()) return;
    setSaving(true);
    setStatus(null);

    let docenteFinal: Docente | null = docentes.find((d) => d.id === docenteId) ?? null;

    if (docenteId === NUEVO_DOCENTE) {
      const { data: nuevo, error: docenteError } = await supabase
        .from("docentes")
        .insert({ ceba_id: ceba.id, nombre: nuevoDocenteNombre.trim() })
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
    const nombrePdf = `${ceba.codigo}_${normaliza(docenteFinal.nombre)}_${fechaCompacta}_${nMonitoreo}.pdf`;
    const storagePath = `${ceba.codigo}/${nombrePdf}`;

    const { error: uploadError } = await supabase.storage.from("fichas_monitoreo").upload(storagePath, file, { upsert: true, contentType: "application/pdf" });

    if (uploadError) {
      setStatus(`Error al subir el archivo: ${uploadError.message}`);
      setStatusError(true);
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("fichas_monitoreo").insert({
      ceba_id: ceba.id,
      director_id: profile.id,
      docente: docenteFinal.nombre,
      docente_id: docenteFinal.id,
      area,
      fecha_monitoreo: fecha,
      n_monitoreo: nMonitoreo,
      nombre_pdf: nombrePdf,
      storage_path: storagePath,
      estado: "Recibido",
    });

    setSaving(false);
    if (insertError) {
      setStatus(`Error al registrar la ficha: ${insertError.message}`);
      setStatusError(true);
      return;
    }

    setStatus(`Ficha subida como ${nombrePdf}`);
    setStatusError(false);
    setDocenteId("");
    setNuevoDocenteNombre("");
    setFile(null);
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
          {showForm ? "Cerrar formulario" : "Subir Ficha PDF"}
        </Button>

        {showForm && (
          <Card className="space-y-4 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Docente" className="col-span-2 block sm:col-span-1">
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
                    <Input required autoFocus placeholder="Nombre del nuevo docente" value={nuevoDocenteNombre} onChange={(e) => setNuevoDocenteNombre(e.target.value)} className="mt-2 w-full" />
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

              <Field label="Ficha en PDF" hint="El nombre del archivo se genera automáticamente al subir." className="block">
                <input type="file" accept="application/pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
              </Field>

              {status && <Alert variant={statusError ? "error" : "info"}>{status}</Alert>}

              <Button type="submit" loading={saving} className="w-full sm:w-auto">
                Subir ficha
              </Button>
            </form>
          </Card>
        )}

        <section className="mt-2">
          <h2 className="mb-4 font-serif text-lg font-bold text-slate-950 dark:text-white">Mis Fichas Recientes</h2>
          <div className="flex flex-col gap-3">
            {fichas.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Aún no subiste ninguna ficha.</p>}
            {fichas.map((f) => (
              <Card key={f.id} className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{f.docente}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {f.area} · {f.fecha_monitoreo} · {f.n_monitoreo}
                  </p>
                  {f.estado === "Observado" && f.observaciones && <p className="mt-1 text-xs text-rose-600">Observación: {f.observaciones}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={async () => setLoadError((await abrirFichaPdf(f.storage_path, false)) ?? null)} className="rounded-lg p-1.5 text-[var(--brand)] hover:bg-teal-50 dark:hover:bg-teal-950" title="Ver PDF">
                    <Eye className="size-[18px]" />
                  </button>
                  <button onClick={async () => setLoadError((await abrirFichaPdf(f.storage_path, true)) ?? null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-teal-50 hover:text-[var(--brand)] dark:hover:bg-teal-950" title="Descargar PDF">
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
