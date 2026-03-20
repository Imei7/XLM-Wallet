/**
 * Admin Handlers
 * Handlers for admin panel features
 */

import UserService from '../../services/user.js';
import WalletService from '../../services/wallet.js';
import TransactionService from '../../services/transaction.js';
import ScheduleService from '../../services/schedule.js';
import BroadcastService from '../../services/broadcast.js';
import { getQueueStats } from '../../queue/index.js';
import { setSessionState, clearSession, getSession } from '../middleware/index.js';
import { AdminLogRepo } from '../../db/index.js';
import * as keyboards from './keyboards.js';
import { config } from '../../config/index.js';
import { PrismaClient } from '@prisma/client';

// Register admin handlers
export function registerAdminHandlers(bot) {
  // Admin menu
  bot.callbackQuery('admin_menu', async (ctx) => {
    await ctx.editMessageText(
      '👑 Admin Panel\n\nManage the bot.',
      { reply_markup: keyboards.adminMenuKeyboard() }
    );
  });

  // Dashboard
  bot.callbackQuery('admin_dashboard', async (ctx) => {
    await ctx.editMessageText('⏳ Loading dashboard...', {});
    
    const [userCounts, txStats, scheduleStats, queueStats, broadcastStats] = await Promise.all([
      UserService.getUserCounts(),
      TransactionService.getTransactionStats(),
      ScheduleService.getScheduleStats(),
      getQueueStats(),
      BroadcastService.getBroadcastStats(),
    ]);
    
    await ctx.editMessageText(
      `📊 Dashboard\n\n` +
      `👥 Users:\n` +
      `   Total: ${userCounts.total}\n` +
      `   Active: ${userCounts.active}\n` +
      `   Pending: ${userCounts.pending}\n` +
      `   Blocked: ${userCounts.blocked}\n\n` +
      `💸 Transactions:\n` +
      `   Total: ${txStats.total}\n` +
      `   Success: ${txStats.success}\n` +
      `   Pending: ${txStats.pending}\n` +
      `   Failed: ${txStats.failed}\n\n` +
      `⏱ Schedules:\n` +
      `   Total: ${scheduleStats.total}\n` +
      `   Active: ${scheduleStats.active}\n\n` +
      `📤 Queue:\n` +
      `   Withdraw: ${queueStats.withdraw.waiting} waiting, ${queueStats.withdraw.active} active\n` +
      `   Broadcast: ${queueStats.broadcast.waiting} waiting\n`,
      { reply_markup: keyboards.backKeyboard('admin_menu') }
    );
  });

  // User management
  bot.callbackQuery('admin_users', async (ctx) => {
    const pendingUsers = await UserService.getPendingUsers();
    
    let text = '👥 User Management\n\n';
    
    if (pendingUsers.length > 0) {
      text += `⏳ Pending Users (${pendingUsers.length}):\n`;
      for (const user of pendingUsers.slice(0, 5)) {
        text += `• ID: ${user.telegramId} - ${user.createdAt.toLocaleDateString()}\n`;
      }
      if (pendingUsers.length > 5) {
        text += `... and ${pendingUsers.length - 5} more\n`;
      }
      text += '\n';
    }
    
    const buttons = [
      [{ text: '⏳ Pending Users', callback_data: 'admin_users_pending' }],
      [{ text: '✅ Active Users', callback_data: 'admin_users_active' }],
      [{ text: '🚫 Blocked Users', callback_data: 'admin_users_blocked' }],
      [{ text: '🔍 Search User', callback_data: 'admin_users_search' }],
      [{ text: '🔙 Back', callback_data: 'admin_menu' }],
    ];
    
    await ctx.editMessageText(text, { reply_markup: { inline_keyboard: buttons } });
  });

  // Pending users list
  bot.callbackQuery('admin_users_pending', async (ctx) => {
    const users = await UserService.getPendingUsers();
    
    if (users.length === 0) {
      await ctx.editMessageText(
        '✅ No pending users.',
        { reply_markup: keyboards.backKeyboard('admin_users') }
      );
      return;
    }
    
    const buttons = users.map(u => [
      { text: `⏳ ${u.telegramId}`, callback_data: `admin_user_${u.id}` },
    ]);
    buttons.push([{ text: '🔙 Back', callback_data: 'admin_users' }]);
    
    await ctx.editMessageText(
      `⏳ Pending Users (${users.length})`,
      { reply_markup: { inline_keyboard: buttons } }
    );
  });

  // Active users
  bot.callbackQuery('admin_users_active', async (ctx) => {
    const { users, pagination } = await UserService.getAllUsers(1, 20);
    const activeUsers = users.filter(u => u.status === 'active');
    
    await ctx.editMessageText(
      `✅ Active Users (${activeUsers.length})`,
      { reply_markup: keyboards.paginationKeyboard(1, pagination.totalPages, 'admin_users_page') }
    );
  });

  // Blocked users
  bot.callbackQuery('admin_users_blocked', async (ctx) => {
    const users = await UserService.findByStatus('blocked');
    
    if (users.length === 0) {
      await ctx.editMessageText(
        '✅ No blocked users.',
        { reply_markup: keyboards.backKeyboard('admin_users') }
      );
      return;
    }
    
    const buttons = users.map(u => [
      { text: `🚫 ${u.telegramId}`, callback_data: `admin_user_${u.id}` },
    ]);
    buttons.push([{ text: '🔙 Back', callback_data: 'admin_users' }]);
    
    await ctx.editMessageText(
      `🚫 Blocked Users (${users.length})`,
      { reply_markup: { inline_keyboard: buttons } }
    );
  });

  // Search user
  bot.callbackQuery('admin_users_search', async (ctx) => {
    setSessionState(ctx, 'admin_search_user');
    await ctx.editMessageText(
      '🔍 Enter Telegram ID to search:',
      { reply_markup: keyboards.cancelKeyboard('admin_users') }
    );
  });

  // User details
  bot.callbackQuery(/admin_user_(.+)/, async (ctx) => {
    const userId = ctx.match[1];
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: true },
    });
    
    await prisma.$disconnect();
    
    if (!user) {
      await ctx.answerCallbackQuery('❌ User not found');
      return;
    }
    
    const stats = await UserService.getUserStats(user.telegramId);
    
    await ctx.editMessageText(
      `👤 User Details\n\n` +
      `Telegram ID: ${user.telegramId}\n` +
      `Status: ${user.status}\n` +
      `Wallets: ${user.wallets ? user.wallets.length : 0}/${user.walletLimit}\n` +
      `Daily Limit: ${user.dailyLimit} XLM\n` +
      `Created: ${user.createdAt.toLocaleString()}\n`,
      { reply_markup: keyboards.userManageKeyboard(user.id) }
    );
  });

  // Approve user
  bot.callbackQuery(/admin_user_approve_(.+)/, async (ctx) => {
    const userId = ctx.match[1];
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.$disconnect();
    
    if (!user) {
      await ctx.answerCallbackQuery('❌ User not found');
      return;
    }
    
    const result = await UserService.approveUser(user.telegramId);
    
    if (result.success) {
      await AdminLogRepo.create(ctx.from.id, 'approve_user', userId);
      await ctx.editMessageText(
        '✅ User approved.',
        { reply_markup: keyboards.backKeyboard('admin_users_pending') }
      );
    } else {
      await ctx.answerCallbackQuery(`❌ ${result.error}`);
    }
  });

  // Block user
  bot.callbackQuery(/admin_user_block_(.+)/, async (ctx) => {
    const userId = ctx.match[1];
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.$disconnect();
    
    if (!user) {
      await ctx.answerCallbackQuery('❌ User not found');
      return;
    }
    
    const result = await UserService.blockUser(user.telegramId);
    
    if (result.success) {
      await AdminLogRepo.create(ctx.from.id, 'block_user', userId);
      await ctx.editMessageText(
        '🚫 User blocked.',
        { reply_markup: keyboards.backKeyboard('admin_users') }
      );
    } else {
      await ctx.answerCallbackQuery(`❌ ${result.error}`);
    }
  });

  // Set user limits
  bot.callbackQuery(/admin_user_limits_(.+)/, async (ctx) => {
    const userId = ctx.match[1];
    setSessionState(ctx, 'admin_set_limits', { userId });
    
    await ctx.editMessageText(
      '💰 Set User Limits\n\n' +
      'Enter limits in format: `wallet_limit,daily_limit`\n\n' +
      'Example: `5,1000` (5 wallets, 1000 XLM daily)',
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboards.cancelKeyboard('admin_users') 
      }
    );
  });

  // Wallet management
  bot.callbackQuery('admin_wallets', async (ctx) => {
    const { wallets, pagination } = await WalletService.getAllWallets(1, 20);
    
    let text = `💼 Wallet Management\n\nTotal Wallets: ${pagination.total}\n\n`;
    
    const buttons = [
      [{ text: '🔍 Search Wallet', callback_data: 'admin_wallets_search' }],
      [{ text: '🔙 Back', callback_data: 'admin_menu' }],
    ];
    
    await ctx.editMessageText(text, { reply_markup: { inline_keyboard: buttons } });
  });

  // Transaction management
  bot.callbackQuery('admin_transactions', async (ctx) => {
    const stats = await TransactionService.getTransactionStats();
    
    const buttons = [
      [{ text: '⏳ Pending', callback_data: 'admin_tx_pending' }],
      [{ text: '❌ Failed', callback_data: 'admin_tx_failed' }],
      [{ text: '✅ Success', callback_data: 'admin_tx_success' }],
      [{ text: '🔍 Search', callback_data: 'admin_tx_search' }],
      [{ text: '🔙 Back', callback_data: 'admin_menu' }],
    ];
    
    await ctx.editMessageText(
      `💸 Transaction Management\n\n` +
      `Total: ${stats.total}\n` +
      `Pending: ${stats.pending}\n` +
      `Processing: ${stats.processing}\n` +
      `Success: ${stats.success}\n` +
      `Failed: ${stats.failed}\n`,
      { reply_markup: { inline_keyboard: buttons } }
    );
  });

  // Pending transactions
  bot.callbackQuery('admin_tx_pending', async (ctx) => {
    const transactions = await TransactionService.getPendingTransactions(20);
    
    if (transactions.length === 0) {
      await ctx.editMessageText(
        '✅ No pending transactions.',
        { reply_markup: keyboards.backKeyboard('admin_transactions') }
      );
      return;
    }
    
    let text = `⏳ Pending Transactions (${transactions.length})\n\n`;
    for (const tx of transactions.slice(0, 10)) {
      text += `• ${tx.amount} XLM - ${tx.user?.telegramId}\n`;
    }
    
    await ctx.editMessageText(text, { 
      reply_markup: keyboards.backKeyboard('admin_transactions') 
    });
  });

  // Failed transactions
  bot.callbackQuery('admin_tx_failed', async (ctx) => {
    const transactions = await TransactionService.getFailedTransactions(20);
    
    if (transactions.length === 0) {
      await ctx.editMessageText(
        '✅ No failed transactions.',
        { reply_markup: keyboards.backKeyboard('admin_transactions') }
      );
      return;
    }
    
    let text = `❌ Failed Transactions (${transactions.length})\n\n`;
    for (const tx of transactions.slice(0, 10)) {
      text += `• ${tx.amount} XLM - ${tx.error || 'Unknown error'}\n`;
    }
    
    const buttons = [
      [{ text: '🔄 Retry All Failed', callback_data: 'admin_tx_retry_all' }],
      [{ text: '🔙 Back', callback_data: 'admin_transactions' }],
    ];
    
    await ctx.editMessageText(text, { reply_markup: { inline_keyboard: buttons } });
  });

  // Retry all failed
  bot.callbackQuery('admin_tx_retry_all', async (ctx) => {
    const transactions = await TransactionService.getFailedTransactions(100);
    let retried = 0;
    
    for (const tx of transactions) {
      const result = await TransactionService.retryTransaction(tx.id);
      if (result.success) retried++;
    }
    
    await AdminLogRepo.create(ctx.from.id, 'retry_all_failed', null, `Retried ${retried} transactions`);
    await ctx.editMessageText(
      `✅ Retried ${retried} transactions.`,
      { reply_markup: keyboards.backKeyboard('admin_transactions') }
    );
  });

  // Success transactions
  bot.callbackQuery('admin_tx_success', async (ctx) => {
    const { transactions, pagination } = await TransactionService.getAllTransactions(1, 20, 'success');
    
    let text = `✅ Successful Transactions\n\n`;
    for (const tx of transactions.slice(0, 10)) {
      text += `• ${tx.amount} XLM - Hash: ${tx.hash?.slice(0, 8)}...\n`;
    }
    
    await ctx.editMessageText(text, { 
      reply_markup: keyboards.backKeyboard('admin_transactions') 
    });
  });

  // Broadcast menu
  bot.callbackQuery('admin_broadcast', async (ctx) => {
    const stats = await BroadcastService.getBroadcastStats();
    
    await ctx.editMessageText(
      `📢 Broadcast System\n\n` +
      `Create and send messages to users.\n\n` +
      `Stats:\n` +
      `• Pending: ${stats.pending}\n` +
      `• Processing: ${stats.processing}\n` +
      `• Completed: ${stats.completed}\n` +
      `• Failed: ${stats.failed}\n`,
      { reply_markup: keyboards.broadcastTargetKeyboard() }
    );
  });

  // Broadcast target selection
  bot.callbackQuery('broadcast_target_all', async (ctx) => {
    setSessionState(ctx, 'broadcast_message', { target: 'all' });
    await ctx.editMessageText(
      '📢 Broadcast to All Users\n\n' +
      'Enter your message:',
      { reply_markup: keyboards.cancelKeyboard('admin_broadcast') }
    );
  });

  bot.callbackQuery('broadcast_target_active', async (ctx) => {
    setSessionState(ctx, 'broadcast_message', { target: 'active' });
    await ctx.editMessageText(
      '📢 Broadcast to Active Users\n\n' +
      'Enter your message:',
      { reply_markup: keyboards.cancelKeyboard('admin_broadcast') }
    );
  });

  bot.callbackQuery('broadcast_target_custom', async (ctx) => {
    setSessionState(ctx, 'broadcast_custom_ids');
    await ctx.editMessageText(
      '📢 Broadcast to Custom Users\n\n' +
      'Enter Telegram IDs separated by commas:\n\n' +
      'Example: `123456789,987654321`',
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboards.cancelKeyboard('admin_broadcast') 
      }
    );
  });

  // System settings
  bot.callbackQuery('admin_system', async (ctx) => {
    const queueStats = await getQueueStats();
    
    await ctx.editMessageText(
      `⚙️ System Settings\n\n` +
      `Bot Status: ✅ Running\n` +
      `Scheduler: ${config.scheduler.enabled ? '✅ Enabled' : '⏸ Disabled'}\n\n` +
      `Queue Status:\n` +
      `• Withdraw: ${queueStats.withdraw.waiting} waiting, ${queueStats.withdraw.failed} failed\n` +
      `• Schedule: ${queueStats.schedule.waiting} waiting\n` +
      `• Broadcast: ${queueStats.broadcast.waiting} waiting\n\n` +
      `Environment: ${process.env.NODE_ENV || 'development'}`,
      { reply_markup: keyboards.backKeyboard('admin_menu') }
    );
  });

  // Handle text input for admin sessions
  bot.on('message:text', async (ctx) => {
    const session = getSession(ctx.from.id);
    if (!session || !session.state) return;
    
    const text = ctx.message.text.trim();
    
    // Handle user search
    if (session.state === 'admin_search_user') {
      const telegramId = text;
      const user = await UserService.getOrCreateUser(telegramId);
      
      if (!user) {
        await ctx.reply('❌ User not found.');
        return;
      }
      
      clearSession(ctx);
      
      await ctx.reply(
        `👤 User Found\n\n` +
        `Telegram ID: ${user.telegramId}\n` +
        `Status: ${user.status}\n`,
        { reply_markup: keyboards.userManageKeyboard(user.id) }
      );
      return;
    }
    
    // Handle set limits
    if (session.state === 'admin_set_limits') {
      const [walletLimit, dailyLimit] = text.split(',').map(v => v.trim());
      
      const prisma = new PrismaClient();
      const user = await prisma.user.findUnique({ where: { id: session.data.userId } });
      await prisma.$disconnect();
      
      if (!user) {
        await ctx.reply('❌ User not found.');
        clearSession(ctx);
        return;
      }
      
      const result = await UserService.updateUserLimits(
        user.telegramId,
        parseInt(walletLimit),
        parseFloat(dailyLimit)
      );
      
      if (result.success) {
        await AdminLogRepo.create(ctx.from.id, 'update_limits', user.id, text);
        await ctx.reply('✅ Limits updated successfully.');
      } else {
        await ctx.reply(`❌ Failed to update limits: ${result.error}`);
      }
      
      clearSession(ctx);
      return;
    }
    
    // Handle broadcast custom IDs
    if (session.state === 'broadcast_custom_ids') {
      const ids = text.split(',').map(id => id.trim());
      setSessionState(ctx, 'broadcast_message', { target: 'custom', targetIds: ids });
      
      await ctx.reply(
        '📢 Enter your broadcast message:',
        { reply_markup: keyboards.cancelKeyboard('admin_broadcast') }
      );
      return;
    }
    
    // Handle broadcast message
    if (session.state === 'broadcast_message') {
      const message = text;
      const target = session.data.target;
      const targetIds = session.data.targetIds;
      
      // Show preview
      await ctx.reply(
        `📢 Broadcast Preview\n\n` +
        `Target: ${target === 'all' ? 'All Users' : target === 'active' ? 'Active Users' : 'Custom'}\n\n` +
        `Message:\n${message}\n\n` +
        `Send this message?`,
        { reply_markup: keyboards.confirmKeyboard('broadcast_send', 'admin_broadcast') }
      );
      
      setSessionState(ctx, 'broadcast_confirm', { message, target, targetIds });
      return;
    }
  });

  // Confirm broadcast
  bot.callbackQuery('broadcast_send', async (ctx) => {
    const session = getSession(ctx.from.id);
    if (!session || session.state !== 'broadcast_confirm') {
      await ctx.answerCallbackQuery('❌ Session expired');
      return;
    }
    
    const { message, target, targetIds } = session.data;
    
    await ctx.editMessageText('⏳ Creating broadcast...', {});
    
    const result = await BroadcastService.createBroadcast(
      ctx.from.id,
      message,
      target,
      targetIds
    );
    
    clearSession(ctx);
    
    if (result.success) {
      await AdminLogRepo.create(ctx.from.id, 'broadcast', null, `Target: ${target}, Count: ${result.targetCount}`);
      await ctx.editMessageText(
        `✅ Broadcast created!\n\n` +
        `Target: ${result.targetCount} users\n` +
        `Batches: ${result.batchCount}\n\n` +
        `Broadcast ID: ${result.broadcast.id}\n\n` +
        `Messages will be sent shortly.`,
        { reply_markup: keyboards.backKeyboard('admin_broadcast') }
      );
    } else {
      await ctx.editMessageText(
        `❌ Broadcast failed: ${result.error}`,
        { reply_markup: keyboards.backKeyboard('admin_broadcast') }
      );
    }
  });
}
