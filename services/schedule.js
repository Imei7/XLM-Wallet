/**
 * Schedule Service
 * Handles auto-withdraw schedule business logic
 */

import { ScheduleRepo, UserRepo, WalletRepo } from '../db/index.js';
import { config } from '../config/index.js';
import { PrismaClient } from '@prisma/client';

class ScheduleService {
  // Create schedule
  async createSchedule(userId, walletId, amount, intervalMinutes) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return { success: false, error: 'User not found' };

      // Check wallet
      const wallet = await WalletRepo.findById(walletId);
      if (!wallet || wallet.userId !== user.id || wallet.status !== 'active') {
        return { success: false, error: 'Invalid wallet' };
      }

      // Validate interval (minimum 1 hour)
      if (intervalMinutes < 60) {
        return { success: false, error: 'Minimum interval is 60 minutes' };
      }

      // Validate amount
      if (amount < config.stellar.minAmount) {
        return {
          success: false,
          error: `Minimum amount is ${config.stellar.minAmount} XLM`,
        };
      }

      // Calculate next run
      const nextRun = new Date(Date.now() + intervalMinutes * 60 * 1000);

      // Create schedule
      const schedule = await ScheduleRepo.create({
        userId: user.id,
        walletId,
        amount,
        intervalMinutes,
        nextRun,
        active: true,
      });

      return { success: true, schedule };
    } catch (error) {
      console.error('Error in createSchedule:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user schedules
  async getUserSchedules(userId) {
    try {
      const user = await UserRepo.findByTelegramId(userId);
      if (!user) return [];

      return await ScheduleRepo.findByUserId(user.id);
    } catch (error) {
      console.error('Error in getUserSchedules:', error);
      return [];
    }
  }

  // Toggle schedule
  async toggleSchedule(scheduleId, userId) {
    try {
      const schedules = await this.getUserSchedules(userId);
      const schedule = schedules.find(s => s.id === scheduleId);
      
      if (!schedule) {
        return { success: false, error: 'Schedule not found' };
      }

      await ScheduleRepo.toggle(scheduleId, !schedule.active);
      return { success: true, active: !schedule.active };
    } catch (error) {
      console.error('Error in toggleSchedule:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete schedule
  async deleteSchedule(scheduleId, userId) {
    try {
      const schedules = await this.getUserSchedules(userId);
      const schedule = schedules.find(s => s.id === scheduleId);
      
      if (!schedule) {
        return { success: false, error: 'Schedule not found' };
      }

      await ScheduleRepo.delete(scheduleId);
      return { success: true };
    } catch (error) {
      console.error('Error in deleteSchedule:', error);
      return { success: false, error: error.message };
    }
  }

  // Update schedule
  async updateSchedule(scheduleId, userId, data) {
    try {
      const schedules = await this.getUserSchedules(userId);
      const schedule = schedules.find(s => s.id === scheduleId);
      
      if (!schedule) {
        return { success: false, error: 'Schedule not found' };
      }

      const updateData = {};
      if (data.amount !== undefined) {
        if (data.amount < config.stellar.minAmount) {
          return {
            success: false,
            error: `Minimum amount is ${config.stellar.minAmount} XLM`,
          };
        }
        updateData.amount = data.amount;
      }
      if (data.intervalMinutes !== undefined) {
        if (data.intervalMinutes < 60) {
          return { success: false, error: 'Minimum interval is 60 minutes' };
        }
        updateData.intervalMinutes = data.intervalMinutes;
        updateData.nextRun = new Date(Date.now() + data.intervalMinutes * 60 * 1000);
      }

      await ScheduleRepo.update(scheduleId, updateData);
      return { success: true };
    } catch (error) {
      console.error('Error in updateSchedule:', error);
      return { success: false, error: error.message };
    }
  }

  // Get active schedules for processing
  async getActiveSchedules() {
    try {
      return await ScheduleRepo.findActive();
    } catch (error) {
      console.error('Error in getActiveSchedules:', error);
      return [];
    }
  }

  // Update last run and schedule next
  async updateScheduleRun(scheduleId, intervalMinutes) {
    try {
      const now = new Date();
      const nextRun = new Date(now.getTime() + intervalMinutes * 60 * 1000);
      
      await ScheduleRepo.update(scheduleId, {
        lastRun: now,
        nextRun,
      });
    } catch (error) {
      console.error('Error in updateScheduleRun:', error);
    }
  }

  // Get schedule stats
  async getScheduleStats() {
    try {
      const prisma = new PrismaClient();
      
      const [total, active] = await Promise.all([
        prisma.schedule.count(),
        prisma.schedule.count({ where: { active: true } }),
      ]);
      
      await prisma.$disconnect();
      
      return { total, active, inactive: total - active };
    } catch (error) {
      console.error('Error in getScheduleStats:', error);
      return { total: 0, active: 0, inactive: 0 };
    }
  }
}

const scheduleService = new ScheduleService();
export default scheduleService;
