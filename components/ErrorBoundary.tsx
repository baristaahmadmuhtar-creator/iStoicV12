
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal, ShieldAlert, ZapOff, Copy } from 'lucide-react';
import { debugService } from '../services/debugService';
import { KEY_MANAGER, SANITIZED_ERRORS } from '../services/geminiService';

interface Props {
  children?: ReactNode;
  viewName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary captures runtime errors in its child component tree.
 * "Fokus pada apa yang ada di depan mata Anda sekarang." — Marcus Aurelius.
 * Menangani kegagalan sistem dengan ketenangan stoik.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    const view = this.props.viewName || 'UNKNOWN_MODULE';
    const errStr = error.message.toLowerCase();

    // STRICT CLASSIFICATION: GEMINI FATAL ERROR
    const isGeminiFatal = (errStr.includes('429') || errStr.includes('resource_exhausted')) && 
                          errStr.includes('limit: 0');

    if (isGeminiFatal) {
        debugService.log(
            'ERROR', 
            `BOUNDARY_${view}`, 
            'FATAL_GEMINI_QUOTA', 
            'Gemini Provider marked FATAL (429/Limit:0). Triggering Kill-Switch.', 
            { 
                originalError: error.message, 
                stack: error.stack,
                componentStack: errorInfo.componentStack 
            }
        );
        KEY_MANAGER.reportFailure('GEMINI', error);
    } else {
        debugService.log(
          'ERROR', 
          `BOUNDARY_${view}`, 
          'CRASH', 
          error.message,
          { componentStack: errorInfo.componentStack }
        );
    }
    
    console.error("Uncaught error in module:", view, error);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
      if(confirm("Factory Reset: Ini akan menghapus semua LocalStorage untuk memperbaiki state yang korup. Lanjutkan?")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { viewName, children } = this.props;

    if (hasError) {
        const errStr = error?.message?.toLowerCase() || '';
        
        const isGeminiFatal = (errStr.includes('429') || errStr.includes('resource_exhausted')) && 
                              errStr.includes('limit: 0');
        
        // FORCE SHOW REAL ERROR FOR DEBUGGING
        const displayMessage = error?.message || "Unknown Error";
        const stackTrace = errorInfo?.componentStack || error?.stack || "";

      return (
        <div className="h-full w-full flex items-center justify-center p-6 animate-fade-in bg-[#f8f9fa] dark:bg-[#050505] overflow-y-auto">
          <div className={`glass-card-3d p-8 max-w-lg w-full shadow-[0_0_50px_rgba(220,38,38,0.1)] flex flex-col items-center text-center ${isGeminiFatal ? 'border-amber-500/30 bg-amber-950/[0.05]' : 'border-red-500/30 bg-red-950/[0.05]'}`}>
            
            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center border mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse-slow ${isGeminiFatal ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
              {isGeminiFatal ? <ZapOff size={48} strokeWidth={1.5} /> : <AlertTriangle size={48} strokeWidth={1.5} />}
            </div>
            
            <h2 className={`text-3xl font-black uppercase italic tracking-tighter mb-2 leading-none ${isGeminiFatal ? 'text-amber-500' : 'text-red-500'}`}>
              {isGeminiFatal ? 'RESOURCE DEPLETED' : 'SYSTEM INTERRUPTION'}
            </h2>
            <p className={`text-[10px] tech-mono font-bold uppercase tracking-[0.3em] mb-8 ${isGeminiFatal ? 'text-amber-400/70' : 'text-red-400/70'}`}>
              MODULE: {viewName || 'KERNEL'} // {isGeminiFatal ? 'QUOTA_LIMIT' : 'RUNTIME_EXCEPTION'}
            </p>
            
            {/* DEBUG ERROR LOG BOX */}
            <div className={`w-full bg-black/80 p-4 rounded-xl border mb-6 text-left relative overflow-hidden group max-h-60 overflow-y-auto custom-scroll ${isGeminiFatal ? 'border-amber-500/20' : 'border-red-500/20'}`}>
                <div className={`flex items-center justify-between mb-2 pb-2 border-b ${isGeminiFatal ? 'border-amber-500/10' : 'border-red-500/10'}`}>
                    <div className="flex items-center gap-2 text-white/50">
                        <Terminal size={12} />
                        <span className="text-[8px] font-black uppercase tracking-widest">ERROR_STACK_TRACE</span>
                    </div>
                </div>
                <p className="text-[11px] font-mono break-words leading-relaxed text-red-300 font-bold mb-2">
                    {displayMessage}
                </p>
                <pre className="text-[9px] font-mono text-neutral-500 whitespace-pre-wrap">
                    {stackTrace}
                </pre>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
                <button 
                  onClick={this.handleReload}
                  className={`w-full py-4 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.02] active:scale-95 ${isGeminiFatal ? 'bg-amber-600 hover:bg-amber-500' : 'bg-red-600 hover:bg-red-500'}`}
                >
                  <RefreshCw size={14} /> REBOOT
                </button>
                
                <button 
                  onClick={this.handleReset}
                  className="w-full py-4 bg-zinc-800 text-neutral-400 hover:text-white hover:bg-zinc-700 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.02] active:scale-95 border border-white/5"
                >
                  <ShieldAlert size={14} /> FACTORY RESET
                </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
