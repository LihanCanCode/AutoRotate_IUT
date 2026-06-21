/**
 * scraper.js
 * Logs into the university portal (10.220.20.12) and scrapes usage data.
 * Handles Laravel CSRF tokens and session cookies automatically.
 */

const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const cheerio = require('cheerio');
const logger = require('./logger');

const PORTAL_BASE = 'http://10.220.20.12';

/**
 * Parse a time string like "182 hrs 54 mins 12 secs" into total hours (float).
 */
function parseHours(timeStr) {
  if (!timeStr) return 0;
  const hrsMatch = timeStr.match(/(\d+)\s*hrs?/i);
  const minsMatch = timeStr.match(/(\d+)\s*mins?/i);
  const secsMatch = timeStr.match(/(\d+)\s*secs?/i);

  const hrs = hrsMatch ? parseInt(hrsMatch[1]) : 0;
  const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
  const secs = secsMatch ? parseInt(secsMatch[1]) : 0;

  return hrs + mins / 60 + secs / 3600;
}

/**
 * Scrape usage data for one account from the university portal.
 * @param {Object} account - { username, password, owner }
 * @returns {Object} usage data or null on failure
 */
async function scrapeUsage(account) {
  const jar = new CookieJar();
  const client = wrapper(axios.create({
    jar,
    withCredentials: true,
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  }));

  try {
    // Step 1: GET the login page to extract CSRF token
    logger.info(`[Scraper] Fetching login page for: ${account.username}`);
    const loginPage = await client.get(`${PORTAL_BASE}/`);
    const $login = cheerio.load(loginPage.data);
    const csrfToken = $login('input[name="_token"]').val();

    if (!csrfToken) {
      logger.error(`[Scraper] CSRF token not found for ${account.username}`);
      return null;
    }

    // Step 2: POST login credentials
    logger.info(`[Scraper] Logging in as: ${account.username}`);
    const loginResponse = await client.post(
      `${PORTAL_BASE}/login`,
      new URLSearchParams({
        _token: csrfToken,
        username: account.username,
        password: account.password,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 5,
      }
    );

    // Step 3: GET the dashboard
    const dashResponse = await client.get(`${PORTAL_BASE}/dashboard`);
    const $ = cheerio.load(dashResponse.data);

    // Step 4: Extract usage data using confirmed selectors
    const rows = $('table.invoicefor tr');
    const getData = (n) => $(rows[n]).find('td:nth-child(2)').text().trim();

    const freeLimitStr = getData(4);   // row 5 (0-indexed: 4)
    const totalUseStr  = getData(5);   // row 6 (0-indexed: 5)
    const extraUseStr  = getData(6);   // row 7
    const billStr      = getData(7);   // row 8
    const statusStr    = getData(8);   // row 9

    const totalUseHours = parseHours(totalUseStr);
    const freeLimitHours = parseHours(freeLimitStr) || 200;

    const usageData = {
      username: account.username,
      owner: account.owner,
      freeLimit: freeLimitStr || '200 hrs',
      freeLimitHours,
      totalUse: totalUseStr || '0 hrs',
      totalUseHours,
      extraUse: extraUseStr || '0 secs',
      estimatedBill: billStr || '0 Taka',
      status: statusStr || 'Unknown',
      usagePercent: Math.min(100, (totalUseHours / freeLimitHours) * 100).toFixed(1),
      remainingHours: Math.max(0, freeLimitHours - totalUseHours).toFixed(1),
      scrapedAt: new Date().toISOString(),
    };

    logger.info(`[Scraper] ${account.owner}: ${totalUseHours.toFixed(1)}h / ${freeLimitHours}h (${usageData.usagePercent}%)`);

    // Step 5: Logout to free the session
    await client.get(`${PORTAL_BASE}/logout`).catch(() => {});

    return usageData;
  } catch (err) {
    logger.error(`[Scraper] Failed for ${account.username}: ${err.message}`);
    return null;
  }
}

/**
 * Scrape usage for all accounts.
 * @param {Array} accounts - list of account objects
 * @returns {Array} array of usage data objects
 */
async function scrapeAllAccounts(accounts) {
  const results = [];
  for (const account of accounts) {
    const data = await scrapeUsage(account);
    if (data) results.push(data);
    // Small delay between requests to be respectful to the server
    await new Promise(r => setTimeout(r, 1500));
  }
  return results;
}

module.exports = { scrapeUsage, scrapeAllAccounts, parseHours };
