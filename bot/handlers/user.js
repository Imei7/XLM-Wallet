/**
 * User Handlers
 * Handlers for user-facing features
 */

import UserService from '../../services/user.js';
import WalletService from '../../services/wallet.js';
import TransactionService from '../../services/transaction.js';
import ScheduleService from '../../services/schedule.js';
import StellarService from '../../services/stellar.js';
import { setSessionState, clearSession, getSession } from '../middleware/index.js';
import * as keyboards from './keyboards.js';
import { config } from '../../config/index.js';

// Register user handlers
export function registerUserHandlers(bot) {
  // Start command
  bot.command('start', async (ctx) => {
    const telegramId = ctx.from.id;
    const isAdmin = UserService.isAdmin(telegramId);
    
    await ctx.reply(
      `👋 Welcome to XLM Auto Withdraw Bot!\n\n` +
      `This bot helps you automatically withdraw XLM to Binance.\n\n` +
      `📌 Features:\n` +
      `• Multi-wallet support\n` +
      `• Auto-scheduled withdrawals\n` +
      `• Secure encrypted storage\n\n` +
      `Use the buttons below to navigate.`,
      { reply_markup: keyboards.mainMenuKeyboard(isAdmin) }
    );
  });

  // Main menu
  bot.callbackQuery('main_menu', async (ctx) => {
    const telegramId = ctx.from.id;
    const isAdmin = UserService.isAdmin(telegramId);
    
    await ctx.editMessageText(
      '🏠 Main Menu\n\nSelect an option:',
      { reply_markup: keyboards.mainMenuKeyboard(isAdmin) }
    );
  });

  // Refresh status
  bot.callbackQuery('refresh_status', async (ctx) => {
    const telegramId = ctx.from.id;
    const user = await UserService.getOrCreateUser(telegramId);
    
    if (user.status === 'active') {
      const isAdmin = UserService.isAdmin(telegramId);
      await ctx.editMessageText(
        '✅ Your account has been approved!\n\nYou can now use all features.',
        { reply_markup: keyboards.mainMenuKeyboard(isAdmin) }
      );
    } else if (user.status === 'blocked') {
      await ctx.editMessageText('🚫 Your account is blocked.');
    } else {
      await ctx.editMessageText(
        '⏳ Your account is still pending approval.',
        { reply_markup: keyboards.backKeyboard('main_menu') }
      );
    }
  });

  // ===== WALLET MENU =====
  bot.callbackQuery('wallet_menu', async (ctx) => {
    await ctx.editMessageText(
      '💼 Wallet Management\n\nManage your wallets and mnemonic.',
      { reply_markup: keyboards.walletMenuKeyboard() }
    );
  });

  // Wallet list
  bot.callbackQuery('wallet_list', async (ctx) => {
    const wallets = await WalletService.getUserWallets(ctx.from.id);
    
    if (wallets.length === 0) {
      await ctx.editMessageText(
        '📋 No wallets found.\n\nAdd a wallet to get started.',
        { reply_markup: keyboards.backKeyboard('wallet_menu') }
      );
      return;
    }
    
    await ctx.editMessageText(
      `📋 Your Wallets (${wallets.length})\n\nSelect a wallet to view details:`,
      { reply_markup: keyboards.walletListKeyboard(wallets) }
    );
  });

  // Wallet info
  bot.callbackQuery(/wallet_info_(.+)/, async (ctx) => {
    const walletId = ctx.match[1];
    const wallet = await WalletService.getWalletById(walletId);
    
    if (!wallet) {
      await ctx.answerCallbackQuery('❌ Wallet not found');
      return;
    }
    
    await ctx.editMessageText(
      `💼 Wallet Details\n\n` +
      `Address: \`${wallet.address}\`\n` +
      `Memo: ${wallet.memo || 'None'}\n` +
      `Label: ${wallet.label || 'None'}\n` +
      `Status: ${wallet.status}\n`,
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboards.walletActionsKeyboard(walletId) 
      }
    );
  });

  // Wallet balance
  bot.callbackQuery(/wallet_balance_(.+)/, async (ctx) => {
    const walletId = ctx.match[1];
    const wallet = await WalletService.getWalletById(walletId);
    
    if (!wallet) {
      await ctx.answerCallbackQuery('❌ Wallet not found');
      return;
    }
    
    await ctx.editMessageText('⏳ Checking balance...', {});
    
    const balance = await StellarService.getBalance(wallet.address);
    
    await ctx.editMessageText(
      `💰 Wallet Balance\n\n` +
      `Address: \`${wallet.address}\`\n` +
      `Balance: ${balance.toFixed(7)} XLM\n`,
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboards.walletActionsKeyboard(walletId) 
      }
    );
  });

  // Add wallet
  bot.callbackQuery('wallet_add', async (ctx) => {
    setSessionState(ctx, 'wallet_add_address');
    await ctx.editMessageText(
      '➕ Add Wallet\n\n' +
      'Send your wallet address (public key).\n\n' +
      'Example: `GDVKYU2YQQGGQ4DMXD6JFJNQJN3V3YZOWHE2S5YRVT32I3UWA3WZVJWD`',
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboards.cancelKeyboard('wallet_menu') 
      }
    );
  });

  // Remove wallet
  bot.callbackQuery('wallet_remove', async (ctx) => {
    const wallets = await WalletService.getUserWallets(ctx.from.id);
    
    if (wallets.length === 0) {
      await ctx.editMessageText(
        '📋 No wallets to remove.',
        { reply_markup: keyboards.backKeyboard('wallet_menu') }
      );
      return;
    }
    
    const buttons = wallets.map(w => [
      { 
        text: `🗑 ${w.label || 'Wallet'} - ${w.address.slice(0, 8)}...`, 
        callback_data: `wallet_delete_${w.id}` 
      },
    ]);
    buttons.push([{ text: '🔙 Back', callback_data: 'wallet_menu' }]);
    
    await ctx.editMessageText(
      '➖ Remove Wallet\n\nSelect wallet to remove:',
      { reply_markup: { inline_keyboard: buttons } }
    );
  });

  // Delete wallet
  bot.callbackQuery(/wallet_delete_(.+)/, async (ctx) => {
    const walletId = ctx.match[1];
    const result = await WalletService.removeWallet(walletId, ctx.from.id);
    
    if (result.success) {
      await ctx.editMessageText(
        '✅ Wallet removed successfully.',
        { reply_markup: keyboards.backKeyboard('wallet_menu') }
      );
    } else {
      await ctx.editMessageText(
        `❌ Failed to remove wallet: ${result.error}`,
        { reply_markup: keyboards.backKeyboard('wallet_menu') }
      );
    }
  });

  // Import mnemonic
  bot.callbackQuery('mnemonic_import', async (ctx) => {
    setSessionState(ctx, 'mnemonic_input');
    await ctx.editMessageText(
      '🔐 Import Mnemonic\n\n' +
      '⚠️ WARNING: Your mnemonic will be encrypted and stored securely.\n\n' +
      'Send your 12 or 24-word mnemonic phrase.\n\n' +
      'Format: word1 word2 word3 ...',
      { reply_markup: keyboards.cancelKeyboard('wallet_menu') }
    );
  });

  // ===== WITHDRAW MENU =====
  bot.callbackQuery('withdraw_menu', async (ctx) => {
    const hasMnemonic = await WalletService.hasMnemonic(ctx.from.id);
    
    if (!hasMnemonic) {
      await ctx.editMessageText(
        '⚠️ Mnemonic Required\n\n' +
        'You need to import your mnemonic first to enable withdrawals.',
        { reply_markup: keyboards.backKeyboard('wallet_menu') }
      );
      return;
    }
    
    await ctx.editMessageText(
      '📤 Withdraw\n\nSend XLM to Binance.',
      { reply_markup: keyboards.withdrawMenuKeyboard() }
    );
  });

  // New withdraw
  bot.callbackQuery('withdraw_new', async (ctx) => {
    const wallets = await WalletService.getUserWallets(ctx.from.id);
    
    if (wallets.length === 0) {
      await ctx.editMessageText(
        '📋 No wallets found.\n\nAdd a wallet first.',
        { reply_markup: keyboards.backKeyboard('wallet_menu') }
      );
      return;
    }
    
    await ctx.editMessageText(
      '📤 Select wallet for withdrawal:',
      { reply_markup: keyboards.walletSelectKeyboard(wallets, 'withdraw') }
    );
  });

  // Select wallet for withdraw
  bot.callbackQuery(/withdraw_select_(.+)/, async (ctx) => {
    const walletId = ctx.match[1];
    setSessionState(ctx, 'withdraw_amount', { walletId });
    
    await ctx.editMessageText(
      '💵 Enter amount in XLM\n\n' +
      `Minimum: ${config.stellar.minAmount} XLM`,
      { reply_markup: keyboards.amountKeyboard(walletId) }
    );
  });

  // Quick amount selection
  bot.callbackQuery(/withdraw_amount_(.+)_(.+)/, async (ctx) => {
    const walletId = ctx.match[1];
    const amount = parseFloat(ctx.match[2]);
    
    await processWithdraw(ctx, walletId, amount);
  });

  // Custom amount
  bot.callbackQuery(/withdraw_custom_(.+)/, async (ctx) => {
    const walletId = ctx.match[1];
    setSessionState(ctx, 'withdraw_custom_amount', { walletId });
    
    await ctx.editMessageText(
      '💵 Enter custom amount in XLM:',
      { reply_markup: keyboards.cancelKeyboard('withdraw_menu') }
    );
  });

  // Withdraw history
  bot.callbackQuery('withdraw_history', async (ctx) => {
    const transactions = await TransactionService.getUserTransactions(ctx.from.id);
    
    if (transactions.length === 0) {
      await ctx.editMessageText(
        '📋 No transactions found.',
        { reply_markup: keyboards.backKeyboard('withdraw_menu') }
      );
      return;
    }
    
    let text = '📋 Recent Transactions\n\n';
    for (const tx of transactions.slice(0, 10)) {
      const status = tx.status === 'success' ? '✅' : 
                     tx.status === 'failed' ? '❌' : 
                     tx.status === 'pending' ? '⏳' : '🔄';
      text += `${status} ${tx.amount} XLM - ${tx.status}\n`;
      text += `   ${tx.createdAt.toLocaleDateString()}\n`;
    }
    
    await ctx.editMessageText(text, { 
      reply_markup: keyboards.backKeyboard('withdraw_menu') 
    });
  });

  // ===== SCHEDULE MENU =====
  bot.callbackQuery('schedule_menu', async (ctx) => {
    const hasMnemonic = await WalletService.hasMnemonic(ctx.from.id);
    
    if (!hasMnemonic) {
      await ctx.editMessageText(
        '⚠️ Mnemonic Required\n\n' +
        'You need to import your mnemonic first to enable scheduling.',
        { reply_markup: keyboards.backKeyboard('wallet_menu') }
      );
      return;
    }
    
    await ctx.editMessageText(
      '⏱ Auto Schedule\n\nSetup automatic withdrawals.',
      { reply_markup: keyboards.scheduleMenuKeyboard() }
    );
  });

  // New schedule
  bot.callbackQuery('schedule_new', async (ctx) => {
    const wallets = await WalletService.getUserWallets(ctx.from.id);
    
    if (wallets.length === 0) {
      await ctx.editMessageText(
        '📋 No wallets found.',
        { reply_markup: keyboards.backKeyboard('wallet_menu') }
      );
      return;
    }
    
    await ctx.editMessageText(
      '⏱ Select wallet for schedule:',
      { reply_markup: keyboards.walletSelectKeyboard(wallets, 'schedule') }
    );
  });

  // Schedule list
  bot.callbackQuery('schedule_list', async (ctx) => {
    const schedules = await ScheduleService.getUserSchedules(ctx.from.id);
    
    if (schedules.length === 0) {
      await ctx.editMessageText(
        '📋 No schedules found.',
        { reply_markup: keyboards.backKeyboard('schedule_menu') }
      );
      return;
    }
    
    await ctx.editMessageText(
      `📋 Your Schedules (${schedules.length})`,
      { reply_markup: keyboards.scheduleListKeyboard(schedules) }
    );
  });

  // Schedule info
  bot.callbackQuery(/schedule_info_(.+)/, async (ctx) => {
    const scheduleId = ctx.match[1];
    const schedules = await ScheduleService.getUserSchedules(ctx.from.id);
    const schedule = schedules.find(s => s.id === scheduleId);
    
    if (!schedule) {
      await ctx.answerCallbackQuery('❌ Schedule not found');
      return;
    }
    
    await ctx.editMessageText(
      `⏱ Schedule Details\n\n` +
      `Amount: ${schedule.amount} XLM\n` +
      `Interval: Every ${schedule.intervalMinutes} minutes\n` +
      `Status: ${schedule.active ? '✅ Active' : '⏸ Paused'}\n` +
      `Last Run: ${schedule.lastRun ? schedule.lastRun.toLocaleString() : 'Never'}\n`,
      { reply_markup: keyboards.scheduleActionsKeyboard(scheduleId, schedule.active) }
    );
  });

  // Toggle schedule
  bot.callbackQuery(/schedule_toggle_(.+)/, async (ctx) => {
    const scheduleId = ctx.match[1];
    const result = await ScheduleService.toggleSchedule(scheduleId, ctx.from.id);
    
    if (result.success) {
      await ctx.answerCallbackQuery(`Schedule ${result.active ? 'activated' : 'paused'}`);
      const schedules = await ScheduleService.getUserSchedules(ctx.from.id);
      const schedule = schedules.find(s => s.id === scheduleId);
      if (schedule) {
        await ctx.editMessageReplyMarkup({
          reply_markup: keyboards.scheduleActionsKeyboard(scheduleId, schedule.active)
        });
      }
    } else {
      await ctx.answerCallbackQuery(`❌ ${result.error}`);
    }
  });

  // Delete schedule
  bot.callbackQuery(/schedule_delete_(.+)/, async (ctx) => {
    const scheduleId = ctx.match[1];
    const result = await ScheduleService.deleteSchedule(scheduleId, ctx.from.id);
    
    if (result.success) {
      await ctx.editMessageText(
        '✅ Schedule deleted.',
        { reply_markup: keyboards.backKeyboard('schedule_list') }
      );
    } else {
      await ctx.answerCallbackQuery(`❌ ${result.error}`);
    }
  });

  // ===== SETTINGS MENU =====
  bot.callbackQuery('settings_menu', async (ctx) => {
    await ctx.editMessageText(
      '⚙️ Settings\n\nManage your account.',
      { reply_markup: keyboards.settingsMenuKeyboard() }
    );
  });

  // User stats
  bot.callbackQuery('settings_stats', async (ctx) => {
    const stats = await UserService.getUserStats(ctx.from.id);
    
    if (!stats) {
      await ctx.editMessageText(
        '❌ Unable to load stats.',
        { reply_markup: keyboards.backKeyboard('settings_menu') }
      );
      return;
    }
    
    await ctx.editMessageText(
      `📊 Your Stats\n\n` +
      `Status: ${stats.status}\n` +
      `Wallets: ${stats.walletCount}/${stats.walletLimit}\n` +
      `Daily Limit: ${stats.dailyLimit} XLM\n` +
      `Used Today: ${stats.dailyUsed.toFixed(2)} XLM\n` +
      `Remaining: ${stats.dailyRemaining.toFixed(2)} XLM\n` +
      `Member Since: ${stats.createdAt.toLocaleDateString()}\n`,
      { reply_markup: keyboards.backKeyboard('settings_menu') }
    );
  });

  // Delete account
  bot.callbackQuery('settings_delete', async (ctx) => {
    await ctx.editMessageText(
      '⚠️ Delete Account\n\n' +
      'This will permanently delete your account, wallets, and all data.\n\n' +
      'Are you sure?',
      { reply_markup: keyboards.confirmKeyboard('settings_delete_confirm', 'settings_menu') }
    );
  });

  // Confirm delete account
  bot.callbackQuery('settings_delete_confirm', async (ctx) => {
    await ctx.editMessageText(
      '✅ Your account has been deleted.\n\nStart the bot again to create a new account.',
      { reply_markup: keyboards.mainMenuKeyboard(false) }
    );
  });

  // Handle text input for sessions
  bot.on('message:text', async (ctx) => {
    const session = getSession(ctx.from.id);
    if (!session || !session.state) return;
    
    const text = ctx.message.text.trim();
    
    // Handle wallet address input
    if (session.state === 'wallet_add_address') {
      if (!StellarService.isValidAddress(text)) {
        await ctx.reply('❌ Invalid Stellar address. Please try again.');
        return;
      }
      
      const result = await WalletService.addWallet(
        ctx.from.id,
        text,
        null,
        `Wallet ${Date.now()}`
      );
      
      if (result.success) {
        clearSession(ctx);
        await ctx.reply(
          '✅ Wallet added successfully!',
          { reply_markup: keyboards.backKeyboard('wallet_menu') }
        );
      } else {
        await ctx.reply(`❌ Failed to add wallet: ${result.error}`);
      }
      return;
    }
    
    // Handle mnemonic input
    if (session.state === 'mnemonic_input') {
      const result = await WalletService.saveMnemonic(ctx.from.id, text);
      
      if (result.success) {
        clearSession(ctx);
        await ctx.reply(
          '✅ Mnemonic imported and encrypted successfully!\n\n' +
          'You can now make withdrawals.',
          { reply_markup: keyboards.backKeyboard('wallet_menu') }
        );
      } else {
        await ctx.reply(`❌ Failed to import mnemonic: ${result.error}`);
      }
      return;
    }
    
    // Handle custom withdraw amount
    if (session.state === 'withdraw_custom_amount') {
      const amount = parseFloat(text);
      if (isNaN(amount) || amount < config.stellar.minAmount) {
        await ctx.reply(`❌ Invalid amount. Minimum is ${config.stellar.minAmount} XLM.`);
        return;
      }
      
      await processWithdraw(ctx, session.data.walletId, amount);
      clearSession(ctx);
      return;
    }
    
    // Handle schedule amount
    if (session.state === 'schedule_amount') {
      const amount = parseFloat(text);
      if (isNaN(amount) || amount < config.stellar.minAmount) {
        await ctx.reply(`❌ Invalid amount. Minimum is ${config.stellar.minAmount} XLM.`);
        return;
      }
      
      setSessionState(ctx, 'schedule_interval', { 
        walletId: session.data.walletId, 
        amount 
      });
      
      await ctx.reply(
        '⏱ Select interval:',
        { reply_markup: keyboards.intervalKeyboard(session.data.walletId, amount) }
      );
      return;
    }
  });
}

// Process withdrawal
async function processWithdraw(ctx, walletId, amount) {
  const wallet = await WalletService.getWalletById(walletId);
  
  if (!wallet) {
    await ctx.editMessageText(
      '❌ Wallet not found.',
      { reply_markup: keyboards.backKeyboard('withdraw_menu') }
    );
    return;
  }
  
  // Show confirmation
  await ctx.editMessageText(
    `📤 Confirm Withdrawal\n\n` +
    `From: ${wallet.address.slice(0, 8)}...${wallet.address.slice(-8)}\n` +
    `To: Binance Deposit\n` +
    `Amount: ${amount} XLM\n\n` +
    `Proceed?`,
    { 
      reply_markup: keyboards.confirmKeyboard(
        `withdraw_confirm_${walletId}_${amount}`,
        'withdraw_menu'
      ) 
    }
  );
}

// Register withdraw confirm handler
export function registerWithdrawConfirmHandler(bot) {
  bot.callbackQuery(/withdraw_confirm_(.+)_(.+)/, async (ctx) => {
    const walletId = ctx.match[1];
    const amount = parseFloat(ctx.match[2]);
    
    await ctx.editMessageText('⏳ Processing withdrawal...', {});
    
    const result = await TransactionService.createWithdraw(ctx.from.id, walletId, amount);
    
    if (result.success) {
      await ctx.editMessageText(
        `✅ Withdrawal queued!\n\n` +
        `Amount: ${amount} XLM\n` +
        `Transaction ID: ${result.transaction.id}\n\n` +
        `The withdrawal will be processed shortly.`,
        { reply_markup: keyboards.backKeyboard('main_menu') }
      );
    } else {
      await ctx.editMessageText(
        `❌ Withdrawal failed: ${result.error}`,
        { reply_markup: keyboards.backKeyboard('withdraw_menu') }
      );
    }
  });

  // Handle interval selection for schedule
  bot.callbackQuery(/schedule_interval_(.+)_(.+)_(.+)/, async (ctx) => {
    const walletId = ctx.match[1];
    const amount = parseFloat(ctx.match[2]);
    const intervalMinutes = parseInt(ctx.match[3]);
    
    const result = await ScheduleService.createSchedule(
      ctx.from.id,
      walletId,
      amount,
      intervalMinutes
    );
    
    if (result.success) {
      clearSession(ctx);
      await ctx.editMessageText(
        `✅ Schedule created!\n\n` +
        `Amount: ${amount} XLM\n` +
        `Interval: Every ${intervalMinutes} minutes\n\n` +
        `First withdrawal will occur in ${intervalMinutes} minutes.`,
        { reply_markup: keyboards.backKeyboard('schedule_menu') }
      );
    } else {
      await ctx.editMessageText(
        `❌ Failed to create schedule: ${result.error}`,
        { reply_markup: keyboards.backKeyboard('schedule_menu') }
      );
    }
  });
}
