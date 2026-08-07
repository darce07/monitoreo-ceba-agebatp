import { useEffect, useMemo, useState } from 'react';
import { X, Trash2, Pencil, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, type Ceba, type Docente, type Ficha } from '../lib/supabase';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';

const AREAS = ['Comunicación', 'Matemática', 'Ciencia y Tecnología', 'Ciencias Sociales', 'Otra'];
const MESES = Array.from({ length: 12 }, (_, i) => `M${String(i + 1).padStart(2, '0')}`);
const ESTADOS: Ficha['estado'][] = ['Pendiente', 'Recibido', 'Observado'];
const PAGE_SIZE = 15;

export default function FichasAdmin() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [cebas, setCebas] = useState<Ceba[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroCeba, setFiltroCeba] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<Ficha['estado'] | ''>('');
  const [filtroDocente, setFiltroDocente] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [page, setPage] = useState(1);

  const [panelFicha, setPanelFicha] = useState<Ficha | null>(null);
  const [borrarFicha, setBorrarFicha] = useState<Ficha | null>(null);

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

  const totalPages = Math.max(1, Math.ceil(fichasFiltradas.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const fichasPagina = fichasFiltradas.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  function aplicarFiltro<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  async function eliminar(ficha: Ficha) {
    setError(null);
    const { error } = await supabase
      .from('fichas_monitoreo')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', ficha.id);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg text-on-surface">Gestión de Fichas</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {fichasFiltradas.length} de {fichas.length} ficha(s) — administre y revise los registros de monitoreo.
          </p>
        </div>
      </div>

      {error && <p className="text-body-sm text-error">{error}</p>}

      {/* Filters */}
      <div className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-col xl:flex-row gap-4 xl:items-center">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">CEBA</label>
          <select
            value={filtroCeba}
            onChange={(e) => aplicarFiltro(setFiltroCeba, e.target.value)}
            className="w-full bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 h-9 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Todas las CEBA</option>
            {cebas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} · {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Docente</label>
          <select
            value={filtroDocente}
            onChange={(e) => aplicarFiltro(setFiltroDocente, e.target.value)}
            className="w-full bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 h-9 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos los docentes</option>
            {docentes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-4">
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Desde</label>
            <input
              type="date"
              value={filtroDesde}
              onChange={(e) => aplicarFiltro(setFiltroDesde, e.target.value)}
              className="bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 h-9 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Hasta</label>
            <input
              type="date"
              value={filtroHasta}
              onChange={(e) => aplicarFiltro(setFiltroHasta, e.target.value)}
              className="bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 h-9 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Estado</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => aplicarFiltro(setFiltroEstado, '')}
              className={`text-label-sm px-3 py-1.5 h-9 rounded-full flex items-center border transition-colors ${
                filtroEstado === '' ? 'bg-primary-container text-on-primary-container border-primary/20' : 'bg-surface text-on-surface-variant hover:bg-surface-variant border-outline-variant'
              }`}
            >
              Todos
            </button>
            {ESTADOS.map((e) => (
              <button
                key={e}
                onClick={() => aplicarFiltro(setFiltroEstado, e)}
                className={`text-label-sm px-3 py-1.5 h-9 rounded-full flex items-center border transition-colors ${
                  filtroEstado === e ? 'bg-primary-container text-on-primary-container border-primary/20' : 'bg-surface text-on-surface-variant hover:bg-surface-variant border-outline-variant'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wider">CEBA</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wider">Docente</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wider">Área</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wider">Monitoreo</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wider">PDF</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {fichasPagina.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">
                    No hay fichas que coincidan con el filtro.
                  </td>
                </tr>
              )}
              {fichasPagina.map((f) => (
                <tr key={f.id} className="hover:bg-surface-variant/30 transition-colors group">
                  <td className="px-4 py-3 text-body-sm text-on-surface">{cebaById[f.ceba_id]?.codigo} · {cebaById[f.ceba_id]?.nombre}</td>
                  <td className="px-4 py-3 text-body-sm text-on-surface">{f.docente}</td>
                  <td className="px-4 py-3 text-body-sm text-on-surface-variant">{f.area}</td>
                  <td className="px-4 py-3 text-body-sm text-on-surface-variant">{f.fecha_monitoreo}</td>
                  <td className="px-4 py-3 text-label-md text-on-surface">{f.n_monitoreo}</td>
                  <td className="px-4 py-3">
                    <span className="text-primary" title={f.nombre_pdf}>
                      <FileText size={20} />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge estado={f.estado} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => setPanelFicha(f)}
                        className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => setBorrarFicha(f)}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-auto border-t border-outline-variant px-4 py-3 flex items-center justify-between bg-surface-container-lowest">
          <span className="text-body-sm text-on-surface-variant">
            Mostrando {fichasFiltradas.length === 0 ? 0 : (pageClamped - 1) * PAGE_SIZE + 1}
            {'–'}
            {Math.min(pageClamped * PAGE_SIZE, fichasFiltradas.length)} de {fichasFiltradas.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageClamped <= 1}
              className="p-1 text-on-surface-variant hover:bg-surface-variant rounded disabled:opacity-40"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageClamped >= totalPages}
              className="p-1 text-on-surface-variant hover:bg-surface-variant rounded disabled:opacity-40"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

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

      <ConfirmModal
        open={!!borrarFicha}
        title="¿Eliminar ficha de monitoreo?"
        description={`Se eliminará "${borrarFicha?.nombre_pdf}". Queda registrada en la auditoría, pero dejará de aparecer en los listados.`}
        onCancel={() => setBorrarFicha(null)}
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
  const [docenteId, setDocenteId] = useState(ficha.docente_id ?? '');
  const [area, setArea] = useState(ficha.area);
  const [fecha, setFecha] = useState(ficha.fecha_monitoreo);
  const [nMonitoreo, setNMonitoreo] = useState(ficha.n_monitoreo);
  const [estado, setEstado] = useState(ficha.estado);
  const [observaciones, setObservaciones] = useState(ficha.observaciones ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setSaving(true);
    setError(null);
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
      setError(error.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-on-background/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full sm:w-[400px] bg-surface border-l border-outline-variant shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <div>
            <h3 className="text-headline-sm text-on-surface">Detalle de Ficha</h3>
            <p className="text-body-sm text-on-surface-variant">{ficha.nombre_pdf}</p>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Docente</label>
            <select
              value={docenteId}
              onChange={(e) => setDocenteId(e.target.value)}
              className="w-full bg-surface border border-outline-variant text-on-surface text-body-md rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Sin docente</option>
              {docentesDeCeba.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Área</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">N° monitoreo</label>
              <select
                value={nMonitoreo}
                onChange={(e) => setNMonitoreo(e.target.value)}
                className="w-full bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {MESES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Fecha de monitoreo</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Estado de evaluación</label>
            <div className="flex gap-2">
              {ESTADOS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEstado(e)}
                  className={`text-label-sm px-3 py-1.5 rounded-full border transition-colors ${
                    estado === e ? 'bg-primary text-on-primary border-primary' : 'bg-white text-on-surface-variant border-outline-variant'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Escriba aquí las observaciones detectadas durante el monitoreo..."
              rows={5}
              className="w-full bg-surface border border-outline-variant text-on-surface text-body-sm rounded-lg p-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none placeholder-outline"
            />
          </div>

          {error && <p className="text-body-sm text-error">{error}</p>}
        </div>

        <div className="p-6 border-t border-outline-variant bg-surface-container-lowest flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-label-md text-on-surface hover:bg-surface-variant rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={saving}
            className="px-4 py-2 text-label-md bg-primary text-on-primary hover:bg-surface-tint rounded-lg transition-colors shadow-sm disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FichasSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-64 rounded skeleton-loader" />
      <div className="h-24 rounded-xl skeleton-loader" />
      <div className="h-96 rounded-xl skeleton-loader" />
    </div>
  );
}
