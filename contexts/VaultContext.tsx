
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

interface VaultContextType {
    isVaultUnlocked: boolean;
    unlockVault: () => void;
    lockVault: () => void;
    isVaultConfigEnabled: (persona: 'melsa' | 'stoic') => boolean;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Session-based state (resets on refresh for security)
    const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);

    // Persistent Configs
    const [melsaConfig] = useLocalStorage('melsa_tools_config', { search: true, vault: true, visual: true });
    const [stoicConfig] = useLocalStorage('stoic_tools_config', { search: true, vault: true, visual: false });

    const unlockVault = useCallback(() => setIsVaultUnlocked(true), []);
    const lockVault = useCallback(() => setIsVaultUnlocked(false), []);

    const isVaultConfigEnabled = useCallback((persona: 'melsa' | 'stoic') => {
        return persona === 'melsa' ? melsaConfig.vault : stoicConfig.vault;
    }, [melsaConfig, stoicConfig]);

    // SECURITY: Auto-lock if the active configuration disables the vault
    useEffect(() => {
        // We check both. If user disables vault globally in settings, we lock immediately.
        if (!melsaConfig.vault && !stoicConfig.vault && isVaultUnlocked) {
            console.warn("[SECURITY] Vault disabled in settings. Locking session.");
            setIsVaultUnlocked(false);
        }
    }, [melsaConfig, stoicConfig, isVaultUnlocked]);

    return (
        <VaultContext.Provider value={{ isVaultUnlocked, unlockVault, lockVault, isVaultConfigEnabled }}>
            {children}
        </VaultContext.Provider>
    );
};

export const useVault = () => {
    const context = useContext(VaultContext);
    if (!context) {
        throw new Error('useVault must be used within a VaultProvider');
    }
    return context;
};
