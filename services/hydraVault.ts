
import { debugService } from './debugService';

export type Provider = 'GEMINI' | 'GROQ' | 'OPENAI' | 'DEEPSEEK' | 'MISTRAL' | 'OPENROUTER' | 'ELEVENLABS';
type KeyStatus = 'ACTIVE' | 'COOLDOWN';

interface KeyRecord {
  key: string;
  provider: Provider;
  status: KeyStatus;
  usageCount: number;
  fails: number;
  cooldownUntil: number;
}

export interface ProviderStatus {
    id: string;
    status: 'HEALTHY' | 'COOLDOWN';
    keyCount: number;
    cooldownRemaining: number;
}

export class HydraVault {
  private vault: Record<string, KeyRecord[]> = {};

  constructor() {
      this.refreshPools();
  }

  public refreshPools() {
    // SECURITY UPDATE: Hardcoded keys removed. 
    // Now pulling strictly from Environment Variables injected by Vite/Vercel.
    
    const envKeys: Partial<Record<Provider, string | undefined>> = {
        GEMINI: process.env.VITE_GEMINI_API_KEY || process.env.API_KEY,
        GROQ: process.env.VITE_GROQ_API_KEY,
        OPENAI: process.env.VITE_OPENAI_API_KEY,
        DEEPSEEK: process.env.VITE_DEEPSEEK_API_KEY,
        MISTRAL: process.env.VITE_MISTRAL_API_KEY,
        OPENROUTER: process.env.VITE_OPENROUTER_API_KEY,
        ELEVENLABS: process.env.VITE_ELEVENLABS_API_KEY
    };

    // Reset Vault
    this.vault = {};

    Object.entries(envKeys).forEach(([provider, key]) => {
        if (key && key.trim() !== '') {
            const p = provider as Provider;
            
            // Check for comma-separated keys (Rotation support in Env Var)
            const keys = key.split(',').map(k => k.trim()).filter(k => k.length > 0);
            
            this.vault[p] = keys.map(k => ({
                key: k,
                provider: p,
                status: 'ACTIVE',
                usageCount: 0,
                fails: 0,
                cooldownUntil: 0
            }));
        }
    });
    
    // Check LocalStorage for User Overrides (Settings Menu)
    try {
        const userKeysStr = localStorage.getItem('user_api_keys');
        if (userKeysStr) {
            const userKeys = JSON.parse(userKeysStr);
            Object.entries(userKeys).forEach(([provider, key]) => {
                if (typeof key === 'string' && key.trim() !== '') {
                    const p = provider as Provider;
                    if (!this.vault[p]) this.vault[p] = [];
                    // User keys get priority (unshift)
                    this.vault[p].unshift({
                        key: key.trim(),
                        provider: p,
                        status: 'ACTIVE',
                        usageCount: 0,
                        fails: 0,
                        cooldownUntil: 0
                    });
                }
            });
        }
    } catch (e) {
        console.warn("Failed to load user keys from storage");
    }

    const totalKeys = Object.values(this.vault).reduce((acc, curr) => acc + curr.length, 0);
    debugService.log('KERNEL', 'HYDRA_VAULT', 'SECURE_INIT', `Vault initialized securely. Active Keys: ${totalKeys}`);
  }

  public getKey(provider: Provider): string | null {
    const pool = this.vault[provider];
    if (!pool || pool.length === 0) return null;

    const activeKeys = pool.filter((k) => k.status === 'ACTIVE');
    if (activeKeys.length > 0) {
      // Rotasi acak untuk distribusi beban yang merata
      const randomKey = activeKeys[Math.floor(Math.random() * activeKeys.length)];
      randomKey.usageCount++;
      return randomKey.key;
    }

    const now = Date.now();
    const emergencyKey = pool.find((k) => k.status === 'COOLDOWN' && k.cooldownUntil <= now);
    if (emergencyKey) {
      emergencyKey.status = 'ACTIVE';
      return emergencyKey.key;
    }

    return null;
  }

  public reportFailure(provider: Provider, keyString: string, error: any): void {
    const pool = this.vault[provider];
    const keyRecord = pool?.find((k) => k.key === keyString);
    if (!keyRecord) return;

    const errStr = JSON.stringify(error).toLowerCase();
    const isRateLimit = errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('quota');
    
    keyRecord.fails++;
    keyRecord.status = 'COOLDOWN';
    // Cooldown logic: 60s for Rate Limit, 10s for Generic Error
    keyRecord.cooldownUntil = Date.now() + (isRateLimit ? 60000 : 10000); 
    
    debugService.log('WARN', 'HYDRA_VAULT', 'KEY_OFFLINE', `Key for ${provider} suspended. Reason: ${isRateLimit ? 'RATE_LIMIT' : 'NET_ERROR'}`);
  }

  public reportSuccess(provider: Provider) {
      // Logic for heat-mapping / reliability score could be added here
  }

  public isProviderHealthy(provider: Provider): boolean {
      return this.vault[provider]?.some(k => k.status === 'ACTIVE') || false;
  }

  public getAllProviderStatuses(): ProviderStatus[] {
      return Object.keys(this.vault).map(id => {
          const pool = this.vault[id];
          const hasActive = pool.some(k => k.status === 'ACTIVE');
          const now = Date.now();
          const cooldowns = pool.filter(k => k.status === 'COOLDOWN').map(k => k.cooldownUntil);
          const minCooldown = cooldowns.length > 0 ? Math.max(0, Math.ceil((Math.min(...cooldowns) - now) / 1000 / 60)) : 0;
          
          return {
              id,
              status: hasActive ? 'HEALTHY' : 'COOLDOWN',
              keyCount: pool.length,
              cooldownRemaining: minCooldown
          };
      });
  }
}

export const GLOBAL_VAULT = new HydraVault();
