/**
 * dashboard/server.js
 * Express API server for the AntiWifi dashboard.
 * Includes account CRUD and manual activation endpoints.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const logger = require('../src/logger');

const router = express.Router();

let appState = null;
let appConfig = null;
let scheduler = null;
const CONFIG_FILE = path.join(__dirname, '..', 'accounts.json');

function init(state, config, schedulerModule) {
  appState = state;
  appConfig = config;
  scheduler = schedulerModule;
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(appConfig, null, 2), 'utf-8');
}

// ── GET /api/status ─────────────────────────────────────────────────
router.get('/api/status', (req, res) => {
  try {
    const activeAccount = appConfig.accounts.find(a => a.id === appState.activeAccountId) || null;
    const accounts = appConfig.accounts.map(account => {
      const cached = appState.usageCache[account.username] || null;
      return {
        id: account.id,
        owner: account.owner,
        username: account.username,
        isActive: account.id === appState.activeAccountId,
        usage: cached,
      };
    });

    res.json({
      ok: true,
      hasAccounts: appConfig.accounts.length > 0,
      activeAccount: activeAccount ? {
        id: activeAccount.id,
        owner: activeAccount.owner,
        username: activeAccount.username,
      } : null,
      threshold_hours: appConfig.threshold_hours,
      check_interval_minutes: appConfig.check_interval_minutes,
      router: { url: appConfig.router.url },
      lastChecked: appState.lastChecked,
      lastSwitched: appState.lastSwitched,
      accounts,
      rotationHistory: appState.rotationHistory.slice(0, 20),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/logs ────────────────────────────────────────────────────
router.get('/api/logs', (req, res) => {
  const logFile = path.join(__dirname, '..', 'logs', 'antiwifi.log');
  if (!fs.existsSync(logFile)) return res.json({ ok: true, logs: [] });
  try {
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.trim().split('\n').slice(-100).reverse();
    const logs = lines.map(line => {
      try { return JSON.parse(line); } catch { return { message: line }; }
    });
    res.json({ ok: true, logs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/accounts ───────────────────────────────────────────────
// Add a new account
router.post('/api/accounts', (req, res) => {
  const { owner, username, password } = req.body;
  if (!owner || !username || !password) {
    return res.status(400).json({ ok: false, error: 'owner, username, and password are required' });
  }

  const exists = appConfig.accounts.find(a => a.username === username);
  if (exists) {
    return res.status(400).json({ ok: false, error: `Account "${username}" already exists` });
  }

  const newId = appConfig.accounts.length > 0
    ? Math.max(...appConfig.accounts.map(a => a.id)) + 1
    : 1;

  const newAccount = { id: newId, owner: owner.trim(), username: username.trim(), password: password.trim() };
  appConfig.accounts.push(newAccount);
  saveConfig();

  logger.info(`[API] Account added: ${owner} (${username})`);
  res.json({ ok: true, account: { id: newId, owner: newAccount.owner, username: newAccount.username } });
});

// ── DELETE /api/accounts/:id ─────────────────────────────────────────
// Remove an account
router.delete('/api/accounts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = appConfig.accounts.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Account not found' });

  const removed = appConfig.accounts.splice(idx, 1)[0];
  delete appState.usageCache[removed.username];

  // If active account is deleted, pick a new one
  if (appState.activeAccountId === id && appConfig.accounts.length > 0) {
    appState.activeAccountId = appConfig.accounts[0].id;
  } else if (appConfig.accounts.length === 0) {
    appState.activeAccountId = null;
  }

  saveConfig();
  const accountManager = require('../src/accountManager');
  accountManager.saveState(appState);

  logger.info(`[API] Account removed: ${removed.owner} (${removed.username})`);
  res.json({ ok: true, message: `Account "${removed.owner}" removed` });
});

// ── POST /api/activate ───────────────────────────────────────────────
// Manually activate an account: push credentials to router
router.post('/api/activate', async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ ok: false, error: 'accountId required' });

  const targetAccount = appConfig.accounts.find(a => a.id === parseInt(accountId));
  if (!targetAccount) return res.status(404).json({ ok: false, error: 'Account not found' });

  const { updatePPPoECredentials } = require('../src/router');
  const accountManager = require('../src/accountManager');

  logger.info(`[API] Activating account: ${targetAccount.owner} (${targetAccount.username})`);

  try {
    const result = await updatePPPoECredentials(appConfig.router, targetAccount.username, targetAccount.password);

    if (result.success) {
      const currentAccount = appConfig.accounts.find(a => a.id === appState.activeAccountId);
      accountManager.recordRotation(appState, currentAccount, targetAccount, 'Manual activation via dashboard');
      logger.info(`[API] ✅ Activated: ${targetAccount.owner}`);
      return res.json({ ok: true, success: true, message: `${targetAccount.owner} is now the active connection` });
    }

    logger.error(`[API] Activation failed:`, result.error);
    res.json({ ok: true, success: false, error: result.error || 'Router update failed' });
  } catch (err) {
    logger.error(`[API] Activation error: ${err.message}`);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/check ──────────────────────────────────────────────────
router.post('/api/check', async (req, res) => {
  try {
    logger.info('[API] Manual check triggered');
    scheduler.manualCheck(req.body?.refreshAll || false)
      .catch(err => logger.error('[API] Manual check error:', err.message));
    res.json({ ok: true, message: 'Check triggered' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/logout ─────────────────────────────────────────────────
// Clears all accounts, sending the UI back to the onboarding screen.
router.post('/api/logout', (req, res) => {
  try {
    appConfig.accounts = [];
    appState.activeAccountId = null;
    appState.usageCache = {};
    appState.rotationHistory = [];
    saveConfig();
    const accountManager = require('../src/accountManager');
    accountManager.saveState(appState);
    logger.info('[API] Logged out — all accounts cleared');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PUT /api/config ──────────────────────────────────────────────────────
// Note: Archer C64 only uses a local password — no username.
router.put('/api/config', (req, res) => {
  try {
    const { threshold_hours, check_interval_minutes, router_password } = req.body;
    if (threshold_hours) appConfig.threshold_hours = parseInt(threshold_hours);
    if (check_interval_minutes) appConfig.check_interval_minutes = parseInt(check_interval_minutes);
    if (router_password) appConfig.router.password = router_password;
    saveConfig();
    logger.info(`[API] Config updated`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = { router, init };
