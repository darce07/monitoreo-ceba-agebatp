import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase, type Ceba, type Docente, type Ficha } from '../lib/supabase';

const AVATAR_TONES = [
  'bg-primary-container text-on-primary-container',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-container text-on-tertiary-container',
];

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

export default function Docentes() {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [cebas, setCebas] = useState<Ceba[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroCeba, setFiltroCeba] = useState('');
  const [busqueda, setBusqueda] = useState('');

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

  if (loading) return <DocentesSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg text-on-surface">Directorio de Docentes</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {docentesFiltrados.length} docente(s) — se crean automáticamente al subir su primera ficha.
          </p>
        </div>
      </div>

      {error && <p className="text-body-sm text-error">{error}</p>}

      <div className="bg-surface border border-outline-variant rounded-t-lg p-3 flex flex-col sm:flex-row gap-3 items-center justify-between border-b-0">
        <div className="relative w-full sm:max-w-xs">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar docente por nombre..."
            className="w-full pl-9 pr-3 py-1.5 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-md text-body-sm h-9 bg-background"
          />
        </div>
        <select
          value={filtroCeba}
          onChange={(e) => setFiltroCeba(e.target.value)}
          className="w-full sm:w-56 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-md text-body-sm h-9 px-3 bg-background"
        >
          <option value="">Todas las CEBA</option>
          {cebas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} · {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-surface border border-outline-variant rounded-b-lg overflow-x-auto shadow-sm -mt-6">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="py-3 px-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Docente</th>
              <th className="py-3 px-4 text-label-sm text-on-surface-variant uppercase tracking-wider">CEBA</th>
              <th className="py-3 px-4 text-label-sm text-on-surface-variant uppercase tracking-wider text-center">Total Fichas</th>
              <th className="py-3 px-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Último Monitoreo</th>
            </tr>
          </thead>
          <tbody>
            {docentesFiltrados.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 px-4 text-center text-body-sm text-on-surface-variant">
                  No hay docentes registrados todavía.
                </td>
              </tr>
            )}
            {docentesFiltrados.map((d, i) => {
              const ultima = ultimaFichaPorDocente.get(d.id);
              return (
                <tr key={d.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-label-md ${AVATAR_TONES[i % AVATAR_TONES.length]}`}>
                        {iniciales(d.nombre)}
                      </div>
                      <div className="font-medium text-on-surface text-body-md">{d.nombre}</div>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-body-sm text-on-surface-variant">
                    {cebaById[d.ceba_id]?.codigo} · {cebaById[d.ceba_id]?.nombre}
                  </td>
                  <td className="py-2 px-4 text-center text-body-sm font-medium text-on-surface">
                    {conteoPorDocente.get(d.id) ?? 0}
                  </td>
                  <td className="py-2 px-4">
                    {ultima ? (
                      <>
                        <div className="text-body-sm text-on-surface">{ultima.fecha_monitoreo}</div>
                        <div className={`text-label-sm ${ultima.estado === 'Observado' ? 'text-error' : 'text-secondary'}`}>
                          Estado: {ultima.estado}
                        </div>
                      </>
                    ) : (
                      <div className="text-body-sm text-outline-variant italic">Sin registros</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocentesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-64 rounded skeleton-loader" />
      <div className="h-12 rounded-t-lg skeleton-loader" />
      <div className="flex flex-col gap-2 -mt-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded skeleton-loader" />
        ))}
      </div>
    </div>
  );
}
