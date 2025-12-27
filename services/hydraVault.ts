
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
   * EXCLUSIVELY uses Environment Variables.
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
                cleanVal = cleanVal.replace(/[\n|\s;]/g, ','); 
                cleanVal = cleanVal.replace(/\\n/g, ','); 

                // 3. Split by comma (to handle multi-key string in one var)
                const parts = cleanVal.split(',');

                parts.forEach(v => {
                    const trimmed = v.trim();
                    if (trimmed.length > 10) { 
                        keys.add(trimmed);
                    }
                });
            }
        };

        // 1. Explicit Numbered Scan (VITE_GROQ_API_KEY_1 ... 50)
        // Scan up to 50 to ensure we catch all your keys
        for (let i = 1; i <= 50; i++) {
            addKey(env[`VITE_${provider}_KEY_${i}`]);
            addKey(env[`${provider}_KEY_${i}`]);
            addKey(env[`VITE_${provider}_API_KEY_${i}`]);
            addKey(env[`${provider}_API_KEY_${i}`]);
        }

        // 2. Generic Scan (Backups)
        Object.keys(env).forEach(keyName => {
            if (keyName.toUpperCase().includes(provider)) {
                addKey(env[keyName]);
            }
        });

        // Initialize or Update Pool
        // Preserve usageCount if key already exists to maintain rotation logic across reloads if persistent
        this.vault[provider] = Array.from(keys).map(k => {
            const existing = this.vault[provider]?.find(ex => ex.key === k);
            return {
                key: k,
                provider,
                status: 'ACTIVE',
                usageCount: existing ? existing.usageCount : 0,
                fails: 0,
                cooldownUntil: 0
            };
        });
    });
    
    const totalKeys = Object.values(this.vault).flat().length;
    console.log(`[HYDRA] Vault initialized. Total Keys: ${totalKeys}`);
  }

  /**
   * Retrieves an available API Key using LEAST-USED strategy.
   * This ensures strict rotation: Key 1 -> Key 2 -> ... -> Key 8 -> Key 1.
   */
  public getKey(provider: Provider): string | null {
    const pool = this.vault[provider];
    if (!pool || pool.length === 0) return null;

    // 1. Try to find ACTIVE keys
    const activeKeys = pool.filter((k) => k.status === 'ACTIVE');

    if (activeKeys.length > 0) {
      // SORT BY USAGE COUNT ASCENDING (Least Used First)
      // This forces the system to use fresh keys before reusing old ones.
      activeKeys.sort((a, b) => a.usageCount - b.usageCount);
      
      const bestKey = activeKeys[0];
      bestKey.usageCount++;
      
      // Log usage for debugging balance
      // console.debug(`[HYDRA] Selected ${provider} key (Used: ${bestKey.usageCount} times)`);
      
      return bestKey.key;
    }

    // 2. REVIVE LOGIC: Check COOLDOWN keys
    const now = Date.now();
    const emergencyKey = pool.find((k) => {
      return k.status === 'COOLDOWN' && k.cooldownUntil <= now;
    });

    if (emergencyKey) {
      debugService.log('INFO', 'HYDRA_VAULT', 'REVIVE', `Restoring ${provider} key from cooldown.`);
      emergencyKey.status = 'ACTIVE';
      emergencyKey.cooldownUntil = 0;
      emergencyKey.usageCount++;
      return emergencyKey.key;
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
    
    // DETECT 429 / RATE LIMITS (Specific patterns for Groq/Gemini)
    const isRateLimit = 
        errStr.includes('429') || 
        errStr.includes('resource_exhausted') || 
        errStr.includes('quota') || 
        errStr.includes('rate limit') ||
        errStr.includes('too many requests');

    keyRecord.fails++;
    keyRecord.status = 'COOLDOWN';

    const now = Date.now();

    // PENALTY LOGIC
    // Rate Limit (429) = 60 Seconds (Give it a full minute to recover)
    // Standard Error = 10 Seconds
    const penaltyMs = isRateLimit ? 60_000 : 10_000;
    
    keyRecord.cooldownUntil = now + penaltyMs;

    debugService.log('WARN', 'HYDRA_VAULT', 'PENALTY', `Freezing ${provider} key for ${penaltyMs/1000}s. Reason: ${isRateLimit ? 'RATE_LIMIT_429' : 'ERROR'}`);

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
      // We don't reset usageCount because we want cumulative balancing
  }

  public isProviderHealthy(provider: Provider): boolean {
      const pool = this.vault[provider];
      if (!pool) return false;
      // It's healthy if at least one key is ACTIVE or ready to be revived
      const now = Date.now();
      return pool.some(k => k.status === 'ACTIVE' || (k.status === 'COOLDOWN' && k.cooldownUntil <= now));
  }

  public getAllProviderStatuses(): ProviderStatus[] {
      return Object.keys(this.vault).map(id => {
          const pool = this.vault[id];
          const hasActive = pool.some(k => k.status === 'ACTIVE');
          
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
