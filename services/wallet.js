/**
 * Wallet Service
 * Handles wallet-related business logic
 */

import { WalletRepo, MnemonicRepo, UserRepo } from '../db/index.js';
import { encryptMnemonic, decryptMnemonic, secureWipe } from '../security/encryption.js';
import { config } from '../config/index.js';
import { PrismaClient } from '@prisma/client';

class WalletService {
  // Add wallet
  async addWallet(userId, address, memo = null, label = null) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return { success: false, error: 'User not found' };

      // Check wallet limit
      const currentCount = await WalletRepo.countByUserId(user.id);
      if (currentCount >= user.walletLimit) {
        return {
          success: false,
          error: `Wallet limit reached (${user.walletLimit} wallets max)`,
        };
      }

      // Check if wallet already exists
      const existing = user.wallets ? user.wallets.find(w => w.address === address) : null;
      if (existing) {
        return { success: false, error: 'Wallet already added' };
      }

      // Create wallet
      const wallet = await WalletRepo.create(user.id, address, memo, label);
      
      return { success: true, wallet };
    } catch (error) {
      console.error('Error in addWallet:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove wallet
  async removeWallet(walletId, userId) {
    try {
      const wallet = await WalletRepo.findById(walletId);
      if (!wallet) return { success: false, error: 'Wallet not found' };

      // Verify ownership
      const user = await UserRepo.findByTelegramId(userId);
      if (!user || wallet.userId !== user.id) {
        return { success: false, error: 'Unauthorized' };
      }

      await WalletRepo.delete(walletId);
      return { success: true };
    } catch (error) {
      console.error('Error in removeWallet:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user wallets
  async getUserWallets(userId) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return [];

      return await WalletRepo.findByUserId(user.id);
    } catch (error) {
      console.error('Error in getUserWallets:', error);
      return [];
    }
  }

  // Get wallet by ID
  async getWalletById(walletId) {
    try {
      return await WalletRepo.findById(walletId);
    } catch (error) {
      console.error('Error in getWalletById:', error);
      return null;
    }
  }

  // Save mnemonic
  async saveMnemonic(userId, mnemonic) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return { success: false, error: 'User not found' };

      // Validate mnemonic (basic check - 12 or 24 words)
      const words = mnemonic.trim().split(/\s+/);
      if (words.length !== 12 && words.length !== 24) {
        return { success: false, error: 'Invalid mnemonic (must be 12 or 24 words)' };
      }

      // Encrypt mnemonic
      const encrypted = encryptMnemonic(mnemonic, user.id);

      // Save to database
      await MnemonicRepo.upsert(
        user.id,
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.authTag,
        encrypted.salt
      );

      // Securely wipe mnemonic from memory
      secureWipe(mnemonic);

      return { success: true };
    } catch (error) {
      console.error('Error in saveMnemonic:', error);
      return { success: false, error: error.message };
    }
  }

  // Get decrypted mnemonic (use with caution)
  async getMnemonic(userId) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return null;

      const stored = await MnemonicRepo.findByUserId(user.id);
      if (!stored) return null;

      const mnemonic = decryptMnemonic(
        stored.encryptedData,
        stored.iv,
        stored.authTag,
        user.id
      );

      return mnemonic;
    } catch (error) {
      console.error('Error in getMnemonic:', error);
      return null;
    }
  }

  // Check if user has mnemonic
  async hasMnemonic(userId) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return false;

      const stored = await MnemonicRepo.findByUserId(user.id);
      return !!stored;
    } catch (error) {
      console.error('Error in hasMnemonic:', error);
      return false;
    }
  }

  // Delete mnemonic
  async deleteMnemonic(userId) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return { success: false, error: 'User not found' };

      await MnemonicRepo.delete(user.id);
      return { success: true };
    } catch (error) {
      console.error('Error in deleteMnemonic:', error);
      return { success: false, error: error.message };
    }
  }

  // Disable wallet (admin)
  async disableWallet(walletId) {
    try {
      await WalletRepo.updateStatus(walletId, 'disabled');
      return { success: true };
    } catch (error) {
      console.error('Error in disableWallet:', error);
      return { success: false, error: error.message };
    }
  }

  // Enable wallet (admin)
  async enableWallet(walletId) {
    try {
      await WalletRepo.updateStatus(walletId, 'active');
      return { success: true };
    } catch (error) {
      console.error('Error in enableWallet:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all wallets (admin)
  async getAllWallets(page = 1, limit = 20) {
    try {
      const prisma = new PrismaClient();
      
      const skip = (page - 1) * limit;
      const wallets = await prisma.wallet.findMany({
        where: { status: { not: 'deleted' } },
        include: { user: { select: { telegramId: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      
      const total = await prisma.wallet.count({
        where: { status: { not: 'deleted' } },
      });
      
      await prisma.$disconnect();
      
      return {
        wallets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getAllWallets:', error);
      return { wallets: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  }
}

const walletService = new WalletService();
export default walletService;
