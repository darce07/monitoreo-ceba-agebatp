import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Eliminar',
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/30 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-surface rounded-xl shadow-2xl max-w-sm w-full border border-outline-variant overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center mb-4">
            <AlertTriangle size={22} />
          </div>
          <h3 className="text-headline-sm text-on-surface mb-2">{title}</h3>
          <p className="text-body-sm text-on-surface-variant">{description}</p>
        </div>
        <div className="px-6 py-4 bg-surface-container-low flex justify-end gap-3 border-t border-outline-variant">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-label-md text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-label-md bg-error text-on-error hover:bg-error/90 rounded-lg transition-colors shadow-sm disabled:opacity-60"
          >
            {loading ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
