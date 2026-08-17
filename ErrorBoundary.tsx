import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleHardReload = () => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
    } catch {
      this.handleReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-3xl m-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900">
                {this.props.fallbackTitle || 'Se produjo un problema al cargar esta vista'}
              </h2>
              <p className="text-xs text-slate-500">
                {this.state.error?.message || 'Error inesperado durante la ejecución.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#0f2942] hover:bg-[#163a5d] text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reintentar Carga</span>
              </button>

              <button
                onClick={this.handleHardReload}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Recargar Sistema</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
