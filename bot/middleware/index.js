/**
 * Bot Middleware
 * Authentication, rate limiting, and admin checks
 */

import UserService from '../../services/user.js';
import { config } from '../../config/index.js';

// Sessions storage
const sessions = new Map();

// Auth middleware - ensure user exists and is not blocked
export async function authMiddleware(ctx, next) {
  try {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      return ctx.reply('❌ Unable to identify user. Please restart the bot.');
    }

    // Get or create user
    const user = await UserService.getOrCreateUser(telegramId);
    
    // Check if blocked
    if (user.status === 'blocked') {
      return ctx.reply('🚫 Your account has been blocked. Contact support.');
    }

    // Store user in context
    ctx.user = user;
    
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return ctx.reply('❌ An error occurred. Please try again later.');
  }
}

// Rate limit middleware
export async function rateLimitMiddleware(ctx, next) {
  try {
    const telegramId = ctx.from?.id;
    if (!telegramId) return next();

    const result = await UserService.checkRateLimit(telegramId);
    
    if (!result.allowed) {
      return ctx.reply('⏳ Too many requests. Please wait a moment.');
    }

    return next();
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    return next();
  }
}

// Admin middleware - check if user is admin
export async function adminMiddleware(ctx, next) {
  try {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      return ctx.reply('❌ Unable to identify user.');
    }

    if (!UserService.isAdmin(telegramId)) {
      return ctx.reply('🚫 Access denied. Admin only.');
    }

    return next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return ctx.reply('❌ An error occurred.');
  }
}

// Active user middleware - ensure user is approved
export async function activeUserMiddleware(ctx, next) {
  try {
    const telegramId = ctx.from?.id;
    if (!telegramId) return next();

    // Skip for admin
    if (UserService.isAdmin(telegramId)) {
      return next();
    }

    // Check if user is active
    const isActive = await UserService.isActiveUser(telegramId);
    
    if (!isActive) {
      return ctx.reply(
        '⏳ Your account is pending approval. Please wait for admin approval.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Refresh Status', callback_data: 'refresh_status' }],
            ],
          },
        }
      );
    }

    return next();
  } catch (error) {
    console.error('Active user middleware error:', error);
    return ctx.reply('❌ An error occurred.');
  }
}

// Session middleware - manage user sessions
export function sessionMiddleware(ctx, next) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return next();

  // Get or create session
  if (!sessions.has(telegramId)) {
    sessions.set(telegramId, {
      state: null,
      data: {},
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    });
  }

  const session = sessions.get(telegramId);
  
  // Check expiration
  if (session.expiresAt < Date.now()) {
    sessions.set(telegramId, {
      state: null,
      data: {},
      expiresAt: Date.now() + 30 * 60 * 1000,
    });
  }

  ctx.session = sessions.get(telegramId);
  
  // Update expiration
  ctx.session.expiresAt = Date.now() + 30 * 60 * 1000;
  
  return next();
}

// Set session state
export function setSessionState(ctx, state, data = {}) {
  if (ctx.session) {
    ctx.session.state = state;
    ctx.session.data = { ...ctx.session.data, ...data };
  }
}

// Clear session
export function clearSession(ctx) {
  const telegramId = ctx.from?.id;
  if (telegramId && sessions.has(telegramId)) {
    sessions.set(telegramId, {
      state: null,
      data: {},
      expiresAt: Date.now() + 30 * 60 * 1000,
    });
  }
}

// Get session
export function getSession(telegramId) {
  return sessions.get(telegramId);
}

// Clean up expired sessions (run periodically)
function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(id);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupSessions, 5 * 60 * 1000);
