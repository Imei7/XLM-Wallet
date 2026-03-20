/**
 * Scheduler Service
 * Checks and triggers scheduled withdrawals
 */

import { ScheduleRepo } from '../db/index.js';
import { addScheduleJob } from '../queue/index.js';
import { config } from '../config/index.js';

let schedulerInterval = null;

// Start scheduler
export function startScheduler() {
  if (!config.scheduler.enabled) {
    console.log('Scheduler disabled');
    return;
  }
  
  console.log('Starting scheduler...');
  
  // Run immediately
  checkSchedules();
  
  // Run periodically
  schedulerInterval = setInterval(checkSchedules, config.scheduler.checkIntervalMs);
}

// Stop scheduler
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

// Check for due schedules
async function checkSchedules() {
  try {
    const schedules = await ScheduleRepo.findActive();
    
    if (schedules.length === 0) {
      return;
    }
    
    console.log(`Found ${schedules.length} active schedules to process`);
    
    for (const schedule of schedules) {
      try {
        // Add job to queue
        await addScheduleJob({
          scheduleId: schedule.id,
          userId: schedule.userId,
          walletId: schedule.walletId,
          amount: schedule.amount,
        });
        
        console.log(`Scheduled job created for schedule ${schedule.id}`);
      } catch (error) {
        console.error(`Failed to schedule job for ${schedule.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Scheduler error:', error.message);
  }
}

export { checkSchedules };
