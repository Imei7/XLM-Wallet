/**
 * Schedule Processor
 * Processes scheduled withdrawal jobs
 */

import { Worker } from 'bullmq';
import { ScheduleRepo, MnemonicRepo, WalletRepo } from '../../db/index.js';
import TransactionService from '../../services/transaction.js';
import { addWithdrawJob } from '../../queue/index.js';
import { config } from '../../config/index.js';
import { createRedisConnection, QUEUE_NAMES } from '../../queue/index.js';

// Create schedule worker
export function createScheduleWorker() {
  const worker = new Worker(
    QUEUE_NAMES.SCHEDULE,
    async (job) => {
      const { scheduleId, userId, walletId, amount } = job.data;
      
      console.log(`Processing schedule: ${scheduleId}`);
      
      try {
        // Get schedule
        const schedule = await ScheduleRepo.findActive();
        const targetSchedule = schedule.find(s => s.id === scheduleId);
        
        if (!targetSchedule || !targetSchedule.active) {
          console.log(`Schedule ${scheduleId} not active`);
          return { success: true, skipped: true };
        }
        
        // Create withdrawal
        const result = await TransactionService.createWithdraw(
          targetSchedule.user.telegramId,
          walletId,
          amount
        );
        
        if (result.success) {
          // Update schedule last run
          await ScheduleRepo.update(scheduleId, {
            lastRun: new Date(),
            nextRun: new Date(Date.now() + targetSchedule.intervalMinutes * 60 * 1000),
          });
          
          console.log(`Schedule withdrawal created: ${result.transaction.id}`);
          return { success: true, transactionId: result.transaction.id };
        } else {
          console.error(`Schedule withdrawal failed: ${result.error}`);
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error(`Schedule processing error: ${scheduleId}`, error.message);
        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 3,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Schedule job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Schedule job ${job.id} failed:`, err.message);
  });

  return worker;
}
