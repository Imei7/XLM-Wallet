/**
 * Configuration Module
 * Central configuration with startup validation
 */

import 'dotenv/config';

// Required environment variables
const REQUIRED_ENV_VARS = [
  'TELEGRAM_TOKEN',
  'DATABASE_URL',
  'REDIS_URL',
  'MASTER_KEY',
  'ADMIN_ID'
];

// Validate environment variables
export function validateEnv() {
  const missing = [];
  const invalid = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Validate MASTER_KEY length (must be 32 bytes for AES-256)
  if (process.env.MASTER_KEY) {
    const keyBuffer = Buffer.from(process.env.MASTER_KEY, 'hex');
    if (keyBuffer.length !== 32) {
      invalid.push(`MASTER_KEY must be exactly 32 bytes (64 hex characters), got ${keyBuffer.length} bytes`);
    }
  }

  // Validate ADMIN_ID format
  if (process.env.ADMIN_ID && isNaN(parseInt(process.env.ADMIN_ID))) {
    invalid.push('ADMIN_ID must be a valid Telegram user ID (numeric)');
  }

  if (missing.length > 0 || invalid.length > 0) {
    console.error('\n❌ Configuration Error:\n');
    if (missing.length > 0) {
      console.error('Missing required environment variables:');
      missing.forEach(v => console.error(`  - ${v}`));
    }
    if (invalid.length > 0) {
      console.error('\nInvalid configuration:');
      invalid.forEach(v => console.error(`  - ${v}`));
    }
    console.error('\n');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}

// Configuration object
export const config = {
  // Telegram
  telegram: {
    token: process.env.TELEGRAM_TOKEN,
    adminId: parseInt(process.env.ADMIN_ID),
  },

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      if (times > 10) {
        console.error('Redis connection failed after 10 retries');
        return null;
      }
      return Math.min(times * 100, 3000);
    },
  },

  // Security
  security: {
    masterKey: process.env.MASTER_KEY,
    encryptionAlgorithm: 'aes-256-gcm',
    keyDerivationIterations: 100000,
  },

  // Stellar
  stellar: {
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    horizonUrl: 'https://horizon.stellar.org',
    binanceAddress: 'GDVKYU2YQQGGQ4DMXD6JFJNQJN3V3YZOWHE2S5YRVT32I3UWA3WZVJWD', // Binance XLM deposit
    minAmount: 1.0, // Minimum XLM amount
    fee: '100', // Base fee in stroops
  },

  // Queue
  queue: {
    prefix: 'xlm-bot',
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  },

  // Scheduler
  scheduler: {
    enabled: process.env.ENABLE_SCHEDULER === 'true',
    checkIntervalMs: 60000, // Check every minute
  },

  // Rate limits
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 10, // Max 10 requests per minute
  },

  // Broadcast
  broadcast: {
    batchSize: 30,
    delayBetweenBatchesMs: 2000,
  },

  // Server
  server: {
    port: parseInt(process.env.PORT) || 3000,
  },
};
