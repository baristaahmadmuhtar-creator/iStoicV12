
/**
 * Konversi string PIN menjadi SHA-256 Hash.
 * Ini memastikan PIN asli tidak pernah terekspos di source code atau bundle JS.
 */
export const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

/**
 * Derives a cryptographic Key from the PIN using PBKDF2.
 * Used for encrypting actual content, not just auth check.
 */
const deriveKey = async (pin: string, salt: Uint8Array): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(pin),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
};

/**
 * Encrypts a string using AES-GCM and the user's PIN.
 * Returns JSON string containing { iv, salt, data }.
 */
export const encryptData = async (text: string, pin: string): Promise<string | null> => {
    try {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(pin, salt);
        const enc = new TextEncoder();
        
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(text)
        );

        // Convert buffers to Base64 for storage
        const bufferToBase64 = (buf: Uint8Array) => btoa(String.fromCharCode(...buf));
        
        return JSON.stringify({
            salt: bufferToBase64(salt),
            iv: bufferToBase64(iv),
            data: bufferToBase64(new Uint8Array(encrypted))
        });
    } catch (e) {
        console.error("Encryption Failed:", e);
        return null;
    }
};

/**
 * Decrypts a string using AES-GCM and the user's PIN.
 */
export const decryptData = async (encryptedJson: string, pin: string): Promise<string | null> => {
    try {
        const payload = JSON.parse(encryptedJson);
        const base64ToBuffer = (str: string) => Uint8Array.from(atob(str), c => c.charCodeAt(0));
        
        const salt = base64ToBuffer(payload.salt);
        const iv = base64ToBuffer(payload.iv);
        const data = base64ToBuffer(payload.data);
        
        const key = await deriveKey(pin, salt);
        
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            data
        );
        
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error("Decryption Failed:", e);
        return null;
    }
};

/**
 * Memverifikasi input PIN terhadap Hash yang tersimpan.
 */
export const verifySystemPin = async (inputPin: string): Promise<boolean> => {
    if (!inputPin) return false;
    
    const inputHash = await hashPin(inputPin);
    
    // 1. Check Environment Variable
    const envHash = (
        (process.env as any).VITE_VAULT_PIN_HASH || 
        (import.meta as any).env?.VITE_VAULT_PIN_HASH || 
        ''
    ).toLowerCase();

    if (envHash) return inputHash === envHash;

    // 2. Check Local Storage
    const localHash = localStorage.getItem('sys_vault_hash');
    if (localHash) return inputHash === localHash;

    return false;
};

/**
 * Menyimpan PIN baru ke LocalStorage (Hashing dilakukan sebelum simpan).
 */
export const setSystemPin = async (newPin: string): Promise<void> => {
    const hash = await hashPin(newPin);
    localStorage.setItem('sys_vault_hash', hash);
};

export const isSystemPinConfigured = (): boolean => {
    const envHash = (
        (process.env as any).VITE_VAULT_PIN_HASH || 
        (import.meta as any).env?.VITE_VAULT_PIN_HASH
    );
    const localHash = localStorage.getItem('sys_vault_hash');
    return !!(envHash || localHash);
};
