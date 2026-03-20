/**
 * Telegram Bot Entry Point
 * Main bot process
 */
import 'dotenv/config';
// atau jika pake require()
// require('dotenv').config();
import { Bot, GrammyError } from 'grammy';
import { config, validateEnv } from './config/index.js';
import { 
  authMiddleware, 
  rateLimitMiddleware, 
  adminMiddleware, 
  activeUserMiddleware,
  sessionMiddleware,
} from './bot/middleware/index.js';
import { registerUserHandlers, registerWithdrawConfirmHandler } from './bot/handlers/user.js';
import { registerAdminHandlers } from './bot/handlers/admin.js';
import { getPrismaClient } from './db/index.js';

// Validate environment
validateEnv();

// Initialize database
getPrismaClient();

// Create bot
const bot = new Bot(config.telegram.token);

// Error handler
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else {
    console.error('Unknown error:', e);
  }
});

// Apply middleware
bot.use(sessionMiddleware);
bot.use(authMiddleware);
bot.use(rateLimitMiddleware);

// Register handlers
registerUserHandlers(bot);
registerWithdrawConfirmHandler(bot);
registerAdminHandlers(bot);

// Handle callback query for back buttons
bot.callbackQuery('noop', async (ctx) => {
  await ctx.answerCallbackQuery();
});

// Start bot with polling and auto-retry
async function startBot() {
  let retries = 0;
  const maxRetries = 10;
  const retryDelay = 5000;

  while (retries < maxRetries) {
    try {
      console.log('Starting bot...');
      await bot.start({
        onStart: () => {
          console.log('✅ Bot started successfully');
          retries = 0; // Reset retries on success
        },
      });
      break;
    } catch (error) {
      retries++;
      console.error(`Bot start error (attempt ${retries}/${maxRetries}):`, error.message);
      
      if (retries < maxRetries) {
        console.log(`Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('Max retries reached. Exiting.');
        process.exit(1);
      }
    }
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down bot...');
  try {
    await bot.stop();
    console.log('Bot stopped');
  } catch (error) {
    console.error('Error stopping bot:', error);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start
startBot();
