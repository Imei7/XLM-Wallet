/**
 * User Service
 * Handles user-related business logic
 */

import { UserRepo, RateLimitRepo, DailyLimitRepo } from '../db/index.js';
import { config } from '../config/index.js';

class UserService {
  // Get or create user by Telegram ID
  async getOrCreateUser(telegramId) {
    try {
      let user = await UserRepo.findByTelegramId(telegramId);
      
      if (!user) {
        user = await UserRepo.create(telegramId);
        console.log(`New user created: ${telegramId}`);
      }
      
      return user;
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      throw error;
    }
  }

  // Check if user is active
  async isActiveUser(userId) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      return user && user.status === 'active';
    } catch (error) {
      console.error('Error in isActiveUser:', error);
      return false;
    }
  }

  // Check if user is blocked
  async isBlockedUser(userId) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      return user && user.status === 'blocked';
    } catch (error) {
      console.error('Error in isBlockedUser:', error);
      return false;
    }
  }

  // Check if user is admin
  isAdmin(userId) {
    return userId.toString() === config.telegram.adminId.toString();
  }

  // Check rate limit
  async checkRateLimit(userId) {
    try {
      const key = `rate:${userId}`;
      const result = await RateLimitRepo.check(
        key,
        config.rateLimit.windowMs,
        config.rateLimit.maxRequests
      );
      return result;
    } catch (error) {
      console.error('Error in checkRateLimit:', error);
      // Allow on error to prevent blocking users
      return { allowed: true, remaining: 0 };
    }
  }

  // Check daily limit
  async checkDailyLimit(userId, amount) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return { allowed: false, reason: 'User not found' };

      const todayUsage = await DailyLimitRepo.getTodayUsage(user.id);
      const remaining = user.dailyLimit - todayUsage;

      if (amount > remaining) {
        return {
          allowed: false,
          reason: `Daily limit exceeded. Remaining: ${remaining.toFixed(2)} XLM`,
          remaining,
        };
      }

      return { allowed: true, remaining };
    } catch (error) {
      console.error('Error in checkDailyLimit:', error);
      return { allowed: false, reason: 'Error checking daily limit' };
    }
  }

  // Get user stats
  async getUserStats(userId) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return null;

      const todayUsage = await DailyLimitRepo.getTodayUsage(user.id);
      const walletCount = user.wallets ? user.wallets.filter(w => w.status === 'active').length : 0;

      return {
        status: user.status,
        walletCount,
        walletLimit: user.walletLimit,
        dailyLimit: user.dailyLimit,
        dailyUsed: todayUsage,
        dailyRemaining: user.dailyLimit - todayUsage,
        createdAt: user.createdAt,
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return null;
    }
  }

  // Update user limits (admin only)
  async updateUserLimits(userId, walletLimit, dailyLimit) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return { success: false, error: 'User not found' };

      await UserRepo.updateLimits(user.id, walletLimit, dailyLimit);
      return { success: true };
    } catch (error) {
      console.error('Error in updateUserLimits:', error);
      return { success: false, error: error.message };
    }
  }

  // Block user
  async blockUser(userId) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return { success: false, error: 'User not found' };

      await UserRepo.updateStatus(user.id, 'blocked');
      return { success: true };
    } catch (error) {
      console.error('Error in blockUser:', error);
      return { success: false, error: error.message };
    }
  }

  // Unblock user
  async unblockUser(userId) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return { success: false, error: 'User not found' };

      await UserRepo.updateStatus(user.id, 'active');
      return { success: true };
    } catch (error) {
      console.error('Error in unblockUser:', error);
      return { success: false, error: error.message };
    }
  }

  // Approve pending user
  async approveUser(userId) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return { success: false, error: 'User not found' };

      await UserRepo.updateStatus(user.id, 'active');
      return { success: true };
    } catch (error) {
      console.error('Error in approveUser:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all users (admin)
  async getAllUsers(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const users = await UserRepo.findAll({
        skip,
        take: limit,
      });
      const total = await UserRepo.count();
      
      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return { users: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  }

  // Get pending users
  async getPendingUsers() {
    try {
      return await UserRepo.findByStatus('pending');
    } catch (error) {
      console.error('Error in getPendingUsers:', error);
      return [];
    }
  }

  // Get user counts
  async getUserCounts() {
    try {
      const [total, active, pending, blocked] = await Promise.all([
        UserRepo.count(),
        UserRepo.countByStatus('active'),
        UserRepo.countByStatus('pending'),
        UserRepo.countByStatus('blocked'),
      ]);

      return { total, active, pending, blocked };
    } catch (error) {
      console.error('Error in getUserCounts:', error);
      return { total: 0, active: 0, pending: 0, blocked: 0 };
    }
  }
}

const userService = new UserService();
export default userService;
