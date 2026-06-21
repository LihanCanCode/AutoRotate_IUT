/**
 * router.js
 * Controls the TP-Link Archer C64 router at 192.168.0.1
 * Uses Puppeteer headless browser automation to:
 *   1. Log in with the local admin password
 *   2. Navigate to the Internet (networkBasic) page
 *   3. Update the PPPoE Username and Password fields
 *   4. Click Save
 */

const puppeteer = require('puppeteer');
const logger = require('./logger');

const ROUTER_BASE_URL = 'http://192.168.0.1';
const LOGIN_URL = `${ROUTER_BASE_URL}/`;
const NETWORK_URL = `${ROUTER_BASE_URL}/#networkBasic`;

/**
 * Launch a headless browser, log into the router, and update PPPoE credentials.
 *
 * @param {object} routerConfig  - { url, password }
 * @param {string} newUsername   - New PPPoE username
 * @param {string} newPassword   - New PPPoE password
 * @returns {{ success: boolean, error?: string }}
 */
async function updatePPPoECredentials(routerConfig, newUsername, newPassword) {
  const routerUrl = routerConfig.url || ROUTER_BASE_URL;
  const adminPassword = routerConfig.password;

  logger.info(`[Router] Launching browser to update PPPoE → ${newUsername}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
      ],
      timeout: 30000,
    });

    const page = await browser.newPage();

    // Suppress console noise from the router's JS
    page.on('console', () => {});
    page.on('pageerror', () => {});

    // ── Step 1: Navigate to router login page ───────────────────────────
    logger.info('[Router] Opening login page...');
    await page.goto(`${routerUrl}/`, {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });

    // ── Step 2: Enter local admin password ──────────────────────────────
    logger.info('[Router] Entering admin password...');

    // Wait for the password input to appear
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    // Clear and type the password
    await page.click('input[type="password"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.type('input[type="password"]', adminPassword, { delay: 30 });

    // Click the Login button
    const loginBtn = await page.$('button[id*="login"], button[id*="Login"], .login-btn, #pc-login-btn, button[type="button"]');
    if (loginBtn) {
      await loginBtn.click();
    } else {
      // Fallback: press Enter
      await page.keyboard.press('Enter');
    }

    // Wait for successful login (router redirects to main page after login)
    logger.info('[Router] Waiting for login to complete...');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});

    // Give the SPA time to fully render
    await new Promise(r => setTimeout(r, 2000));

    // Check if still on login page (wrong password)
    const url = page.url();
    const pageContent = await page.content();
    if (pageContent.includes('Local Password') && pageContent.includes('This field is required')) {
      throw new Error('Login failed — wrong router admin password');
    }

    logger.info('[Router] Logged in. Navigating to Internet settings...');

    // ── Step 3: Navigate to Network Basic (Internet/PPPoE page) ─────────
    await page.goto(`${routerUrl}/#networkBasic`, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    });

    // Extra wait for the SPA to render the Internet section
    await new Promise(r => setTimeout(r, 2500));

    // ── Step 4: Find and fill the Username field ─────────────────────────
    logger.info('[Router] Looking for PPPoE Username field...');

    // Locate the input inside the container mapped to wanPPPOEModel.username
    const usernameInput = await page.waitForSelector('div[data-bind*="wanPPPOEModel.username"] input', { timeout: 10000 });

    if (!usernameInput) {
      throw new Error('Could not find PPPoE Username input field.');
    }

    // Clear the username field completely
    await usernameInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    // Direct DOM fallback to ensure the value is empty and events are triggered
    await page.evaluate(el => {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, usernameInput);
    
    // Type the new username
    await usernameInput.type(newUsername, { delay: 30 });
    logger.info(`[Router] Entered username: ${newUsername}`);

    // ── Step 5: Find and fill the Password field ─────────────────────────
    logger.info('[Router] Looking for PPPoE Password field...');

    // Locate the password input inside the container mapped to wanPPPOEModel.password
    const passwordInput = await page.waitForSelector('div[data-bind*="wanPPPOEModel.password"] input[type="password"]', { timeout: 10000 });

    if (!passwordInput) {
      throw new Error('Could not find PPPoE Password input field.');
    }

    // Clear the password field completely
    await passwordInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    // Direct DOM fallback to ensure the value is empty and events are triggered
    await page.evaluate(el => {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, passwordInput);

    // Type the new password
    await passwordInput.type(newPassword, { delay: 30 });
    logger.info('[Router] Entered PPPoE password.');

    // ── Step 6: Click Save ───────────────────────────────────────────────
    logger.info('[Router] Clicking Save...');

    // The save button has the id "save-data" with an inner anchor element of class "button-button"
    const saveBtn = await page.waitForSelector('#save-data a.button-button, #save-data .button-button', { timeout: 10000 });

    if (!saveBtn) {
      throw new Error('Could not find Save button on the Internet settings page.');
    }

    await saveBtn.click();
    logger.info('[Router] Save clicked. Waiting for router to apply...');

    // Wait for the router to process and reconnect
    await new Promise(r => setTimeout(r, 3000));

    logger.info(`[Router] ✅ PPPoE credentials updated → ${newUsername}`);
    return { success: true };

  } catch (err) {
    logger.error(`[Router] Puppeteer automation failed: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Quick connectivity check — just tries to fetch the router login page.
 */
async function testRouterConnection(routerConfig) {
  const routerUrl = routerConfig.url || ROUTER_BASE_URL;
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 10000,
    });
    const page = await browser.newPage();
    const resp = await page.goto(`${routerUrl}/`, { timeout: 8000 });
    const ok = resp && resp.status() < 500;
    logger.info(`[Router] Connection test: ${ok ? 'reachable' : 'unreachable'}`);
    return ok;
  } catch (err) {
    logger.error(`[Router] Connection test failed: ${err.message}`);
    return false;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = {
  updatePPPoECredentials,
  testRouterConnection,
};
