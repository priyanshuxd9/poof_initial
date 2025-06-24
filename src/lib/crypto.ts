
// This file uses the Web Crypto API, which is available in modern browsers and secure contexts (HTTPS).

/**
 * Encodes an ArrayBuffer to a Base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Decodes a Base64 string to an ArrayBuffer.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generates a new AES-GCM CryptoKey.
 */
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // exportable
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports a CryptoKey to a raw Base64 string for storage.
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Imports a raw Base64 string back into a CryptoKey.
 */
export async function importKey(keyStr: string): Promise<CryptoKey> {
    const keyBuffer = base64ToArrayBuffer(keyStr);
    return await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts a plaintext string using a given CryptoKey.
 * @returns A string combining the IV and ciphertext, separated by a colon.
 */
export async function encrypt(text: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV is standard for AES-GCM
  const encodedText = new TextEncoder().encode(text);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedText
  );

  return `${arrayBufferToBase64(iv)}:${arrayBufferToBase64(ciphertext)}`;
}

/**
 * Decrypts a combined IV:ciphertext string using a given CryptoKey.
 */
export async function decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format.');
  }

  const iv = base64ToArrayBuffer(parts[0]);
  const ciphertext = base64ToArrayBuffer(parts[1]);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
