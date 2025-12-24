
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal, ShieldAlert, ZapOff } from 'lucide-react';
import { debugService } from '../services/debugService';
import { KEY_MANAGER, SANITIZED_ERRORS } from '../services/geminiService';

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
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const view = this.props.viewName || 'UNKNOWN_MODULE';
    const errStr = error.message.toLowerCase();

    // STRICT CLASSIFICATION: GEMINI FATAL ERROR
    // Matches: HTTP 429 "RESOURCE_EXHAUSTED" with "limit: 0"
    // This specifically indicates the Free Tier hard limit or Quota exhaustion.
    const isGeminiFatal = (errStr.includes('429') || errStr.includes('resource_exhausted')) && 
                          errStr.includes('limit: 0');

    if (isGeminiFatal) {
        // 1. Internal Log with full details (for Developer)
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
        
        // 2. Trigger Fallback Mechanism (Mark provider as COOLDOWN/DEAD immediately)
        KEY_MANAGER.reportFailure('GEMINI', error);
    } else {
        // Standard Crash Logging
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
    // Rebooting the system: focusing on the next immediate action within our control
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;
    const { viewName, children } = this.props;

    if (hasError) {
        const errStr = error?.message?.toLowerCase() || '';
        
        // Check strict conditions for UI presentation
        const isGeminiFatal = (errStr.includes('429') || errStr.includes('resource_exhausted')) && 
                              errStr.includes('limit: 0');
        
        // Use Sanitized Message for user, raw message for developer (in logs)
        const displayMessage = isGeminiFatal 
            ? SANITIZED_ERRORS.QUOTA 
            : (process.env.NODE_ENV === 'development' ? error?.message : SANITIZED_ERRORS.DEFAULT);

      return (
        <div className="h-full w-full flex items-center justify-center p-6 animate-fade-in bg-[#f8f9fa] dark:bg-[#050505]">
          <div className={`glass-card-3d p-8 max-w-md w-full shadow-[0_0_50px_rgba(220,38,38,0.1)] flex flex-col items-center text-center ${isGeminiFatal ? 'border-amber-500/30 bg-amber-950/[0.05]' : 'border-red-500/30 bg-red-950/[0.05]'}`}>
            
            {/* Icon Container */}
            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center border mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse-slow ${isGeminiFatal ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
              {isGeminiFatal ? <ZapOff size={48} strokeWidth={1.5} /> : <AlertTriangle size={48} strokeWidth={1.5} />}
            </div>
            
            <h2 className={`text-3xl font-black uppercase italic tracking-tighter mb-2 leading-none ${isGeminiFatal ? 'text-amber-500' : 'text-red-500'}`}>
              {isGeminiFatal ? 'RESOURCE DEPLETED' : 'SYSTEM INTERRUPTION'}
            </h2>
            <p className={`text-[10px] tech-mono font-bold uppercase tracking-[0.3em] mb-8 ${isGeminiFatal ? 'text-amber-400/70' : 'text-red-400/70'}`}>
              MODULE: {viewName || 'KERNEL'} // {isGeminiFatal ? 'QUOTA_LIMIT' : 'RUNTIME_ERR'}
            </p>
            
            {/* Sanitized Log Box */}
            <div className={`w-full bg-black/40 p-5 rounded-xl border mb-8 text-left relative overflow-hidden group ${isGeminiFatal ? 'border-amber-500/20' : 'border-red-500/20'}`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${isGeminiFatal ? 'bg-amber-500/50' : 'bg-red-500/50'}`}></div>
                <div className={`flex items-center gap-2 mb-3 border-b pb-2 ${isGeminiFatal ? 'text-amber-500/60 border-amber-500/10' : 'text-red-500/60 border-red-500/10'}`}>
                    <Terminal size={12} />
                    <span className="text-[8px] font-black uppercase tracking-widest">SYSTEM_LOG</span>
                </div>
                <p className={`text-[11px] font-mono break-words leading-relaxed ${isGeminiFatal ? 'text-amber-300/90' : 'text-red-300/90'}`}>
                    {displayMessage}
                </p>
            </div>

            <button 
              onClick={this.handleReload}
              className={`w-full py-4 text-white rounded-xl font-black uppercase text-[11px] tracking-[0.25em] flex items-center justify-center gap-3 transition-all shadow-lg hover:scale-[1.02] active:scale-95 ${isGeminiFatal ? 'bg-amber-600 hover:bg-amber-500 hover:shadow-amber-500/30' : 'bg-red-600 hover:bg-red-500 hover:shadow-red-500/30'}`}
            >
              <RefreshCw size={16} /> {isGeminiFatal ? 'ROTATE_POOL' : 'REBOOT_SYSTEM'}
            </button>
            <p className="text-[7px] tech-mono text-neutral-500 mt-6 uppercase tracking-widest italic opacity-50">
                {isGeminiFatal ? '"Kekurangan bukanlah akhir, tapi jeda untuk bernapas."' : '"Hambatan adalah jalan."'}
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}
