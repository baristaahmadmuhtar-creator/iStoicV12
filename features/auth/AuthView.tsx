
import React, { useState, useEffect, useRef } from 'react';
import { Shield, ArrowRight, Loader2, Fingerprint, Terminal, AlertTriangle, Lock } from 'lucide-react';

interface AuthViewProps {
    onAuthSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passcode, setPasscode] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // REAL SECURITY: Verify against Environment Variable
    // Casting import.meta to any to avoid TS errors in this context
    const SYSTEM_KEY = (
        (process.env as any).VITE_VAULT_PIN || 
        (import.meta as any).env?.VITE_VAULT_PIN || 
        '123456' // Default fallback for dev, warns in production
    );

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
        if (SYSTEM_KEY === '123456') {
            console.warn("⚠️ SECURITY WARNING: Using default access code '123456'. Set VITE_VAULT_PIN in .env for production.");
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Simulate network handshake delay for UX
        setTimeout(() => {
            if (passcode === SYSTEM_KEY) {
                onAuthSuccess();
            } else {
                setError("ACCESS_DENIED: Invalid Passcode.");
                setPasscode('');
            }
            setLoading(false);
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-[#050505] flex items-center justify-center p-4">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] bg-accent/5 blur-[150px] animate-pulse-slow"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            </div>

            <div className="relative w-full max-w-sm">
                {/* Header */}
                <div className="text-center mb-10 animate-slide-down">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-[0_0_60px_var(--accent-glow)] mb-6 relative group">
                        <div className="absolute inset-0 rounded-[32px] border border-accent/20 animate-pulse"></div>
                        <Fingerprint size={48} className="text-accent relative z-10" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase mb-2 leading-none">
                        IStoic<span className="text-accent">AI</span>
                    </h1>
                    <div className="flex items-center justify-center gap-2 text-neutral-500">
                        <Terminal size={12} />
                        <p className="text-[9px] tech-mono font-bold uppercase tracking-[0.4em]">
                            SECURE_ACCESS_V13.5
                        </p>
                    </div>
                </div>

                {/* Auth Terminal */}
                <div className="bg-[#0a0a0b]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden animate-slide-up group hover:border-accent/30 transition-colors duration-500">
                    
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-fade-in">
                            <AlertTriangle className="text-red-500 shrink-0" size={16} />
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2 flex items-center gap-2">
                                <Lock size={10} /> Identity Passcode
                            </label>
                            <div className="relative">
                                <input 
                                    ref={inputRef}
                                    type="password" 
                                    value={passcode}
                                    onChange={e => { setPasscode(e.target.value); setError(null); }}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-center text-xl font-black text-white tracking-[0.5em] focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all placeholder:text-neutral-800 focus:shadow-[0_0_30px_rgba(var(--accent-rgb),0.1)]"
                                    placeholder="••••••"
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || !passcode} 
                            className="w-full py-5 bg-white text-black hover:bg-accent hover:text-black rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed group/btn"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <>INITIALIZE_LINK <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" /></>}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[8px] text-neutral-600 font-mono uppercase tracking-widest">
                            ENCRYPTED_SESSION // LOCAL_STORAGE_PERSISTENCE
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
