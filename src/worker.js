/**
 * Worker Entry Point
 * Queue processor service
 */

import { config, validateEnv } from './config/index.js';
import { getPrismaClient } from './db/index.js';
import { createWithdrawWorker } from './worker/processors/withdraw.js';
import { createScheduleWorker } from './worker/processors/schedule.js';
import { createBroadcastWorker } from './worker/processors/broadcast.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';

// Validate environment
validateEnv();

// Initialize database
getPrismaClient();

// Workers
let withdrawWorker = null;
let scheduleWorker = null;
let broadcastWorker = null;

// Start workers
async function startWorkers() {
  console.log('Starting workers...');
  
  try {
    // Create workers
    withdrawWorker = createWithdrawWorker();
    console.log('✅ Withdraw worker started');
    
    scheduleWorker = createScheduleWorker();
    console.log('✅ Schedule worker started');
    
    broadcastWorker = createBroadcastWorker();
    console.log('✅ Broadcast worker started');
    
    // Start scheduler
    startScheduler();
    console.log('✅ Scheduler started');
    
    console.log('🚀 All workers running');
  } catch (error) {
    console.error('Failed to start workers:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down workers...');
  
  stopScheduler();
  
  const workers = [withdrawWorker, scheduleWorker, broadcastWorker].filter(Boolean);
  
  await Promise.all(workers.map(async (worker) => {
    try {
      await worker.close();
    } catch (error) {
      console.error('Error closing worker:', error);
    }
  }));
  
  console.log('Workers stopped');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit, try to recover
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, try to recover
});

// Start
startWorkers();
