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
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-sm text-center">
            <p className="text-body-sm text-on-surface-variant">
              Ocurrió un error inesperado. Intenta recargar la página; si persiste, contacta al especialista de
              AGEBATP.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-primary text-on-primary text-label-md px-4 py-2"
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
