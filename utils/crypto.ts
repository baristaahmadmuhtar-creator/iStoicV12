
/**
 * Konversi string PIN menjadi SHA-256 Hash.
 * Ini memastikan PIN asli tidak pernah terekspos di source code atau bundle JS.
 * @param pin String PIN input (misal: "123456")
 * @returns String Hex Hash (misal: "8d969eef...")
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
 * Memverifikasi apakah input PIN cocok dengan Hash yang tersimpan di Environment.
 * @param inputPin PIN yang dimasukkan user
 * @param storedHash Hash yang ada di .env (VITE_VAULT_PIN_HASH)
 */
export const verifyPin = async (inputPin: string, storedHash: string): Promise<boolean> => {
    if (!inputPin || !storedHash) return false;
    const inputHash = await hashPin(inputPin);
    return inputHash === storedHash.toLowerCase();
};
