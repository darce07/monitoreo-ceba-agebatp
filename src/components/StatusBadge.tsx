import type { Ficha } from '../lib/supabase';

const STYLES: Record<Ficha['estado'], string> = {
  Pendiente: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  Recibido: 'bg-status-received-bg text-status-received border-status-received-border',
  Observado: 'bg-status-observed-bg text-status-observed border-status-observed-border',
};

export default function StatusBadge({ estado }: { estado: Ficha['estado'] }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-bold uppercase tracking-wide border ${STYLES[estado]}`}
    >
      {estado}
    </span>
  );
}
