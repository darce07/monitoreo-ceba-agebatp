import { useEffect, useState } from 'react';
import { supabase, type Ceba, type Ficha, type Profile } from '../lib/supabase';

const AREAS = ['Comunicación', 'Matemática', 'Ciencia y Tecnología', 'Ciencias Sociales', 'Otra'];
const MESES = Array.from({ length: 12 }, (_, i) => `M${String(i + 1).padStart(2, '0')}`);

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
  const [docente, setDocente] = useState('');
  const [area, setArea] = useState(AREAS[0]);
  const [fecha, setFecha] = useState('');
  const [nMonitoreo, setNMonitoreo] = useState(MESES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile.ceba_id) return;
    supabase.from('cebas').select('*').eq('id', profile.ceba_id).single().then(({ data }) => setCeba(data));
    loadFichas();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !ceba || !fecha) return;
    setSaving(true);
    setStatus(null);

    const fechaCompacta = fecha.replaceAll('-', '');
    const nombrePdf = `${ceba.codigo}_${normaliza(docente)}_${fechaCompacta}_${nMonitoreo}.pdf`;
    const storagePath = `${ceba.codigo}/${nombrePdf}`;

    const { error: uploadError } = await supabase.storage
      .from('fichas_monitoreo')
      .upload(storagePath, file, { upsert: true, contentType: 'application/pdf' });

    if (uploadError) {
      setStatus(`Error al subir el archivo: ${uploadError.message}`);
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from('fichas_monitoreo').insert({
      ceba_id: ceba.id,
      director_id: profile.id,
      docente,
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
      return;
    }

    setStatus(`Ficha subida como ${nombrePdf}`);
    setDocente('');
    setFile(null);
    loadFichas();
  }

  if (!ceba) return <p className="p-6 text-slate-500 text-sm">Cargando datos de tu CEBA...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{ceba.nombre}</h1>
        <p className="text-sm text-slate-500">Código {ceba.codigo} · Subida de fichas de monitoreo pedagógico</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Docente</label>
            <input
              required
              value={docente}
              onChange={(e) => setDocente(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Área</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de monitoreo</label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">N° de monitoreo</label>
            <select
              value={nMonitoreo}
              onChange={(e) => setNMonitoreo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {MESES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ficha en PDF</label>
          <input
            type="file"
            accept="application/pdf"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          <p className="text-xs text-slate-400 mt-1">El nombre del archivo se genera automáticamente al subir.</p>
        </div>

        {status && <p className="text-sm text-brand-700">{status}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-700 text-white text-sm font-medium px-5 py-2.5 hover:bg-brand-800 disabled:opacity-60"
        >
          {saving ? 'Subiendo...' : 'Subir ficha'}
        </button>
      </form>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Tus fichas subidas</h2>
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {fichas.length === 0 && <p className="p-4 text-sm text-slate-400">Aún no subiste ninguna ficha.</p>}
          {fichas.map((f) => (
            <div key={f.id} className="p-4 flex items-center justify-between text-sm gap-4">
              <div>
                <p className="font-medium text-slate-800">{f.nombre_pdf}</p>
                <p className="text-slate-500">
                  {f.docente} · {f.area} · {f.fecha_monitoreo}
                </p>
                {f.estado === 'Observado' && f.observaciones && (
                  <p className="text-danger-600 text-xs mt-1">Observación: {f.observaciones}</p>
                )}
              </div>
              <EstadoBadge estado={f.estado} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EstadoBadge({ estado }: { estado: Ficha['estado'] }) {
  const styles: Record<Ficha['estado'], string> = {
    Recibido: 'bg-brand-50 text-brand-700 border-brand-200',
    Pendiente: 'bg-amber-50 text-accent-600 border-amber-200',
    Observado: 'bg-red-50 text-danger-600 border-red-200',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${styles[estado]}`}>{estado}</span>
  );
}
