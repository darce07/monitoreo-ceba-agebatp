import { useEffect, useMemo, useState } from 'react';
import { supabase, type Ceba, type Docente, type Ficha } from '../lib/supabase';
import { EstadoBadge } from './UploadFicha';

const AREAS = ['Comunicación', 'Matemática', 'Ciencia y Tecnología', 'Ciencias Sociales', 'Otra'];
const MESES = Array.from({ length: 12 }, (_, i) => `M${String(i + 1).padStart(2, '0')}`);
const ESTADOS: Ficha['estado'][] = ['Pendiente', 'Recibido', 'Observado'];

export default function FichasAdmin() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [cebas, setCebas] = useState<Ceba[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroCeba, setFiltroCeba] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroDocente, setFiltroDocente] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  async function cargar() {
    setError(null);
    const [fichasRes, cebasRes, docentesRes] = await Promise.all([
      supabase.from('fichas_monitoreo').select('*').order('created_at', { ascending: false }),
      supabase.from('cebas').select('*').order('nombre'),
      supabase.from('docentes').select('*').order('nombre'),
    ]);
    if (fichasRes.error || cebasRes.error || docentesRes.error) {
      setError('No se pudo cargar la información. Revisa tu conexión e intenta de nuevo.');
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
      if (filtroDesde && f.fecha_monitoreo < filtroDesde) return false;
      if (filtroHasta && f.fecha_monitoreo > filtroHasta) return false;
      return true;
    });
  }, [fichas, filtroCeba, filtroEstado, filtroDocente, filtroDesde, filtroHasta]);

  const hayFiltros = filtroCeba || filtroEstado || filtroDocente || filtroDesde || filtroHasta;

  if (loading) return <p className="p-6 text-slate-500 text-sm">Cargando fichas...</p>;
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
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Fichas de monitoreo</h1>
        <p className="text-sm text-slate-500">
          {fichasFiltradas.length} de {fichas.length} ficha(s){hayFiltros ? ' (filtrado)' : ''}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
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
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select
          value={filtroDocente}
          onChange={(e) => setFiltroDocente(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los docentes</option>
          {docentes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filtroDesde}
          onChange={(e) => setFiltroDesde(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={filtroHasta}
          onChange={(e) => setFiltroHasta(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {fichasFiltradas.length === 0 && (
          <p className="p-4 text-sm text-slate-400">No hay fichas que coincidan con el filtro.</p>
        )}
        {fichasFiltradas.map((f) => (
          <FilaFicha key={f.id} ficha={f} ceba={cebaById[f.ceba_id]} docentes={docentes} onUpdated={cargar} />
        ))}
      </div>
    </div>
  );
}

function FilaFicha({
  ficha,
  ceba,
  docentes,
  onUpdated,
}: {
  ficha: Ficha;
  ceba?: Ceba;
  docentes: Docente[];
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  const [docenteId, setDocenteId] = useState(ficha.docente_id ?? '');
  const [area, setArea] = useState(ficha.area);
  const [fecha, setFecha] = useState(ficha.fecha_monitoreo);
  const [nMonitoreo, setNMonitoreo] = useState(ficha.n_monitoreo);
  const [estado, setEstado] = useState(ficha.estado);
  const [observaciones, setObservaciones] = useState(ficha.observaciones ?? '');

  const docentesDeCeba = docentes.filter((d) => d.ceba_id === ficha.ceba_id);

  async function guardar() {
    setSaving(true);
    const docenteSel = docentesDeCeba.find((d) => d.id === docenteId);
    const { error } = await supabase
      .from('fichas_monitoreo')
      .update({
        docente_id: docenteId || null,
        docente: docenteSel?.nombre ?? ficha.docente,
        area,
        fecha_monitoreo: fecha,
        n_monitoreo: nMonitoreo,
        estado,
        observaciones,
      })
      .eq('id', ficha.id);
    setSaving(false);
    if (error) {
      alert(`Error al guardar: ${error.message}`);
      return;
    }
    setOpen(false);
    onUpdated();
  }

  async function eliminar() {
    setSaving(true);
    const { error } = await supabase
      .from('fichas_monitoreo')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', ficha.id);
    setSaving(false);
    if (error) {
      alert(`Error al eliminar: ${error.message}`);
      return;
    }
    onUpdated();
  }

  return (
    <div className="p-4 text-sm">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <div>
          <p className="font-medium text-slate-800">{ficha.nombre_pdf}</p>
          <p className="text-slate-500">
            {ceba?.codigo} · {ceba?.nombre} · {ficha.docente} · {ficha.area} · {ficha.fecha_monitoreo}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <EstadoBadge estado={ficha.estado} />
          <span className="text-xs text-slate-400">{open ? 'Cerrar' : 'Editar'}</span>
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Docente</label>
              <select
                value={docenteId}
                onChange={(e) => setDocenteId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Sin docente</option>
                {docentesDeCeba.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Área</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de monitoreo</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">N° de monitoreo</label>
              <select
                value={nMonitoreo}
                onChange={(e) => setNMonitoreo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {MESES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            {ESTADOS.map((e) => (
              <button
                key={e}
                onClick={() => setEstado(e)}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  estado === e ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Observaciones para el director (opcional)"
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={guardar}
              disabled={saving}
              className="rounded-lg bg-brand-700 text-white text-xs font-medium px-4 py-2 hover:bg-brand-800 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>

            {confirmandoBorrado ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-danger-600">¿Eliminar esta ficha?</span>
                <button
                  onClick={eliminar}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-lg bg-danger-600 text-white"
                >
                  Sí, eliminar
                </button>
                <button
                  onClick={() => setConfirmandoBorrado(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmandoBorrado(true)}
                className="text-xs text-danger-600 hover:underline"
              >
                Eliminar ficha
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
