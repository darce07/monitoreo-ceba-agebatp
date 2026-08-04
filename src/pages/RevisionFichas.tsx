import { useState } from 'react';
import { supabase, type Ficha, type Ceba } from '../lib/supabase';

const ESTADOS: Ficha['estado'][] = ['Pendiente', 'Recibido', 'Observado'];

export default function RevisionFichas({
  fichas,
  cebas,
  onUpdated,
}: {
  fichas: Ficha[];
  cebas: Ceba[];
  onUpdated: () => void;
}) {
  const cebaById = Object.fromEntries(cebas.map((c) => [c.id, c]));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-slate-700">Revisión de fichas</h2>
        <p className="text-xs text-slate-500">Marca observaciones o corrige el estado de cada ficha subida.</p>
      </div>
      {fichas.length === 0 && <p className="p-4 text-sm text-slate-400">Aún no hay fichas subidas.</p>}
      {fichas.map((f) => (
        <FilaFicha key={f.id} ficha={f} ceba={cebaById[f.ceba_id]} onUpdated={onUpdated} />
      ))}
    </div>
  );
}

function FilaFicha({ ficha, ceba, onUpdated }: { ficha: Ficha; ceba?: Ceba; onUpdated: () => void }) {
  const [estado, setEstado] = useState(ficha.estado);
  const [observaciones, setObservaciones] = useState(ficha.observaciones ?? '');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function guardar() {
    setSaving(true);
    await supabase.from('fichas_monitoreo').update({ estado, observaciones }).eq('id', ficha.id);
    setSaving(false);
    setOpen(false);
    onUpdated();
  }

  return (
    <div className="p-4 text-sm">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <div>
          <p className="font-medium text-slate-800">{ficha.nombre_pdf}</p>
          <p className="text-slate-500">
            {ceba?.nombre} · {ficha.docente} · {ficha.area} · {ficha.fecha_monitoreo}
          </p>
        </div>
        <span className="text-xs text-slate-400">{open ? 'Cerrar' : 'Revisar'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div className="flex gap-2">
            {ESTADOS.map((e) => (
              <button
                key={e}
                onClick={() => setEstado(e)}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  estado === e
                    ? 'bg-brand-700 text-white border-brand-700'
                    : 'bg-white text-slate-600 border-slate-300'
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={guardar}
            disabled={saving}
            className="rounded-lg bg-brand-700 text-white text-xs font-medium px-4 py-2 hover:bg-brand-800 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  );
}
