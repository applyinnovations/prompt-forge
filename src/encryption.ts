/**
 * Encryption utilities for secure API key storage
 * Uses AES-256-GCM with PBKDF2 key derivation
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_ITERATIONS = 100000; // High iteration count for security
const KEY_LENGTH = 256;

/**
 * Encrypt data using AES-256-GCM with PBKDF2 key derivation
 */
export async function encryptData(data: string, password: string): Promise<string> {
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Derive key from password using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: KEY_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt']
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt the data
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    new TextEncoder().encode(data)
  );

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  // Return as base64 string
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-256-GCM with PBKDF2 key derivation
 */
export async function decryptData(encryptedData: string, password: string): Promise<string> {
  try {
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);

    // Derive key from password using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: KEY_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: KEY_LENGTH },
      false,
      ['decrypt']
    );

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt data - invalid password or corrupted data');
  }
}

