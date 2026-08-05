import { useEffect, useMemo, useState } from 'react';
import { supabase, type Ceba, type Docente, type Ficha } from '../lib/supabase';

export default function Docentes() {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [cebas, setCebas] = useState<Ceba[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroCeba, setFiltroCeba] = useState('');

  async function cargar() {
    setError(null);
    const [docentesRes, cebasRes, fichasRes] = await Promise.all([
      supabase.from('docentes').select('*').order('nombre'),
      supabase.from('cebas').select('*').order('nombre'),
      supabase.from('fichas_monitoreo').select('*'),
    ]);
    if (docentesRes.error || cebasRes.error || fichasRes.error) {
      setError('No se pudo cargar la información. Revisa tu conexión e intenta de nuevo.');
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

  const conteoPorDocente = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of fichas) {
      if (!f.docente_id) continue;
      map.set(f.docente_id, (map.get(f.docente_id) ?? 0) + 1);
    }
    return map;
  }, [fichas]);

  const docentesFiltrados = useMemo(
    () => docentes.filter((d) => !filtroCeba || d.ceba_id === filtroCeba),
    [docentes, filtroCeba]
  );

  if (loading) return <p className="p-6 text-slate-500 text-sm">Cargando docentes...</p>;
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Docentes</h1>
        <p className="text-sm text-slate-500">
          {docentesFiltrados.length} docente(s) registrado(s) — se crean automáticamente cuando un director sube su
          primera ficha.
        </p>
      </div>

      <select
        value={filtroCeba}
        onChange={(e) => setFiltroCeba(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Todas las CEBA</option>
        {cebas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.codigo} · {c.nombre}
          </option>
        ))}
      </select>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        <div className="p-4 grid grid-cols-[1fr_auto] gap-4 text-xs font-semibold text-slate-400 uppercase">
          <span>Docente / CEBA</span>
          <span>Fichas subidas</span>
        </div>
        {docentesFiltrados.length === 0 && (
          <p className="p-4 text-sm text-slate-400">No hay docentes registrados todavía.</p>
        )}
        {docentesFiltrados.map((d) => (
          <div key={d.id} className="p-4 grid grid-cols-[1fr_auto] gap-4 items-center text-sm">
            <div>
              <p className="font-medium text-slate-800">{d.nombre}</p>
              <p className="text-slate-500">
                {cebaById[d.ceba_id]?.codigo} · {cebaById[d.ceba_id]?.nombre}
              </p>
            </div>
            <span className="text-slate-600">{conteoPorDocente.get(d.id) ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
