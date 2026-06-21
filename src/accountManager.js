/**
 * accountManager.js
 * Manages account state, rotation logic, and usage history.
 * Persists state to state.json so it survives restarts.
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const STATE_FILE = path.join(__dirname, '..', 'state.json');

/**
 * Load state from disk, or create fresh state
 */
function loadState(accounts) {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    } catch {
      logger.warn('[State] Could not read state.json, creating fresh state');
    }
  }

  // Initialize fresh state
  const fresh = {
    activeAccountId: accounts[0]?.id || 1,
    lastChecked: null,
    lastSwitched: null,
    rotationHistory: [],
    usageCache: {},
  };
  saveState(fresh);
  return fresh;
}

/**
 * Save state to disk
 */
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Update usage cache for an account
 */
function updateUsageCache(state, usageData) {
  state.usageCache[usageData.username] = {
    ...usageData,
    cachedAt: new Date().toISOString(),
  };
  state.lastChecked = new Date().toISOString();
  saveState(state);
}

/**
 * Determine if the current active account needs rotation
 * @param {Object} state - current state
 * @param {Object} usageData - current account's usage data
 * @param {number} threshold - hours threshold (e.g., 190)
 * @returns {boolean}
 */
function needsRotation(state, usageData, threshold) {
  if (!usageData) return false;

  const hours = usageData.totalUseHours;
  if (hours >= threshold) {
    logger.warn(`[AccountManager] ⚠️  ${usageData.owner} at ${hours.toFixed(1)}h — THRESHOLD REACHED (${threshold}h)`);
    return true;
  }

  logger.info(`[AccountManager] ${usageData.owner}: ${hours.toFixed(1)}h / ${threshold}h threshold — OK`);
  return false;
}

/**
 * Get the next active account (round-robin, skip if also near limit)
 * @param {Object} state
 * @param {Array} accounts - all accounts config
 * @param {number} threshold
 * @returns {Object|null} next account or null if all exhausted
 */
function getNextAccount(state, accounts, threshold) {
  const currentId = state.activeAccountId;
  const total = accounts.length;

  // Try each account in order after the current one
  for (let i = 1; i <= total; i++) {
    const nextAccount = accounts[(accounts.findIndex(a => a.id === currentId) + i) % total];
    const cached = state.usageCache[nextAccount.username];

    // If we don't have data yet, try it
    if (!cached) {
      logger.info(`[AccountManager] Selected next account: ${nextAccount.owner} (no cached data)`);
      return nextAccount;
    }

    // Skip if this account is also near/over the threshold
    if (cached.totalUseHours < threshold) {
      logger.info(`[AccountManager] Selected next account: ${nextAccount.owner} (${cached.totalUseHours.toFixed(1)}h used)`);
      return nextAccount;
    }

    logger.warn(`[AccountManager] Skipping ${nextAccount.owner} — also near limit (${cached.totalUseHours.toFixed(1)}h)`);
  }

  logger.error('[AccountManager] ❌ ALL accounts are near their limit!');
  return null;
}

/**
 * Record a rotation event in history
 */
function recordRotation(state, fromAccount, toAccount, reason) {
  const event = {
    timestamp: new Date().toISOString(),
    from: fromAccount?.username || 'unknown',
    fromOwner: fromAccount?.owner || 'unknown',
    to: toAccount.username,
    toOwner: toAccount.owner,
    reason,
  };

  state.rotationHistory.unshift(event); // newest first
  if (state.rotationHistory.length > 50) {
    state.rotationHistory = state.rotationHistory.slice(0, 50);
  }

  state.activeAccountId = toAccount.id;
  state.lastSwitched = event.timestamp;
  saveState(state);

  logger.info(`[AccountManager] 🔄 Rotated: ${event.fromOwner} → ${event.toOwner} (${reason})`);
  return event;
}

/**
 * Get the current active account config
 */
function getActiveAccount(state, accounts) {
  return accounts.find(a => a.id === state.activeAccountId) || accounts[0];
}

/**
 * Manually set an account as active
 */
function setActiveAccount(state, accountId) {
  state.activeAccountId = accountId;
  saveState(state);
}

module.exports = {
  loadState,
  saveState,
  updateUsageCache,
  needsRotation,
  getNextAccount,
  recordRotation,
  getActiveAccount,
  setActiveAccount,
};
