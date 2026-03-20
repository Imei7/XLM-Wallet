/**
 * Database Module
 * Prisma client with connection pooling
 */

import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client
let prisma;

export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Graceful shutdown
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });
  }
  return prisma;
}

// User operations
export const UserRepo = {
  async findByTelegramId(telegramId) {
    const prisma = getPrismaClient();
    return prisma.user.findUnique({
      where: { telegramId: telegramId.toString() },
      include: { wallets: true },
    });
  },

  async create(telegramId) {
    const prisma = getPrismaClient();
    return prisma.user.create({
      data: { telegramId: telegramId.toString() },
    });
  },

  async updateStatus(id, status) {
    const prisma = getPrismaClient();
    return prisma.user.update({
      where: { id },
      data: { status },
    });
  },

  async updateLimits(id, walletLimit, dailyLimit) {
    const prisma = getPrismaClient();
    return prisma.user.update({
      where: { id },
      data: { walletLimit, dailyLimit },
    });
  },

  async findAll(options = {}) {
    const prisma = getPrismaClient();
    return prisma.user.findMany({
      ...options,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByStatus(status) {
    const prisma = getPrismaClient();
    return prisma.user.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
  },

  async count() {
    const prisma = getPrismaClient();
    return prisma.user.count();
  },

  async countByStatus(status) {
    const prisma = getPrismaClient();
    return prisma.user.count({ where: { status } });
  },
};

// Wallet operations
export const WalletRepo = {
  async findByUserId(userId) {
    const prisma = getPrismaClient();
    return prisma.wallet.findMany({
      where: { userId, status: { not: 'deleted' } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id) {
    const prisma = getPrismaClient();
    return prisma.wallet.findUnique({
      where: { id },
      include: { user: true },
    });
  },

  async create(userId, address, memo, label) {
    const prisma = getPrismaClient();
    return prisma.wallet.create({
      data: {
        userId,
        address,
        memo,
        label,
      },
    });
  },

  async updateStatus(id, status) {
    const prisma = getPrismaClient();
    return prisma.wallet.update({
      where: { id },
      data: { status },
    });
  },

  async delete(id) {
    const prisma = getPrismaClient();
    return prisma.wallet.update({
      where: { id },
      data: { status: 'deleted' },
    });
  },

  async countByUserId(userId) {
    const prisma = getPrismaClient();
    return prisma.wallet.count({
      where: { userId, status: 'active' },
    });
  },
};

// Mnemonic operations
export const MnemonicRepo = {
  async upsert(userId, encryptedData, iv, authTag, salt) {
    const prisma = getPrismaClient();
    return prisma.mnemonic.upsert({
      where: { userId },
      create: {
        userId,
        encryptedData,
        iv,
        authTag,
        salt,
      },
      update: {
        encryptedData,
        iv,
        authTag,
        salt,
      },
    });
  },

  async findByUserId(userId) {
    const prisma = getPrismaClient();
    return prisma.mnemonic.findUnique({
      where: { userId },
    });
  },

  async delete(userId) {
    const prisma = getPrismaClient();
    return prisma.mnemonic.delete({
      where: { userId },
    });
  },
};

// Transaction operations
export const TransactionRepo = {
  async create(data) {
    const prisma = getPrismaClient();
    return prisma.transaction.create({
      data,
    });
  },

  async findById(id) {
    const prisma = getPrismaClient();
    return prisma.transaction.findUnique({
      where: { id },
      include: { wallet: true, user: true },
    });
  },

  async findByIdempotencyKey(key) {
    const prisma = getPrismaClient();
    return prisma.transaction.findUnique({
      where: { idempotencyKey: key },
    });
  },

  async findByUserId(userId, limit = 20) {
    const prisma = getPrismaClient();
    return prisma.transaction.findMany({
      where: { userId },
      include: { wallet: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findByStatus(status, limit = 100) {
    const prisma = getPrismaClient();
    return prisma.transaction.findMany({
      where: { status },
      include: { wallet: true, user: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  },

  async updateStatus(id, status, hash = null, error = null) {
    const prisma = getPrismaClient();
    return prisma.transaction.update({
      where: { id },
      data: {
        status,
        hash,
        error,
        retryCount: { increment: 1 },
      },
    });
  },

  async countByStatus(status) {
    const prisma = getPrismaClient();
    return prisma.transaction.count({ where: { status } });
  },

  async getDailyTotal(userId, date) {
    const prisma = getPrismaClient();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: 'success',
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { amount: true },
    });

    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  },
};

// Schedule operations
export const ScheduleRepo = {
  async create(data) {
    const prisma = getPrismaClient();
    return prisma.schedule.create({
      data,
    });
  },

  async findByUserId(userId) {
    const prisma = getPrismaClient();
    return prisma.schedule.findMany({
      where: { userId },
      include: { wallet: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findActive() {
    const prisma = getPrismaClient();
    const now = new Date();
    return prisma.schedule.findMany({
      where: {
        active: true,
        nextRun: { lte: now },
      },
      include: { wallet: true, user: true },
    });
  },

  async update(id, data) {
    const prisma = getPrismaClient();
    return prisma.schedule.update({
      where: { id },
      data,
    });
  },

  async toggle(id, active) {
    const prisma = getPrismaClient();
    return prisma.schedule.update({
      where: { id },
      data: { active },
    });
  },

  async delete(id) {
    const prisma = getPrismaClient();
    return prisma.schedule.delete({
      where: { id },
    });
  },
};

// Admin log operations
export const AdminLogRepo = {
  async create(adminId, action, targetId = null, details = null) {
    const prisma = getPrismaClient();
    return prisma.adminLog.create({
      data: {
        adminId,
        action,
        targetId,
        details,
      },
    });
  },

  async findRecent(limit = 50) {
    const prisma = getPrismaClient();
    return prisma.adminLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { telegramId: true } },
      },
    });
  },
};

// Broadcast operations
export const BroadcastRepo = {
  async create(data) {
    const prisma = getPrismaClient();
    return prisma.broadcast.create({
      data,
    });
  },

  async update(id, data) {
    const prisma = getPrismaClient();
    return prisma.broadcast.update({
      where: { id },
      data,
    });
  },

  async findPending() {
    const prisma = getPrismaClient();
    return prisma.broadcast.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
  },
};

// Rate limit operations
export const RateLimitRepo = {
  async check(key, windowMs, maxRequests) {
    const prisma = getPrismaClient();
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);

    const existing = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (!existing) {
      await prisma.rateLimit.create({
        data: { key, count: 1, resetAt },
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (existing.resetAt < now) {
      await prisma.rateLimit.update({
        where: { key },
        data: { count: 1, resetAt },
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (existing.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return { allowed: true, remaining: maxRequests - existing.count - 1 };
  },
};

// Daily limit operations
export const DailyLimitRepo = {
  async getTodayUsage(userId) {
    const prisma = getPrismaClient();
    const today = new Date().toISOString().split('T')[0];
    
    const record = await prisma.dailyLimit.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    return record ? record.amount : 0;
  },

  async addToUsage(userId, amount) {
    const prisma = getPrismaClient();
    const today = new Date().toISOString().split('T')[0];

    return prisma.dailyLimit.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, amount },
      update: { amount: { increment: amount } },
    });
  },
};
