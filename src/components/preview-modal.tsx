import { X, ExternalLink } from "lucide-react";

export function PreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="animate-fade-in fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-scale-in relative flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Vista previa</span>
          <div className="flex items-center gap-1">
            <a href={url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[var(--brand)] dark:hover:bg-slate-800" title="Abrir en pestaña nueva">
              <ExternalLink className="size-4" />
            </a>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800">
              <X className="size-5" />
            </button>
          </div>
        </div>
        <iframe src={url} className="flex-1 bg-slate-100 dark:bg-slate-950" title="Vista previa del documento" />
      </div>
    </div>
  );
}
