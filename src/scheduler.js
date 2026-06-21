/**
 * scheduler.js
 * Orchestrates the full check-and-rotate cycle.
 * Runs every N minutes via node-cron.
 */

const cron = require('node-cron');
const { scrapeUsage, scrapeAllAccounts } = require('./scraper');
const { updatePPPoECredentials } = require('./router');
const accountManager = require('./accountManager');
const logger = require('./logger');

let config = null;
let state = null;
let isRunning = false;

/**
 * The core check cycle:
 * 1. Scrape active account's usage
 * 2. If near limit → find next account → update router
 * 3. Optionally scrape all accounts for dashboard info
 */
async function runCheckCycle(forceRefreshAll = false) {
  if (isRunning) {
    logger.warn('[Scheduler] Previous cycle still running, skipping...');
    return;
  }

  isRunning = true;
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('[Scheduler] 🔍 Starting check cycle...');

  try {
    if (!config.accounts || config.accounts.length === 0) {
      logger.info('[Scheduler] No accounts configured yet. Skipping check cycle.');
      return;
    }

    const activeAccount = accountManager.getActiveAccount(state, config.accounts);
    if (!activeAccount) {
      logger.info('[Scheduler] No active account found. Skipping check.');
      return;
    }
    logger.info(`[Scheduler] Active account: ${activeAccount.owner} (${activeAccount.username})`);

    // Scrape the active account's usage
    const usageData = await scrapeUsage(activeAccount);

    if (usageData) {
      accountManager.updateUsageCache(state, usageData);

      // Check if we need to rotate
      if (accountManager.needsRotation(state, usageData, config.threshold_hours)) {
        logger.info('[Scheduler] 🔄 Rotation needed! Finding next account...');

        const nextAccount = accountManager.getNextAccount(state, config.accounts, config.threshold_hours);

        if (nextAccount) {
          logger.info(`[Scheduler] Switching to: ${nextAccount.owner}`);
          const result = await updatePPPoECredentials(config.router, nextAccount.username, nextAccount.password);

          if (result.success) {
            accountManager.recordRotation(
              state,
              activeAccount,
              nextAccount,
              `Usage at ${usageData.totalUseHours.toFixed(1)}h (threshold: ${config.threshold_hours}h)`
            );
            logger.info(`[Scheduler] ✅ Successfully rotated to ${nextAccount.owner}`);
          } else {
            logger.error(`[Scheduler] ❌ Router update failed:`, result.error);
          }
        } else {
          logger.error('[Scheduler] ❌ No available accounts to switch to!');
        }
      }
    }

    // Refresh all accounts' usage data if requested or periodically
    if (forceRefreshAll) {
      logger.info('[Scheduler] 🔄 Refreshing all accounts usage...');
      const allUsage = await scrapeAllAccounts(config.accounts);
      for (const usage of allUsage) {
        accountManager.updateUsageCache(state, usage);
      }
    }

  } catch (err) {
    logger.error(`[Scheduler] Cycle error: ${err.message}`, { stack: err.stack });
  } finally {
    isRunning = false;
    logger.info('[Scheduler] ✅ Check cycle complete');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

/**
 * Initialize and start the scheduler
 */
function start(appConfig, appState) {
  config = appConfig;
  state = appState;

  const intervalMins = config.check_interval_minutes || 30;
  logger.info(`[Scheduler] Starting — checking every ${intervalMins} minutes`);
  logger.info(`[Scheduler] Rotation threshold: ${config.threshold_hours} hours`);

  // Run immediately on startup
  runCheckCycle(true);

  // Schedule full all-account refresh every 3 hours
  cron.schedule('0 */3 * * *', () => {
    runCheckCycle(true);
  });

  // Schedule active account check at configured interval
  const cronExpression = `*/${intervalMins} * * * *`;
  cron.schedule(cronExpression, () => {
    runCheckCycle(false);
  });

  logger.info(`[Scheduler] Cron jobs started`);
}

/**
 * Manually trigger a check cycle (called from dashboard)
 */
async function manualCheck(refreshAll = false) {
  if (!config || !state) throw new Error('Scheduler not initialized');
  await runCheckCycle(refreshAll);
}

/**
 * Manually switch to a specific account (called from dashboard)
 */
async function manualSwitch(accountId) {
  if (!config || !state) throw new Error('Scheduler not initialized');

  const targetAccount = config.accounts.find(a => a.id === accountId);
  if (!targetAccount) throw new Error(`Account ${accountId} not found`);

  const currentAccount = accountManager.getActiveAccount(state, config.accounts);

  logger.info(`[Scheduler] Manual switch requested: ${currentAccount.owner} → ${targetAccount.owner}`);

  const result = await updatePPPoECredentials(config.router, targetAccount.username, targetAccount.password);

  if (result.success) {
    accountManager.recordRotation(state, currentAccount, targetAccount, 'Manual switch via dashboard');
    return { success: true, message: `Switched to ${targetAccount.owner}` };
  }

  return { success: false, error: result.error };
}

module.exports = { start, manualCheck, manualSwitch };
