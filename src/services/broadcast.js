/**
 * Broadcast Service
 * Handles broadcast message business logic
 */

import { BroadcastRepo, UserRepo } from '../db/index.js';
import { addBroadcastJob } from '../queue/index.js';
import { config } from '../config/index.js';
import { PrismaClient } from '@prisma/client';

class BroadcastService {
  // Create broadcast
  async createBroadcast(adminId, message, targetType, targetIds = null) {
    try {
      // Get target count
      let targetCount = 0;
      let targets = [];

      switch (targetType) {
        case 'all':
          const allUsers = await UserRepo.findAll();
          targets = allUsers.map(u => u.telegramId);
          break;
        case 'active':
          const activeUsers = await UserRepo.findByStatus('active');
          targets = activeUsers.map(u => u.telegramId);
          break;
        case 'custom':
          targets = targetIds || [];
          break;
        default:
          return { success: false, error: 'Invalid target type' };
      }

      targetCount = targets.length;

      if (targetCount === 0) {
        return { success: false, error: 'No targets found' };
      }

      // Create broadcast record
      const broadcast = await BroadcastRepo.create({
        adminId,
        message,
        targetType,
        targetIds: targetType === 'custom' ? JSON.stringify(targets) : null,
        totalCount: targetCount,
        status: 'pending',
      });

      // Add to queue with batches
      const batches = this.createBatches(targets, config.broadcast.batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        await addBroadcastJob({
          broadcastId: broadcast.id,
          message,
          targets: batches[i],
          batchNumber: i + 1,
          totalBatches: batches.length,
        });
      }

      return {
        success: true,
        broadcast,
        targetCount,
        batchCount: batches.length,
      };
    } catch (error) {
      console.error('Error in createBroadcast:', error);
      return { success: false, error: error.message };
    }
  }

  // Create batches
  createBatches(targets, batchSize) {
    const batches = [];
    for (let i = 0; i < targets.length; i += batchSize) {
      batches.push(targets.slice(i, i + batchSize));
    }
    return batches;
  }

  // Get broadcast status
  async getBroadcastStatus(broadcastId) {
    try {
      const prisma = new PrismaClient();
      
      const broadcast = await prisma.broadcast.findUnique({
        where: { id: broadcastId },
      });
      
      await prisma.$disconnect();
      
      return broadcast;
    } catch (error) {
      console.error('Error in getBroadcastStatus:', error);
      return null;
    }
  }

  // Update broadcast stats
  async updateBroadcastStats(broadcastId, successCount, failCount) {
    try {
      const prisma = new PrismaClient();
      
      const broadcast = await prisma.broadcast.findUnique({
        where: { id: broadcastId },
      });
      
      if (!broadcast) return null;

      const newSuccess = broadcast.successCount + successCount;
      const newFail = broadcast.failCount + failCount;
      const totalProcessed = newSuccess + newFail;
      
      const status = totalProcessed >= broadcast.totalCount ? 'completed' : 'processing';

      const updated = await prisma.broadcast.update({
        where: { id: broadcastId },
        data: {
          successCount: newSuccess,
          failCount: newFail,
          status,
        },
      });
      
      await prisma.$disconnect();
      
      return updated;
    } catch (error) {
      console.error('Error in updateBroadcastStats:', error);
      return null;
    }
  }

  // Get recent broadcasts
  async getRecentBroadcasts(limit = 10) {
    try {
      const prisma = new PrismaClient();
      
      const broadcasts = await prisma.broadcast.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      
      await prisma.$disconnect();
      
      return broadcasts;
    } catch (error) {
      console.error('Error in getRecentBroadcasts:', error);
      return [];
    }
  }

  // Get broadcast stats
  async getBroadcastStats() {
    try {
      const prisma = new PrismaClient();
      
      const [pending, processing, completed, failed] = await Promise.all([
        prisma.broadcast.count({ where: { status: 'pending' } }),
        prisma.broadcast.count({ where: { status: 'processing' } }),
        prisma.broadcast.count({ where: { status: 'completed' } }),
        prisma.broadcast.count({ where: { status: 'failed' } }),
      ]);
      
      await prisma.$disconnect();
      
      return { pending, processing, completed, failed, total: pending + processing + completed + failed };
    } catch (error) {
      console.error('Error in getBroadcastStats:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    }
  }
}

const broadcastService = new BroadcastService();
export default broadcastService;
