import { useEffect, useState } from 'react';
import { UploadCloud, Bell, HelpCircle, LogOut, Eye, Download } from 'lucide-react';
import { supabase, type Ceba, type Docente, type Ficha, type Profile } from '../lib/supabase';
import { abrirFichaPdf } from '../lib/storage';
import StatusBadge from '../components/StatusBadge';

const AREAS = ['Comunicación', 'Matemática', 'Ciencia y Tecnología', 'Ciencias Sociales', 'Otra'];
const MESES = Array.from({ length: 12 }, (_, i) => `M${String(i + 1).padStart(2, '0')}`);
const NUEVO_DOCENTE = '__nuevo__';

function normaliza(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toUpperCase();
}

export default function UploadFicha({ profile }: { profile: Profile }) {
  const [ceba, setCeba] = useState<Ceba | null>(null);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [docenteId, setDocenteId] = useState('');
  const [nuevoDocenteNombre, setNuevoDocenteNombre] = useState('');
  const [area, setArea] = useState(AREAS[0]);
  const [fecha, setFecha] = useState('');
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
      .from('cebas')
      .select('*')
      .eq('id', profile.ceba_id)
      .single()
      .then(({ data, error }) => {
        if (error) setLoadError('No se pudo cargar tu CEBA. Revisa tu conexión e intenta de nuevo.');
        else setCeba(data);
      });
    loadFichas();
    loadDocentes();
  }, [profile.ceba_id]);

  async function loadFichas() {
    if (!profile.ceba_id) return;
    const { data } = await supabase
      .from('fichas_monitoreo')
      .select('*')
      .eq('ceba_id', profile.ceba_id)
      .order('created_at', { ascending: false });
    setFichas((data as Ficha[]) ?? []);
  }

  async function loadDocentes() {
    if (!profile.ceba_id) return;
    const { data } = await supabase
      .from('docentes')
      .select('*')
      .eq('ceba_id', profile.ceba_id)
      .order('nombre');
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
        .from('docentes')
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

    const fechaCompacta = fecha.replaceAll('-', '');
    const nombrePdf = `${ceba.codigo}_${normaliza(docenteFinal.nombre)}_${fechaCompacta}_${nMonitoreo}.pdf`;
    const storagePath = `${ceba.codigo}/${nombrePdf}`;

    const { error: uploadError } = await supabase.storage
      .from('fichas_monitoreo')
      .upload(storagePath, file, { upsert: true, contentType: 'application/pdf' });

    if (uploadError) {
      setStatus(`Error al subir el archivo: ${uploadError.message}`);
      setStatusError(true);
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from('fichas_monitoreo').insert({
      ceba_id: ceba.id,
      director_id: profile.id,
      docente: docenteFinal.nombre,
      docente_id: docenteFinal.id,
      area,
      fecha_monitoreo: fecha,
      n_monitoreo: nMonitoreo,
      nombre_pdf: nombrePdf,
      storage_path: storagePath,
      estado: 'Recibido',
    });

    setSaving(false);
    if (insertError) {
      setStatus(`Error al registrar la ficha: ${insertError.message}`);
      setStatusError(true);
      return;
    }

    setStatus(`Ficha subida como ${nombrePdf}`);
    setStatusError(false);
    setDocenteId('');
    setNuevoDocenteNombre('');
    setFile(null);
    setShowForm(false);
    loadFichas();
  }

  return (
    <div className="bg-background text-on-surface min-h-screen pb-24">
      <header className="flex justify-between items-center px-gutter w-full sticky top-0 z-30 bg-surface h-topbar-height border-b border-outline-variant">
        <span className="text-headline-sm text-on-surface">Monitoreo CEBA</span>
        <div className="flex items-center gap-1">
          <button className="text-on-surface-variant hover:bg-surface-container-low transition-colors p-2 rounded-full relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
          </button>
          <button className="text-on-surface-variant hover:bg-surface-container-low transition-colors p-2 rounded-full hidden sm:block">
            <HelpCircle size={20} />
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-on-surface-variant hover:bg-surface-container-low transition-colors p-2 rounded-full"
            title="Cerrar sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="px-container-padding py-stack-default flex flex-col gap-stack-default max-w-3xl mx-auto">
        {loadError && <p className="text-body-sm text-error">{loadError}</p>}

        {ceba && (
          <section className="mb-2">
            <h1 className="text-headline-lg text-primary mb-1">{ceba.nombre}</h1>
            <p className="text-body-md text-on-surface-variant">Código {ceba.codigo} · Monitoreo pedagógico AGEBATP</p>
          </section>
        )}

        <section>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="w-full flex flex-col items-center justify-center p-6 bg-primary text-on-primary rounded-xl shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <UploadCloud size={36} className="mb-2" />
            <span className="text-headline-sm">{showForm ? 'Cerrar formulario' : 'Subir Ficha PDF'}</span>
          </button>
        </section>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Docente</label>
                <select
                  required
                  value={docenteId}
                  onChange={(e) => setDocenteId(e.target.value)}
                  className="w-full bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 h-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="" disabled>
                    Selecciona un docente
                  </option>
                  {docentes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                  <option value={NUEVO_DOCENTE}>+ Agregar nuevo docente</option>
                </select>
                {docenteId === NUEVO_DOCENTE && (
                  <input
                    required
                    autoFocus
                    placeholder="Nombre del nuevo docente"
                    value={nuevoDocenteNombre}
                    onChange={(e) => setNuevoDocenteNombre(e.target.value)}
                    className="w-full mt-2 bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 h-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Área</label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 h-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {AREAS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Fecha de monitoreo</label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 h-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">N° de monitoreo</label>
                <select
                  value={nMonitoreo}
                  onChange={(e) => setNMonitoreo(e.target.value)}
                  className="w-full bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 h-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {MESES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Ficha en PDF</label>
              <input
                type="file"
                accept="application/pdf"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-body-sm"
              />
              <p className="text-label-sm text-on-surface-variant mt-1">
                El nombre del archivo se genera automáticamente al subir.
              </p>
            </div>

            {status && <p className={`text-body-sm ${statusError ? 'text-error' : 'text-primary'}`}>{status}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto rounded-lg bg-primary text-on-primary text-label-md px-5 py-2.5 hover:bg-surface-tint disabled:opacity-60 transition-colors"
            >
              {saving ? 'Subiendo...' : 'Subir ficha'}
            </button>
          </form>
        )}

        <section className="mt-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-headline-md text-on-surface">Mis Fichas Recientes</h2>
          </div>
          <div className="flex flex-col gap-3">
            {fichas.length === 0 && (
              <p className="text-body-sm text-on-surface-variant">Aún no subiste ninguna ficha.</p>
            )}
            {fichas.map((f) => (
              <div
                key={f.id}
                className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-surface-container-low transition-colors"
              >
                <div>
                  <h3 className="text-headline-sm text-on-surface mb-1">{f.docente}</h3>
                  <p className="text-body-sm text-on-surface-variant">
                    {f.area} · {f.fecha_monitoreo} · {f.n_monitoreo}
                  </p>
                  {f.estado === 'Observado' && f.observaciones && (
                    <p className="text-error text-label-sm mt-1">Observación: {f.observaciones}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => abrirFichaPdf(f.storage_path, false)}
                    className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Ver PDF"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => abrirFichaPdf(f.storage_path, true)}
                    className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Descargar PDF"
                  >
                    <Download size={18} />
                  </button>
                  <StatusBadge estado={f.estado} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
