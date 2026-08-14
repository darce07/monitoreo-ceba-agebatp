import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "../lib/utils";

type ToastTono = "success" | "error";

interface ToastItem {
  id: number;
  mensaje: string;
  tono: ToastTono;
}

interface ToastContextValue {
  success: (mensaje: string) => void;
  error: (mensaje: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURACION_MS = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const quitar = useCallback((id: number) => {
    setToasts((actuales) => actuales.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (mensaje: string, tono: ToastTono) => {
      const id = ++idRef.current;
      setToasts((actuales) => [...actuales, { id, mensaje, tono }]);
      setTimeout(() => quitar(id), DURACION_MS);
    },
    [quitar],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (mensaje: string) => mostrar(mensaje, "success"),
      error: (mensaje: string) => mostrar(mensaje, "error"),
    }),
    [mostrar],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[300] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-slide-up pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border p-3.5 shadow-lg backdrop-blur-sm",
              t.tono === "success"
                ? "border-teal-200 bg-white/95 text-slate-800 dark:border-teal-900 dark:bg-slate-900/95 dark:text-slate-100"
                : "border-rose-200 bg-white/95 text-slate-800 dark:border-rose-900 dark:bg-slate-900/95 dark:text-slate-100",
            )}
          >
            {t.tono === "success" ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-teal-600 dark:text-teal-400" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <p className="flex-1 text-sm leading-snug">{t.mensaje}</p>
            <button onClick={() => quitar(t.id)} className="rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200" aria-label="Cerrar">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
