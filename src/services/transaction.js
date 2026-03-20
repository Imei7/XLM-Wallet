/**
 * Transaction Service
 * Handles transaction-related business logic
 */

import { TransactionRepo, UserRepo, WalletRepo, DailyLimitRepo } from '../db/index.js';
import { generateIdempotencyKey } from '../security/encryption.js';
import { addWithdrawJob } from '../queue/index.js';
import { config } from '../config/index.js';
import { PrismaClient } from '@prisma/client';

class TransactionService {
  // Create withdraw request
  async createWithdraw(userId, walletId, amount) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return { success: false, error: 'User not found' };

      // Check if user is active
      if (user.status !== 'active') {
        return { success: false, error: 'User not active' };
      }

      // Check wallet
      const wallet = await WalletRepo.findById(walletId);
      if (!wallet || wallet.userId !== user.id || wallet.status !== 'active') {
        return { success: false, error: 'Invalid wallet' };
      }

      // Check amount
      if (amount < config.stellar.minAmount) {
        return {
          success: false,
          error: `Minimum amount is ${config.stellar.minAmount} XLM`,
        };
      }

      // Check daily limit
      const limitCheck = await DailyLimitRepo.getTodayUsage(user.id);
      if (limitCheck + amount > user.dailyLimit) {
        const remaining = user.dailyLimit - limitCheck;
        return {
          success: false,
          error: `Daily limit exceeded. Remaining: ${remaining.toFixed(2)} XLM`,
        };
      }

      // Generate idempotency key
      const idempotencyKey = generateIdempotencyKey(
        user.id,
        walletId,
        amount,
        Date.now()
      );

      // Check for duplicate transaction
      const existing = await TransactionRepo.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return { success: false, error: 'Duplicate transaction' };
      }

      // Create transaction record
      const transaction = await TransactionRepo.create({
        userId: user.id,
        walletId,
        amount,
        destination: config.stellar.binanceAddress,
        status: 'pending',
        idempotencyKey,
      });

      // Add to queue
      await addWithdrawJob({
        transactionId: transaction.id,
        userId: user.id,
        walletId,
        amount,
        idempotencyKey,
      });

      return { success: true, transaction };
    } catch (error) {
      console.error('Error in createWithdraw:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user transactions
  async getUserTransactions(userId, limit = 20) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return [];

      return await TransactionRepo.findByUserId(user.id, limit);
    } catch (error) {
      console.error('Error in getUserTransactions:', error);
      return [];
    }
  }

  // Get transaction by ID
  async getTransactionById(transactionId) {
    try {
      return await TransactionRepo.findById(transactionId);
    } catch (error) {
      console.error('Error in getTransactionById:', error);
      return null;
    }
  }

  // Get pending transactions
  async getPendingTransactions(limit = 100) {
    try {
      return await TransactionRepo.findByStatus('pending', limit);
    } catch (error) {
      console.error('Error in getPendingTransactions:', error);
      return [];
    }
  }

  // Get failed transactions
  async getFailedTransactions(limit = 100) {
    try {
      return await TransactionRepo.findByStatus('failed', limit);
    } catch (error) {
      console.error('Error in getFailedTransactions:', error);
      return [];
    }
  }

  // Retry failed transaction
  async retryTransaction(transactionId) {
    try {
      const transaction = await TransactionRepo.findById(transactionId);
      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      if (transaction.status !== 'failed') {
        return { success: false, error: 'Only failed transactions can be retried' };
      }

      if (transaction.retryCount >= 5) {
        return { success: false, error: 'Max retries exceeded' };
      }

      // Update status and add to queue
      await TransactionRepo.updateStatus(transactionId, 'pending');
      
      await addWithdrawJob({
        transactionId,
        userId: transaction.userId,
        walletId: transaction.walletId,
        amount: transaction.amount,
        idempotencyKey: transaction.idempotencyKey,
      });

      return { success: true };
    } catch (error) {
      console.error('Error in retryTransaction:', error);
      return { success: false, error: error.message };
    }
  }

  // Get transaction stats
  async getTransactionStats() {
    try {
      const [pending, processing, success, failed] = await Promise.all([
        TransactionRepo.countByStatus('pending'),
        TransactionRepo.countByStatus('processing'),
        TransactionRepo.countByStatus('success'),
        TransactionRepo.countByStatus('failed'),
      ]);

      return { pending, processing, success, failed, total: pending + processing + success + failed };
    } catch (error) {
      console.error('Error in getTransactionStats:', error);
      return { pending: 0, processing: 0, success: 0, failed: 0, total: 0 };
    }
  }

  // Get all transactions (admin)
  async getAllTransactions(page = 1, limit = 20, status = null) {
    try {
      const prisma = new PrismaClient();
      
      const skip = (page - 1) * limit;
      const where = status ? { status } : {};
      
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          wallet: true,
          user: { select: { telegramId: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      
      const total = await prisma.transaction.count({ where });
      
      await prisma.$disconnect();
      
      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getAllTransactions:', error);
      return { transactions: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  }

  // Update transaction status (internal use)
  async updateTransactionStatus(transactionId, status, hash = null, error = null) {
    try {
      return await TransactionRepo.updateStatus(transactionId, status, hash, error);
    } catch (e) {
      console.error('Error in updateTransactionStatus:', e);
      return null;
    }
  }

  // Record successful transaction for daily limit
  async recordDailyUsage(userId, amount) {
    try {
      await DailyLimitRepo.addToUsage(userId, amount);
    } catch (error) {
      console.error('Error in recordDailyUsage:', error);
    }
  }
}

const transactionService = new TransactionService();
export default transactionService;
