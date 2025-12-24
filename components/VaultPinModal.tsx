
import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Unlock, X, AlertCircle, Fingerprint } from 'lucide-react';

interface VaultPinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const VaultPinModal: React.FC<VaultPinModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);
    // Fix: Declaring inputRef constant
    const inputRef = useRef<HTMLInputElement>(null);

    // Get PIN from env, NO SAFE FALLBACK for production integrity
    // Fix: Explicitly casting import.meta to any to resolve property access error in TypeScript.
    const SYSTEM_PIN = (
        (process.env as any).VITE_VAULT_PIN || 
        (import.meta as any).env?.VITE_VAULT_PIN || 
        'SET_PIN_IN_VERCEL'
    );

    useEffect(() => {
        if (isOpen) {
            setPin('');
            setError(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        
        if (pin === SYSTEM_PIN && SYSTEM_PIN !== 'SET_PIN_IN_VERCEL') {
            onSuccess();
            onClose();
        } else {
            setError(true);
            setShake(true);
            setPin('');
            setTimeout(() => setShake(false), 500);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className={`
                relative w-full max-w-sm bg-[#0a0a0b] border border-white/10 rounded-[32px] p-8 
                shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6
                ${shake ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}
            `}>
                <button onClick={onClose} className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${error ? 'bg-red-500/10 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-accent/10 text-accent shadow-[0_0_30px_var(--accent-glow)]'}`}>
                    {error ? <AlertCircle size={32} /> : <Shield size={32} />}
                </div>

                <div className="text-center space-y-2">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                        {error ? 'ACCESS DENIED' : 'SECURITY CLEARANCE'}
                    </h3>
                    <p className="text-[10px] tech-mono font-bold text-neutral-500 uppercase tracking-widest">
                        {error ? 'INVALID CREDENTIALS' : 'ENTER VAULT PIN TO DECRYPT'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="w-full relative">
                    <input 
                        ref={inputRef}
                        type="password" 
                        value={pin}
                        onChange={(e) => { setPin(e.target.value); setError(false); }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-2xl font-black text-white tracking-[0.5em] focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all placeholder:text-white/10"
                        placeholder="••••••"
                        maxLength={10}
                        autoComplete="off"
                    />
                    <Fingerprint className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={20} />
                </form>

                <button 
                    onClick={() => handleSubmit()}
                    className="w-full py-4 bg-white text-black hover:bg-accent hover:text-black transition-all rounded-xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95"
                >
                    {error ? <Lock size={14} /> : <Unlock size={14} />} {error ? 'RETRY AUTH' : 'AUTHENTICATE'}
                </button>

                <p className="text-[8px] text-neutral-600 font-mono text-center">
                    SECURE_ENCLAVE_V13.5 // HARDWARE_ENCRYPTION_ACTIVE
                </p>
            </div>
            <style>{`
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            `}</style>
        </div>
    );
};