/**
 * src/index.js
 * Main entry point for AntiWifi.
 * Starts the Express dashboard server and the scheduler.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const logger = require('./logger');
const scheduler = require('./scheduler');
const accountManager = require('./accountManager');
const dashboardAPI = require('../dashboard/server');

// ── Load config ──────────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, '..', 'accounts.json');
if (!fs.existsSync(CONFIG_FILE)) {
  console.error('❌ accounts.json not found. Please create it with your accounts config.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
const state = accountManager.loadState(config.accounts);

// ── Initialize Express app ───────────────────────────────────────────
const app = express();
app.use(express.json());

// Serve static dashboard files
app.use(express.static(path.join(__dirname, '..', 'dashboard')));

// Initialize API routes
dashboardAPI.init(state, config, scheduler);
app.use('/', dashboardAPI.router);

// Fallback: serve dashboard for any unknown route
app.get('*all', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dashboard', 'index.html'));
});

// ── Start server ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('  ⚡ AntiWifi — Auto PPPoE Rotation System');
  logger.info(`  🌐 Dashboard: http://localhost:${PORT}`);
  logger.info(`  📡 Portal:    http://10.220.20.12`);
  logger.info(`  📡 Router:    ${config.router.url}`);
  logger.info(`  ⏱  Interval:  every ${config.check_interval_minutes} minutes`);
  logger.info(`  🔔 Threshold: ${config.threshold_hours} hours`);
  logger.info(`  👥 Accounts:  ${config.accounts.length} configured`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Start the scheduler
  scheduler.start(config, state);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('[AntiWifi] Shutting down gracefully...');
  process.exit(0);
});
