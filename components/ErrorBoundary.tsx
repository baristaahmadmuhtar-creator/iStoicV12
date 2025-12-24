
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';
import { debugService } from '../services/debugService';

interface Props {
  children?: ReactNode;
  viewName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary captures runtime errors in its child component tree.
 * "Fokus pada apa yang ada di depan mata Anda sekarang." — Marcus Aurelius.
 * Menangani kegagalan sistem dengan ketenangan stoik.
 */
export class ErrorBoundary extends Component<Props, State> {
  // DO add comment above each fix.
  // Fix: Explicitly declaring state and props to resolve TypeScript "property does not exist" errors in the current context.
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    // Fix: Initializing state within the constructor after calling super(props).
    this.state = {
      hasError: false,
      error: null
    };
  }

  // The static method for updating state after an error is caught
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Lifecycle method to log error information
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Fix: Accessing this.props.viewName to determine the source of the crash during the catch lifecycle.
    const view = this.props.viewName || 'UNKNOWN';
    debugService.log('ERROR', `BOUNDARY_${view}`, 'CRASH', error.message);
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    // Rebooting the system: focusing on the next immediate action within our control
    window.location.reload();
  };

  render() {
    // Fix: Destructuring hasError and error from this.state in the render method.
    const { hasError, error } = this.state;
    // Fix: Destructuring viewName and children from this.props in the render method.
    const { viewName, children } = this.props;

    // If the module fails, present a clear recovery path
    if (hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center p-6 animate-fade-in bg-[#f8f9fa] dark:bg-[#050505]">
          <div className="glass-card-3d p-8 max-w-md w-full border-red-500/30 bg-red-950/[0.05] shadow-[0_0_50px_rgba(220,38,38,0.1)] flex flex-col items-center text-center">
            
            {/* Hexagon/Icon container */}
            <div className="w-24 h-24 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse-slow">
              <AlertTriangle size={48} strokeWidth={1.5} />
            </div>
            
            <h2 className="text-3xl font-black text-red-500 uppercase italic tracking-tighter mb-2 leading-none">
              SYSTEM FAILURE
            </h2>
            <p className="text-[10px] tech-mono text-red-400/70 font-bold uppercase tracking-[0.3em] mb-8">
              CRITICAL_ERROR_IN_MODULE: {viewName || 'UNKNOWN'}
            </p>
            
            <div className="w-full bg-black/40 p-5 rounded-xl border border-red-500/20 mb-8 text-left relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50"></div>
                <div className="flex items-center gap-2 mb-3 text-red-500/60 border-b border-red-500/10 pb-2">
                    <Terminal size={12} />
                    <span className="text-[8px] font-black uppercase tracking-widest">KERNEL_PANIC_LOG</span>
                </div>
                <p className="text-[11px] font-mono text-red-300/90 break-words leading-relaxed">
                    {error?.message || 'Unknown runtime exception detected.'}
                </p>
            </div>

            <button 
              onClick={this.handleReload}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase text-[11px] tracking-[0.25em] flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-red-500/30 hover:scale-[1.02] active:scale-95"
            >
              <RefreshCw size={16} /> FORCE_REBOOT
            </button>
            <p className="text-[7px] tech-mono text-neutral-500 mt-6 uppercase tracking-widest italic opacity-50">"Hambatan adalah jalan." — Marcus Aurelius</p>
          </div>
        </div>
      );
    }

    // Default rendering path for children
    return children;
  }
}
