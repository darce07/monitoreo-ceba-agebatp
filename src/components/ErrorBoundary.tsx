import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-slate-50 px-4 dark:bg-slate-950">
          <div className="max-w-sm text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ocurrió un error inesperado. Intenta recargar la página; si persiste, contacta al especialista de
              AGEBATP.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
