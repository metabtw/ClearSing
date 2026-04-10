import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-neutral-200 p-6 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Bir Hata Oluştu</h2>
            <p className="text-neutral-600 mb-6 text-sm">
              Uygulama çalışırken beklenmeyen bir hata meydana geldi. Lütfen sayfayı yenilemeyi deneyin.
            </p>
            <div className="bg-neutral-100 p-3 rounded text-left overflow-auto text-xs text-neutral-800 mb-6 max-h-32">
              {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-neutral-900 text-white rounded-lg py-2.5 font-medium hover:bg-neutral-800 transition-colors"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
