/**
 * Encryption Module
 * AES-256-GCM encryption with per-user key derivation
 */

import crypto from 'crypto';
import { config } from '../config/index.js';

// Derive user-specific encryption key from master key
export function deriveUserKey(userId) {
  const masterKey = Buffer.from(config.security.masterKey, 'hex');
  const salt = crypto.createHash('sha256')
    .update(userId + config.security.masterKey)
    .digest();

  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    config.security.keyDerivationIterations,
    32, // 32 bytes for AES-256
    'sha256'
  );
}

// Encrypt mnemonic with user-specific key
export function encryptMnemonic(mnemonic, userId) {
  try {
    const userKey = deriveUserKey(userId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      config.security.encryptionAlgorithm,
      userKey,
      iv
    );

    let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    const salt = crypto.randomBytes(32).toString('hex');

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      salt,
    };
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt mnemonic');
  }
}

// Decrypt mnemonic with user-specific key
export function decryptMnemonic(encryptedData, iv, authTag, userId) {
  try {
    const userKey = deriveUserKey(userId);
    const decipher = crypto.createDecipheriv(
      config.security.encryptionAlgorithm,
      userKey,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt mnemonic');
  }
}

// Securely wipe sensitive data from memory
export function secureWipe(obj) {
  if (typeof obj === 'string') {
    // Overwrite string in memory (best effort)
    obj = null;
  } else if (Buffer.isBuffer(obj)) {
    obj.fill(0);
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key of Object.keys(obj)) {
      secureWipe(obj[key]);
    }
  }
}

// Generate idempotency key for transactions
export function generateIdempotencyKey(userId, walletId, amount, timestamp) {
  const data = `${userId}:${walletId}:${amount}:${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Verify idempotency key
export function verifyIdempotencyKey(key, userId, walletId, amount, timestamp) {
  const expected = generateIdempotencyKey(userId, walletId, amount, timestamp);
  return key === expected;
}

// Generate secure random string
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}
