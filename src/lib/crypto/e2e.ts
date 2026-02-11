/**
 * E2E Encryption using Web Crypto API.
 *
 * ECDH P-256 key agreement → AES-256-GCM symmetric encryption.
 * Private keys are non-extractable to prevent exfiltration.
 */

/** Generate an ECDH P-256 key pair. Private key is non-extractable. */
export async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false, // non-extractable
    ['deriveKey', 'deriveBits']
  );
}

/** Export a public key to base64-encoded SPKI format. */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', key);
  return arrayBufferToBase64(exported);
}

/** Import a base64-encoded SPKI public key. */
export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64);
  return crypto.subtle.importKey(
    'spki',
    buffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

/** Derive an AES-256-GCM key from our private key and their public key. */
export async function deriveSharedSecret(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
}

/** Encrypt plaintext with AES-256-GCM. Returns { iv, ciphertext } as base64. */
export async function encrypt(
  key: CryptoKey,
  plaintext: string
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return {
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertext),
  };
}

/** Decrypt AES-256-GCM ciphertext. Takes base64-encoded iv and ciphertext. */
export async function decrypt(
  key: CryptoKey,
  iv: string,
  ciphertext: string
): Promise<string> {
  const ivBuffer = base64ToArrayBuffer(iv);
  const ctBuffer = base64ToArrayBuffer(ciphertext);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    ctBuffer
  );
  return new TextDecoder().decode(decrypted);
}

/** Convert ArrayBuffer to base64 string. */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Convert base64 string to ArrayBuffer. */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
