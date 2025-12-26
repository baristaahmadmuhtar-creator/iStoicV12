
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
   * Supports VITE_PREFIX and standard process.env
   */
  public refreshPools() {
    const env = { ...((import.meta as any).env || {}), ...((typeof process !== 'undefined' && process.env) || {}) };
    const providers: Provider[] = ['GEMINI', 'GROQ', 'OPENAI', 'DEEPSEEK', 'MISTRAL', 'OPENROUTER', 'ELEVENLABS'];

    providers.forEach(provider => {
        const keys: string[] = [];
        Object.keys(env).forEach(keyName => {
            if (keyName.toUpperCase().includes(provider) && typeof env[keyName] === 'string') {
                const val = env[keyName];
                if (val && val.length > 5) keys.push(val.trim());
            }
        });

        // Initialize or Update Pool
        this.vault[provider] = keys.map(k => ({
            key: k,
            provider,
            status: 'ACTIVE',
            usageCount: 0,
            fails: 0,
            cooldownUntil: 0
        }));
    });
    
    debugService.log('KERNEL', 'HYDRA_VAULT', 'INIT', `Vault initialized with ${Object.values(this.vault).flat().length} keys.`);
  }

  /**
   * Retrieves an available API Key.
   * IMPLEMENTS: Random Active Selection & Emergency Revive Threshold.
   */
  public getKey(provider: Provider): string | null {
    const pool = this.vault[provider];
    if (!pool || pool.length === 0) return null;

    // 1. Try to find ACTIVE keys
    const activeKeys = pool.filter((k) => k.status === 'ACTIVE');

    if (activeKeys.length > 0) {
      // Return a random active key to distribute load (stochastic load balancing)
      const randomKey = activeKeys[Math.floor(Math.random() * activeKeys.length)];
      randomKey.usageCount++;
      return randomKey.key;
    }

    // 2. REVIVE THRESHOLD LOGIC
    // If NO active keys, check COOLDOWN keys.
    // Logic: If a key has < 5000ms remaining in cooldown, we deem it "safe enough"
    // for an emergency revive to prevent total service outage.
    const now = Date.now();
    const emergencyKey = pool.find((k) => {
      return k.status === 'COOLDOWN' && (k.cooldownUntil - now < 5000);
    });

    if (emergencyKey) {
      debugService.log('WARN', 'HYDRA_VAULT', 'EMERGENCY_REVIVE', `Forcing revive on ${provider} key (ending ...${emergencyKey.key.slice(-4)})`);
      emergencyKey.status = 'ACTIVE';
      emergencyKey.cooldownUntil = 0;
      emergencyKey.usageCount++;
      return emergencyKey.key;
    }

    debugService.log('ERROR', 'HYDRA_VAULT', 'EXHAUSTED', `No keys available for ${provider}`);
    return null;
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
    const isRateLimit = errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('402') || errStr.includes('quota');

    keyRecord.fails++;
    keyRecord.status = 'COOLDOWN';

    const now = Date.now();

    // PENALTY LOGIC
    // Rate Limit (429) = 120 Seconds (2 Minutes)
    // Standard Error (500, Network) = 30 Seconds
    const penaltyMs = isRateLimit ? 120_000 : 30_000;
    
    keyRecord.cooldownUntil = now + penaltyMs;

    debugService.log('WARN', 'HYDRA_VAULT', 'PENALTY', `Freezing ${provider} key for ${penaltyMs/1000}s. Reason: ${isRateLimit ? 'RATE_LIMIT' : 'ERROR'}`);

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
