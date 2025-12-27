
import { debugService } from './debugService';

export type Provider = 'GEMINI' | 'GROQ' | 'OPENAI' | 'DEEPSEEK' | 'MISTRAL' | 'OPENROUTER' | 'ELEVENLABS';
type KeyStatus = 'ACTIVE' | 'COOLDOWN';

interface KeyRecord {
  key: string;
  provider: Provider;
  status: KeyStatus;
  usageCount: number;
  fails: number;
  cooldownUntil: number; // Timestamp
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

  /**
   * Scans environment variables to populate the vault.
   * EXCLUSIVELY uses Environment Variables. User LocalStorage keys are no longer supported.
   */
  public refreshPools() {
    const env = { ...((import.meta as any).env || {}), ...((typeof process !== 'undefined' && process.env) || {}) };
    const providers: Provider[] = ['GEMINI', 'GROQ', 'OPENAI', 'DEEPSEEK', 'MISTRAL', 'OPENROUTER', 'ELEVENLABS'];

    // READ PROVIDER VISIBILITY (ON/OFF TOGGLES)
    let visibility: Record<string, boolean> = {};
    try {
        if (typeof window !== 'undefined') {
            const stored = window.localStorage.getItem('provider_visibility');
            if (stored) visibility = JSON.parse(stored);
        }
    } catch (e) {
        // ignore
    }

    providers.forEach(provider => {
        // If provider is explicitly disabled in settings, skip it entirely
        if (visibility[provider] === false) {
            this.vault[provider] = [];
            return;
        }

        const keys = new Set<string>(); // Use Set to avoid duplicates
        
        // Helper to add keys (handles commas, quotes, PIPES, NEWLINES, SEMICOLONS, SPACES)
        const addKey = (val: string | undefined) => {
            if (val && typeof val === 'string' && val.length > 5) {
                // 1. Remove quotes
                let cleanVal = val.replace(/['"]/g, '').trim();
                
                // 2. Normalize delimiters: Replace newlines, pipes, semicolons, and literal "\n" with commas
                cleanVal = cleanVal.replace(/[\n|\s;]/g, ','); // Also handle spaces as separators if accidental
                cleanVal = cleanVal.replace(/\\n/g, ','); // Handle escaped newlines from some env UIs

                // 3. Split by comma
                const parts = cleanVal.split(',');

                parts.forEach(v => {
                    const trimmed = v.trim();
                    // Basic validation: Gemini keys usually start with AIza, length check
                    if (trimmed.length > 10) { 
                        keys.add(trimmed);
                    }
                });
            }
        };

        // 1. Generic Scan (Includes provider name)
        Object.keys(env).forEach(keyName => {
            if (keyName.toUpperCase().includes(provider)) {
                addKey(env[keyName]);
            }
        });

        // 2. Explicit Standard Names (Backup)
        addKey(env[`VITE_${provider}_API_KEY`]);
        addKey(env[`${provider}_API_KEY`]);

        // 3. Explicit Numbered Scan (Force check for VITE_GEMINI_KEY_1 to 50)
        for (let i = 1; i <= 50; i++) {
            addKey(env[`VITE_${provider}_KEY_${i}`]);
            addKey(env[`${provider}_KEY_${i}`]);
            addKey(env[`VITE_${provider}_API_KEY_${i}`]);
            addKey(env[`${provider}_API_KEY_${i}`]);
        }

        // Initialize or Update Pool
        this.vault[provider] = Array.from(keys).map(k => ({
            key: k,
            provider,
            status: 'ACTIVE',
            usageCount: 0,
            fails: 0,
            cooldownUntil: 0
        }));
    });
    
    const totalKeys = Object.values(this.vault).flat().length;
    console.log(`[HYDRA] Vault initialized. Total Keys: ${totalKeys}`);
    
    // Log detailed breakdown for debugging (without exposing full keys)
    providers.forEach(p => {
        const count = this.vault[p]?.length || 0;
        if (count > 0) {
            console.log(`[HYDRA] ${p}: ${count} keys loaded.`);
        }
    });
    
    debugService.log('KERNEL', 'HYDRA_VAULT', 'INIT', `Vault initialized with ${totalKeys} keys across ${providers.length} providers.`);
  }

  /**
   * Retrieves an available API Key.
   * IMPLEMENTS: Random Load Balancing & Emergency Revive.
   * CHANGED: Random selection is statistically better for avoiding 429 hotspots than Round-Robin/Least-Used.
   */
  public getKey(provider: Provider): string | null {
    const pool = this.vault[provider];
    if (!pool || pool.length === 0) return null;

    // 1. Try to find ACTIVE keys
    const activeKeys = pool.filter((k) => k.status === 'ACTIVE');

    if (activeKeys.length > 0) {
      // Pick RANDOM key from active pool to distribute load instantly
      const randomIndex = Math.floor(Math.random() * activeKeys.length);
      const bestKey = activeKeys[randomIndex];
      
      bestKey.usageCount++;
      return bestKey.key;
    }

    // 2. REVIVE THRESHOLD LOGIC
    // If NO active keys, check COOLDOWN keys that are close to expiry or expired.
    const now = Date.now();
    const emergencyKey = pool.find((k) => {
      // If cooldown is expired OR less than 5s remaining
      return k.status === 'COOLDOWN' && (k.cooldownUntil <= now || (k.cooldownUntil - now < 5000));
    });

    if (emergencyKey) {
      debugService.log('WARN', 'HYDRA_VAULT', 'EMERGENCY_REVIVE', `Forcing revive on ${provider} key (ending ...${emergencyKey.key.slice(-4)})`);
      emergencyKey.status = 'ACTIVE';
      emergencyKey.cooldownUntil = 0;
      emergencyKey.usageCount++;
      return emergencyKey.key;
    }

    // 3. DESPERATE MEASURE: Just pick ANY key if all else fails
    const desperateKey = pool[Math.floor(Math.random() * pool.length)];
    if (desperateKey) {
         debugService.log('WARN', 'HYDRA_VAULT', 'DESPERATE_PICK', `All keys in cooldown. Forcing retry on random key.`);
         return desperateKey.key;
    }

    debugService.log('ERROR', 'HYDRA_VAULT', 'EXHAUSTED', `No keys available for ${provider}. All ${pool.length} keys in cooldown.`);
    return null;
  }

  /**
   * Checks if there are other ACTIVE keys available for a provider.
   * Used by Kernel to decide whether to retry same model or switch providers.
   */
  public hasAlternativeKeys(provider: Provider): boolean {
      const pool = this.vault[provider];
      if (!pool) return false;
      return pool.some(k => k.status === 'ACTIVE');
  }

  /**
   * Reports a key failure and applies penalty logic.
   */
  public reportFailure(provider: Provider, keyString: string, error: any): void {
    const pool = this.vault[provider];
    const keyRecord = pool?.find((k) => k.key === keyString);

    if (!keyRecord) return;

    const errStr = JSON.stringify(error).toLowerCase();
    // 429 = Rate Limit, 402 = Quota Exceeded / Payment Required
    const isRateLimit = errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('402') || errStr.includes('quota') || errStr.includes('capacity') || errStr.includes('limit');

    keyRecord.fails++;
    keyRecord.status = 'COOLDOWN';

    const now = Date.now();

    // PENALTY LOGIC
    // Rate Limit (429) = 45 Seconds (Increased slightly to ensure Groq resets)
    // Standard Error (500, Network) = 15 Seconds
    const penaltyMs = isRateLimit ? 45_000 : 15_000;
    
    keyRecord.cooldownUntil = now + penaltyMs;

    debugService.log('WARN', 'HYDRA_VAULT', 'PENALTY', `Freezing ${provider} key (...${keyRecord.key.slice(-4)}) for ${penaltyMs/1000}s. Reason: ${isRateLimit ? 'RATE_LIMIT' : 'ERROR'}`);

    // Auto-heal scheduling
    setTimeout(() => {
      if (keyRecord.status === 'COOLDOWN' && keyRecord.cooldownUntil <= Date.now()) {
        keyRecord.status = 'ACTIVE';
        keyRecord.cooldownUntil = 0;
        debugService.log('INFO', 'HYDRA_VAULT', 'HEAL', `${provider} key recovered.`);
      }
    }, penaltyMs);
  }

  public reportSuccess(provider: Provider) {
      // Optional: Reset fail count on success if implementing partial forgiveness
  }

  public isProviderHealthy(provider: Provider): boolean {
      return !!this.getKey(provider);
  }

  public getAllProviderStatuses(): ProviderStatus[] {
      return Object.keys(this.vault).map(id => {
          const pool = this.vault[id];
          const hasActive = pool.some(k => k.status === 'ACTIVE');
          
          // Calculate max cooldown remaining for display
          let maxCooldown = 0;
          if (!hasActive) {
              const now = Date.now();
              maxCooldown = Math.max(0, ...pool.map(k => Math.ceil((k.cooldownUntil - now) / 1000 / 60)));
          }

          return {
              id, 
              status: hasActive ? 'HEALTHY' : 'COOLDOWN', 
              keyCount: pool.length,
              cooldownRemaining: maxCooldown
          };
      });
  }
}

export const GLOBAL_VAULT = new HydraVault();
