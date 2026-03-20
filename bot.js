/**
 * Telegram Bot Entry Point - Production Ready for Railway
 */
import 'dotenv/config'; // dotenv harus dipanggil pertama
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

// ------------------------------
// 1. Validate environment
// ------------------------------
validateEnv();

// ------------------------------
// 2. Initialize database
// ------------------------------
const prisma = await getPrismaClient();

// ------------------------------
// 3. Create bot
// ------------------------------
const bot = new Bot(config.telegram.token);

// ------------------------------
// 4. Error handler
// ------------------------------
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`❌ Error while handling update ${ctx?.update?.update_id ?? 'unknown'}:`);
  const e = err.error;

  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else {
    console.error('Unknown error:', e);
  }

  // Optional: send notification to admin
  // if (config.telegram.admin_id) bot.api.sendMessage(config.telegram.admin_id, `Bot error: ${e.message}`);
});

// ------------------------------
// 5. Apply middleware
// ------------------------------
bot.use(sessionMiddleware);
bot.use(authMiddleware);
bot.use(rateLimitMiddleware);
bot.use(activeUserMiddleware);
bot.use(adminMiddleware);

// ------------------------------
// 6. Register handlers
// ------------------------------
registerUserHandlers(bot);
registerWithdrawConfirmHandler(bot);
registerAdminHandlers(bot);

// ------------------------------
// 7. Default callback query (back buttons)
// ------------------------------
bot.callbackQuery('noop', async (ctx) => {
  await ctx.answerCallbackQuery().catch(console.error);
});

// ------------------------------
// 8. Start bot with retry & exponential backoff
// ------------------------------
async function startBot() {
  let retries = 0;
  const maxRetries = 10;
  let retryDelay = 5000; // start 5s

  while (retries < maxRetries) {
    try {
      console.log('🚀 Starting bot...');
      await bot.start({
        onStart: () => console.log('✅ Bot started successfully'),
      });
      break; // started successfully
    } catch (error) {
      retries++;
      console.error(`⚠️ Bot start error (attempt ${retries}/${maxRetries}):`, error.message);
      if (retries < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 1.5; // exponential backoff
      } else {
        console.error('❌ Max retries reached. Exiting bot.');
        process.exit(1);
      }
    }
  }
}

// ------------------------------
// 9. Graceful shutdown for Railway
// ------------------------------
async function shutdown(signal) {
  console.log(`🛑 Received ${signal}, shutting down bot...`);
  try {
    await bot.stop();
    console.log('✅ Bot stopped gracefully');
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ------------------------------
// 10. Start
// ------------------------------
startBot().catch(err => {
  console.error('❌ Fatal error starting bot:', err);
  process.exit(1);
});
