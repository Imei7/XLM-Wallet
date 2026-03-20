/**
 * Queue Module
 * BullMQ queue configuration with Redis connection
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/index.js';

// Create Redis connection with retry logic
export function createRedisConnection() {
  return new Redis(config.redis.url, {
    maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
    retryStrategy: config.redis.retryStrategy,
    enableReadyCheck: true,
    lazyConnect: false,
  });
}

// Queue names
export const QUEUE_NAMES = {
  WITHDRAW: 'withdraw',
  SCHEDULE: 'schedule',
  BROADCAST: 'broadcast',
};

// Create queues
let withdrawQueue = null;
let scheduleQueue = null;
let broadcastQueue = null;

export function getQueues() {
  if (!withdrawQueue) {
    const connection = createRedisConnection();
    
    withdrawQueue = new Queue(QUEUE_NAMES.WITHDRAW, {
      connection,
      prefix: config.queue.prefix,
      defaultJobOptions: {
        ...config.queue.defaultJobOptions,
        priority: 1,
      },
    });

    scheduleQueue = new Queue(QUEUE_NAMES.SCHEDULE, {
      connection: createRedisConnection(),
      prefix: config.queue.prefix,
      defaultJobOptions: {
        ...config.queue.defaultJobOptions,
        priority: 2,
      },
    });

    broadcastQueue = new Queue(QUEUE_NAMES.BROADCAST, {
      connection: createRedisConnection(),
      prefix: config.queue.prefix,
      defaultJobOptions: {
        ...config.queue.defaultJobOptions,
        priority: 3,
      },
    });
  }

  return {
    withdrawQueue,
    scheduleQueue,
    broadcastQueue,
  };
}

// Add withdraw job
export async function addWithdrawJob(data) {
  const { withdrawQueue } = getQueues();
  return withdrawQueue.add('withdraw', data, {
    jobId: data.idempotencyKey,
    ...config.queue.defaultJobOptions,
  });
}

// Add schedule job
export async function addScheduleJob(data) {
  const { scheduleQueue } = getQueues();
  return scheduleQueue.add('schedule', data, {
    ...config.queue.defaultJobOptions,
  });
}

// Add broadcast job
export async function addBroadcastJob(data) {
  const { broadcastQueue } = getQueues();
  return broadcastQueue.add('broadcast', data, {
    ...config.queue.defaultJobOptions,
  });
}

// Get queue stats
export async function getQueueStats() {
  const { withdrawQueue, scheduleQueue, broadcastQueue } = getQueues();

  const [withdraw, schedule, broadcast] = await Promise.all([
    Promise.all([
      withdrawQueue.getWaitingCount(),
      withdrawQueue.getActiveCount(),
      withdrawQueue.getCompletedCount(),
      withdrawQueue.getFailedCount(),
    ]),
    Promise.all([
      scheduleQueue.getWaitingCount(),
      scheduleQueue.getActiveCount(),
      scheduleQueue.getCompletedCount(),
      scheduleQueue.getFailedCount(),
    ]),
    Promise.all([
      broadcastQueue.getWaitingCount(),
      broadcastQueue.getActiveCount(),
      broadcastQueue.getCompletedCount(),
      broadcastQueue.getFailedCount(),
    ]),
  ]);

  return {
    withdraw: {
      waiting: withdraw[0],
      active: withdraw[1],
      completed: withdraw[2],
      failed: withdraw[3],
    },
    schedule: {
      waiting: schedule[0],
      active: schedule[1],
      completed: schedule[2],
      failed: schedule[3],
    },
    broadcast: {
      waiting: broadcast[0],
      active: broadcast[1],
      completed: broadcast[2],
      failed: broadcast[3],
    },
  };
}

// Clear completed/failed jobs
export async function cleanQueues() {
  const { withdrawQueue, scheduleQueue, broadcastQueue } = getQueues();
  
  await Promise.all([
    withdrawQueue.clean(100, 100, 'completed'),
    withdrawQueue.clean(100, 50, 'failed'),
    scheduleQueue.clean(100, 100, 'completed'),
    scheduleQueue.clean(100, 50, 'failed'),
    broadcastQueue.clean(100, 100, 'completed'),
    broadcastQueue.clean(100, 50, 'failed'),
  ]);
}

// Close all queues
export async function closeQueues() {
  const { withdrawQueue, scheduleQueue, broadcastQueue } = getQueues();
  
  await Promise.all([
    withdrawQueue.close(),
    scheduleQueue.close(),
    broadcastQueue.close(),
  ]);
}
