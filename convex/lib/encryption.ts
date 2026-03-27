/**
 * AES-GCM encryption utility using Web Crypto API.
 * Works in both Convex runtimes (edge and node).
 */

function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET environment variable is required");
  return secret;
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = getEncryptionSecret();
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret.padEnd(32, "0").slice(0, 32));
  
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string using AES-GCM.
 * Returns a string in format: iv:encryptedData (both base64 encoded)
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const ivBase64 = btoa(String.fromCharCode(...iv));
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));

  return `${ivBase64}:${encryptedBase64}`;
}

/**
 * Decrypts an AES-GCM encrypted string.
 */
export async function decrypt(encryptedData: string): Promise<string> {
  const key = await getEncryptionKey();
  
  const [ivBase64, dataBase64] = encryptedData.split(":");
  if (!ivBase64 || !dataBase64) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  const encryptedBuffer = Uint8Array.from(atob(dataBase64), c => c.charCodeAt(0));

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Checks if a string appears to be encrypted
 */
export function isEncrypted(data: string): boolean {
  if (!data || typeof data !== "string") return false;
  const parts = data.split(":");
  if (parts.length !== 2) return false;
  
  try {
    atob(parts[0]);
    atob(parts[1]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe decrypt - returns input if not encrypted (backwards compatibility)
 */
export async function safeDecrypt(data: string | undefined): Promise<string | undefined> {
  if (!data) return undefined;
  if (!isEncrypted(data)) return data;
  return decrypt(data);
}
