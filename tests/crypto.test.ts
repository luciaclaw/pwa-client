import { describe, it, expect } from 'vitest';
import {
  generateECDHKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  encrypt,
  decrypt,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from '../src/lib/crypto/e2e.js';

describe('Base64 helpers', () => {
  it('round-trips ArrayBuffer through base64', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]);
    const b64 = arrayBufferToBase64(original.buffer);
    const recovered = new Uint8Array(base64ToArrayBuffer(b64));
    expect(recovered).toEqual(original);
  });

  it('handles empty buffer', () => {
    const empty = new Uint8Array([]);
    const b64 = arrayBufferToBase64(empty.buffer);
    expect(b64).toBe('');
    const recovered = new Uint8Array(base64ToArrayBuffer(b64));
    expect(recovered.length).toBe(0);
  });
});

describe('ECDH key generation', () => {
  it('generates a key pair', async () => {
    const keyPair = await generateECDHKeyPair();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicKey.algorithm.name).toBe('ECDH');
    expect(keyPair.privateKey.extractable).toBe(false);
  });

  it('exports and imports public key', async () => {
    const keyPair = await generateECDHKeyPair();
    const exported = await exportPublicKey(keyPair.publicKey);
    expect(typeof exported).toBe('string');
    expect(exported.length).toBeGreaterThan(0);

    const imported = await importPublicKey(exported);
    expect(imported.algorithm.name).toBe('ECDH');
  });
});

describe('E2E encryption', () => {
  it('derives shared secret and encrypts/decrypts', async () => {
    // Simulate client and server
    const clientKeys = await generateECDHKeyPair();
    const serverKeys = await generateECDHKeyPair();

    // Derive shared secrets (should be identical)
    const clientSecret = await deriveSharedSecret(clientKeys.privateKey, serverKeys.publicKey);
    const serverSecret = await deriveSharedSecret(serverKeys.privateKey, clientKeys.publicKey);

    // Encrypt with client's key, decrypt with server's key
    const plaintext = 'Hello, Lucia! This is a secret message.';
    const { iv, ciphertext } = await encrypt(clientSecret, plaintext);

    expect(iv).toBeDefined();
    expect(ciphertext).toBeDefined();

    const decrypted = await decrypt(serverSecret, iv, ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('uses different IVs for each encryption', async () => {
    const clientKeys = await generateECDHKeyPair();
    const serverKeys = await generateECDHKeyPair();
    const secret = await deriveSharedSecret(clientKeys.privateKey, serverKeys.publicKey);

    const msg = 'same message';
    const enc1 = await encrypt(secret, msg);
    const enc2 = await encrypt(secret, msg);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });

  it('fails to decrypt with wrong key', async () => {
    const keys1 = await generateECDHKeyPair();
    const keys2 = await generateECDHKeyPair();
    const keys3 = await generateECDHKeyPair();

    const correctSecret = await deriveSharedSecret(keys1.privateKey, keys2.publicKey);
    const wrongSecret = await deriveSharedSecret(keys3.privateKey, keys2.publicKey);

    const { iv, ciphertext } = await encrypt(correctSecret, 'secret data');

    await expect(decrypt(wrongSecret, iv, ciphertext)).rejects.toThrow();
  });

  it('handles unicode content', async () => {
    const clientKeys = await generateECDHKeyPair();
    const serverKeys = await generateECDHKeyPair();
    const secret = await deriveSharedSecret(clientKeys.privateKey, serverKeys.publicKey);

    const unicode = 'Hello! Encrypted content with unicode.';
    const { iv, ciphertext } = await encrypt(secret, unicode);
    const decrypted = await decrypt(secret, iv, ciphertext);
    expect(decrypted).toBe(unicode);
  });
});
