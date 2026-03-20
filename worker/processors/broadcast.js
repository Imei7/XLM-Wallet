/**
 * Broadcast Processor
 * Processes broadcast message jobs
 */

import { Worker } from 'bullmq';
import { Bot } from 'grammy';
import BroadcastService from '../../services/broadcast.js';
import { config } from '../../config/index.js';
import { createRedisConnection, QUEUE_NAMES } from '../../queue/index.js';

// Create bot instance for sending messages
const bot = new Bot(config.telegram.token);

// Create broadcast worker
export function createBroadcastWorker() {
  const worker = new Worker(
    QUEUE_NAMES.BROADCAST,
    async (job) => {
      const { broadcastId, message, targets, batchNumber, totalBatches } = job.data;
      
      console.log(`Processing broadcast batch ${batchNumber}/${totalBatches}`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const telegramId of targets) {
        try {
          await bot.api.sendMessage(telegramId, message, {
            parse_mode: 'HTML',
          });
          successCount++;
          
          // Add delay to avoid rate limiting
          await sleep(config.broadcast.delayBetweenBatchesMs / targets.length);
        } catch (error) {
          console.error(`Failed to send to ${telegramId}:`, error.message);
          failCount++;
        }
      }
      
      // Update broadcast stats
      await BroadcastService.updateBroadcastStats(broadcastId, successCount, failCount);
      
      console.log(`Broadcast batch ${batchNumber} completed: ${successCount} success, ${failCount} failed`);
      
      return {
        success: true,
        batchNumber,
        successCount,
        failCount,
      };
    },
    {
      connection: createRedisConnection(),
      concurrency: 2,
      limiter: {
        max: 1,
        duration: config.broadcast.delayBetweenBatchesMs,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`Broadcast job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Broadcast job ${job.id} failed:`, err.message);
  });

  return worker;
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
