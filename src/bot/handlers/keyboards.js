/**
 * Keyboard Utilities
 * Reusable inline keyboards
 */

// Main menu keyboard
export function mainMenuKeyboard(isAdmin = false) {
  const buttons = [
    [
      { text: '💼 Wallet', callback_data: 'wallet_menu' },
      { text: '📤 Withdraw', callback_data: 'withdraw_menu' },
    ],
    [
      { text: '⏱ Auto Schedule', callback_data: 'schedule_menu' },
      { text: '⚙️ Settings', callback_data: 'settings_menu' },
    ],
  ];

  if (isAdmin) {
    buttons.push([{ text: '👑 Admin Panel', callback_data: 'admin_menu' }]);
  }

  return { inline_keyboard: buttons };
}

// Wallet menu keyboard
export function walletMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '➕ Add Wallet', callback_data: 'wallet_add' },
        { text: '➖ Remove Wallet', callback_data: 'wallet_remove' },
      ],
      [
        { text: '📋 My Wallets', callback_data: 'wallet_list' },
      ],
      [
        { text: '🔑 Import Mnemonic', callback_data: 'mnemonic_import' },
      ],
      [
        { text: '🔙 Back', callback_data: 'main_menu' },
      ],
    ],
  };
}

// Wallet list keyboard
export function walletListKeyboard(wallets) {
  const buttons = wallets.map(w => [
    {
      text: `${w.label || 'Wallet'} - ${w.address.slice(0, 8)}...${w.address.slice(-8)}`,
      callback_data: `wallet_info_${w.id}`,
    },
  ]);
  
  buttons.push([{ text: '🔙 Back', callback_data: 'wallet_menu' }]);
  
  return { inline_keyboard: buttons };
}

// Wallet actions keyboard
export function walletActionsKeyboard(walletId) {
  return {
    inline_keyboard: [
      [
        { text: '💰 Check Balance', callback_data: `wallet_balance_${walletId}` },
        { text: '📤 Withdraw', callback_data: `wallet_withdraw_${walletId}` },
      ],
      [
        { text: '🗑 Remove', callback_data: `wallet_delete_${walletId}` },
      ],
      [
        { text: '🔙 Back', callback_data: 'wallet_list' },
      ],
    ],
  };
}

// Withdraw menu keyboard
export function withdrawMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📤 New Withdraw', callback_data: 'withdraw_new' },
      ],
      [
        { text: '📋 History', callback_data: 'withdraw_history' },
      ],
      [
        { text: '🔙 Back', callback_data: 'main_menu' },
      ],
    ],
  };
}

// Wallet selection keyboard for withdraw
export function walletSelectKeyboard(wallets, action) {
  const buttons = wallets.map(w => [
    {
      text: `${w.label || 'Wallet'} - ${w.address.slice(0, 8)}...`,
      callback_data: `withdraw_select_${w.id}`,
    },
  ]);
  
  buttons.push([{ text: '🔙 Back', callback_data: 'withdraw_menu' }]);
  
  return { inline_keyboard: buttons };
}

// Confirm keyboard
export function confirmKeyboard(confirmAction, cancelAction) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Confirm', callback_data: confirmAction },
        { text: '❌ Cancel', callback_data: cancelAction },
      ],
    ],
  };
}

// Schedule menu keyboard
export function scheduleMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '➕ New Schedule', callback_data: 'schedule_new' },
        { text: '📋 My Schedules', callback_data: 'schedule_list' },
      ],
      [
        { text: '🔙 Back', callback_data: 'main_menu' },
      ],
    ],
  };
}

// Schedule list keyboard
export function scheduleListKeyboard(schedules) {
  const buttons = schedules.map(s => [
    {
      text: `${s.active ? '✅' : '⏸'} ${s.amount} XLM - Every ${s.intervalMinutes}m`,
      callback_data: `schedule_info_${s.id}`,
    },
  ]);
  
  buttons.push([{ text: '🔙 Back', callback_data: 'schedule_menu' }]);
  
  return { inline_keyboard: buttons };
}

// Schedule actions keyboard
export function scheduleActionsKeyboard(scheduleId, active) {
  return {
    inline_keyboard: [
      [
        { text: active ? '⏸ Pause' : '▶️ Resume', callback_data: `schedule_toggle_${scheduleId}` },
        { text: '🗑 Delete', callback_data: `schedule_delete_${scheduleId}` },
      ],
      [
        { text: '🔙 Back', callback_data: 'schedule_list' },
      ],
    ],
  };
}

// Settings menu keyboard
export function settingsMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📊 My Stats', callback_data: 'settings_stats' },
      ],
      [
        { text: '🗑 Delete Account', callback_data: 'settings_delete' },
      ],
      [
        { text: '🔙 Back', callback_data: 'main_menu' },
      ],
    ],
  };
}

// Amount keyboard (quick amounts)
export function amountKeyboard(walletId) {
  return {
    inline_keyboard: [
      [
        { text: '10 XLM', callback_data: `withdraw_amount_${walletId}_10` },
        { text: '50 XLM', callback_data: `withdraw_amount_${walletId}_50` },
      ],
      [
        { text: '100 XLM', callback_data: `withdraw_amount_${walletId}_100` },
        { text: '500 XLM', callback_data: `withdraw_amount_${walletId}_500` },
      ],
      [
        { text: '💰 Custom Amount', callback_data: `withdraw_custom_${walletId}` },
      ],
      [
        { text: '🔙 Back', callback_data: 'withdraw_menu' },
      ],
    ],
  };
}

// Interval keyboard
export function intervalKeyboard(walletId, amount) {
  return {
    inline_keyboard: [
      [
        { text: '1 Hour', callback_data: `schedule_interval_${walletId}_${amount}_60` },
        { text: '6 Hours', callback_data: `schedule_interval_${walletId}_${amount}_360` },
      ],
      [
        { text: '12 Hours', callback_data: `schedule_interval_${walletId}_${amount}_720` },
        { text: '24 Hours', callback_data: `schedule_interval_${walletId}_${amount}_1440` },
      ],
      [
        { text: '🔙 Back', callback_data: 'schedule_menu' },
      ],
    ],
  };
}

// Admin menu keyboard
export function adminMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📊 Dashboard', callback_data: 'admin_dashboard' },
        { text: '👥 Users', callback_data: 'admin_users' },
      ],
      [
        { text: '💼 Wallets', callback_data: 'admin_wallets' },
        { text: '💸 Transactions', callback_data: 'admin_transactions' },
      ],
      [
        { text: '📢 Broadcast', callback_data: 'admin_broadcast' },
      ],
      [
        { text: '⚙️ System', callback_data: 'admin_system' },
      ],
      [
        { text: '🔙 Main Menu', callback_data: 'main_menu' },
      ],
    ],
  };
}

// User management keyboard
export function userManageKeyboard(userId) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `admin_user_approve_${userId}` },
        { text: '🚫 Block', callback_data: `admin_user_block_${userId}` },
      ],
      [
        { text: '💰 Set Limits', callback_data: `admin_user_limits_${userId}` },
      ],
      [
        { text: '🔙 Back', callback_data: 'admin_users' },
      ],
    ],
  };
}

// Broadcast target keyboard
export function broadcastTargetKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📤 All Users', callback_data: 'broadcast_target_all' },
        { text: '✅ Active Users', callback_data: 'broadcast_target_active' },
      ],
      [
        { text: '🎯 Custom Users', callback_data: 'broadcast_target_custom' },
      ],
      [
        { text: '🔙 Back', callback_data: 'admin_menu' },
      ],
    ],
  };
}

// Pagination keyboard
export function paginationKeyboard(currentPage, totalPages, action) {
  const buttons = [];
  
  if (currentPage > 1) {
    buttons.push({ text: '⬅️ Previous', callback_data: `${action}_${currentPage - 1}` });
  }
  
  buttons.push({ text: `${currentPage}/${totalPages}`, callback_data: 'noop' });
  
  if (currentPage < totalPages) {
    buttons.push({ text: '➡️ Next', callback_data: `${action}_${currentPage + 1}` });
  }
  
  return {
    inline_keyboard: [
      buttons,
      [{ text: '🔙 Back', callback_data: 'admin_menu' }],
    ],
  };
}

// Cancel keyboard
export function cancelKeyboard(action = 'main_menu') {
  return {
    inline_keyboard: [
      [{ text: '❌ Cancel', callback_data: action }],
    ],
  };
}

// Back keyboard
export function backKeyboard(action) {
  return {
    inline_keyboard: [
      [{ text: '🔙 Back', callback_data: action }],
    ],
  };
}
