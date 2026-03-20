/**
 * Configuration Module (SAFE MODE - Railway Friendly)
 */

import 'dotenv/config';

// Required env (minimal biar bot hidup dulu)
const REQUIRED_ENV_VARS = [
  'TELEGRAM_TOKEN',
  'ADMIN_ID'
];

// Validate environment variables (non-strict)
export function validateEnv() {
  const missing = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:\n');
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('\n');
    process.exit(1);
  }

  console.log('✅ Basic environment validation passed');

  // Debug log (biar gak buta di Railway)
  console.log('\n🔍 ENV DEBUG:');
  console.log('TELEGRAM_TOKEN:', process.env.TELEGRAM_TOKEN ? '✅ SET' : '❌ NOT SET');
  console.log('ADMIN_ID:', process.env.ADMIN_ID || '❌ NOT SET');
  console.log('DATABASE_URL:', process.env.DATABASE_URL || '⚠️ NOT SET (using fallback)');
  console.log('REDIS_URL:', process.env.REDIS_URL || '⚠️ NOT SET (disabled)');
  console.log('MASTER_KEY:', process.env.MASTER_KEY ? '✅ SET' : '⚠️ NOT SET');
  console.log('ENABLE_SCHEDULER:', process.env.ENABLE_SCHEDULER || 'false');
  console.log('\n');
}

// Config object (safe fallback mode)
export const config = {
  // Telegram
  telegram: {
    token: process.env.TELEGRAM_TOKEN,
    adminId: parseInt(process.env.ADMIN_ID) || 0,
  },

  // Database (fallback biar gak crash)
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },

  // Redis (optional dulu)
  redis: {
    url: process.env.REDIS_URL || null,
    enabled: !!process.env.REDIS_URL,
  },

  // Security (optional dulu)
  security: {
    masterKey: process.env.MASTER_KEY || null,
    encryptionAlgorithm: 'aes-256-gcm',
  },

  // Stellar
  stellar: {
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    horizonUrl: 'https://horizon.stellar.org',
    binanceAddress: 'GDVKYU2YQQGGQ4DMXD6JFJNQJN3V3YZOWHE2S5YRVT32I3UWA3WZVJWD',
    minAmount: 1.0,
    fee: '100',
  },

  // Queue (optional dulu)
  queue: {
    enabled: !!process.env.REDIS_URL,
  },

  // Scheduler
  scheduler: {
    enabled: process.env.ENABLE_SCHEDULER === 'true',
    checkIntervalMs: 60000,
  },

  // Rate limit
  rateLimit: {
    windowMs: 60000,
    maxRequests: 10,
  },

  // Server
  server: {
    port: parseInt(process.env.PORT) || 3000,
  },
};
