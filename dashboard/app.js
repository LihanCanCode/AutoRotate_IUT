/**
 * dashboard/app.js
 * Client-side script for the AntiWifi Dashboard.
 * Handles onboarding flow, adding/removing accounts, manual activation, and live logs.
 */

// ── DOM Elements ──────────────────────────────────────────────────────
const onboardingOverlay = document.getElementById('onboardingOverlay');
const mainApp = document.getElementById('mainApp');
const systemStatus = document.getElementById('systemStatus');
const statusText = document.getElementById('statusText');
const lastChecked = document.getElementById('lastChecked');
const activeOwner = document.getElementById('activeOwner');
const activeUsername = document.getElementById('activeUsername');
const activeHours = document.getElementById('activeHours');
const activeRemaining = document.getElementById('activeRemaining');
const activePercent = document.getElementById('activePercent');
const activeThreshold = document.getElementById('activeThreshold');
const activeProgressBar = document.getElementById('activeProgressBar');
const accountsGrid = document.getElementById('accountsGrid');
const accountCount = document.getElementById('accountCount');

// Config Elements
const cfgThreshold = document.getElementById('cfgThreshold');
const cfgInterval = document.getElementById('cfgInterval');
const btnSaveConfig = document.getElementById('btnSaveConfig');

// Action Buttons
const btnRefreshAll = document.getElementById('btnRefreshAll');
const btnCheckNow = document.getElementById('btnCheckNow');
const btnRefreshAllFull = document.getElementById('btnRefreshAllFull');
const btnAddAccountHeader = document.getElementById('btnAddAccountHeader');

// Panels
const historyList = document.getElementById('historyList');
const logsContainer = document.getElementById('logsContainer');

// ── Onboarding Elements ───────────────────────────────────────────────
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const dot1 = document.getElementById('dot1');
const dot2 = document.getElementById('dot2');
const dot3 = document.getElementById('dot3');

const btnStartSetup = document.getElementById('btnStartSetup');
const btnBackToStep1 = document.getElementById('btnBackToStep1');
const btnToStep3 = document.getElementById('btnToStep3');
const btnBackToStep2 = document.getElementById('btnBackToStep2');
const btnFinishSetup = document.getElementById('btnFinishSetup');

const routerUrl = document.getElementById('routerUrl');
const routerUser = document.getElementById('routerUser');
const routerPass = document.getElementById('routerPass');

const newOwner = document.getElementById('newOwner');
const newUsername = document.getElementById('newUsername');
const newPassword = document.getElementById('newPassword');
const btnAddOnboardAccount = document.getElementById('btnAddOnboardAccount');
const onboardAccountsList = document.getElementById('onboardAccountsList');

// ── Modals ────────────────────────────────────────────────────────────
// Add Account Modal
const addAccountModal = document.getElementById('addAccountModal');
const modalOwner = document.getElementById('modalOwner');
const modalUsername = document.getElementById('modalUsername');
const modalPassword = document.getElementById('modalPassword');
const btnCancelAddAccount = document.getElementById('btnCancelAddAccount');
const btnConfirmAddAccount = document.getElementById('btnConfirmAddAccount');
const modalError = document.getElementById('modalError');

// Activate Progress Modal
const activateModal = document.getElementById('activateModal');
const activateTitle = document.getElementById('activateTitle');
const activateBody = document.getElementById('activateBody');
const activateProgress = document.getElementById('activateProgress');
const activateProgressBar = document.getElementById('activateProgressBar');
const btnCloseActivate = document.getElementById('btnCloseActivate');

// State Variables
let currentStatus = null;
let isScanning = false;
let onboardingAccounts = [];

// ── Onboarding Navigation ─────────────────────────────────────────────

btnStartSetup.addEventListener('click', () => {
  step1.classList.add('hidden');
  step2.classList.remove('hidden');
  dot1.classList.add('done');
  dot1.classList.remove('active');
  dot2.classList.add('active');
});

btnBackToStep1.addEventListener('click', () => {
  step2.classList.add('hidden');
  step1.classList.remove('hidden');
  dot1.classList.add('active');
  dot1.classList.remove('done');
  dot2.classList.remove('active');
});

btnToStep3.addEventListener('click', async () => {
  // Save router config first
  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        router_password: routerPass.value,
      })
    });
    if (res.ok) {
      step2.classList.add('hidden');
      step3.classList.remove('hidden');
      dot2.classList.add('done');
      dot2.classList.remove('active');
      dot3.classList.add('active');
    } else {
      alert('Failed to save router config');
    }
  } catch (err) {
    alert('Failed to save router config');
  }
});

btnBackToStep2.addEventListener('click', () => {
  step3.classList.add('hidden');
  step2.classList.remove('hidden');
  dot2.classList.add('active');
  dot2.classList.remove('done');
  dot3.classList.remove('active');
});

// Add account in onboarding
btnAddOnboardAccount.addEventListener('click', async () => {
  const owner = newOwner.value.trim();
  const username = newUsername.value.trim();
  const password = newPassword.value.trim();

  if (!owner || !username || !password) {
    alert('Please fill out all fields');
    return;
  }

  try {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, username, password })
    });
    const data = await res.json();
    if (data.ok) {
      onboardingAccounts.push(data.account);
      renderOnboardAccounts();
      newOwner.value = '';
      newUsername.value = '';
      newPassword.value = '';
      btnFinishSetup.removeAttribute('disabled');
    } else {
      alert(data.error || 'Failed to add account');
    }
  } catch (err) {
    alert('Server communication error');
  }
});

function renderOnboardAccounts() {
  onboardAccountsList.innerHTML = '';
  if (onboardingAccounts.length === 0) {
    onboardAccountsList.innerHTML = '<div class="empty-state-sm">No accounts added yet</div>';
    return;
  }

  onboardingAccounts.forEach(acc => {
    const div = document.createElement('div');
    div.className = 'added-account-item';
    div.innerHTML = `
      <div>
        <span class="added-account-name">${acc.owner}</span>
        <span class="added-account-user">(@${acc.username})</span>
      </div>
      <button class="btn-danger-sm" onclick="deleteAccountOnboard(${acc.id})">Delete</button>
    `;
    onboardAccountsList.appendChild(div);
  });
}

// Global scope delete handler for onboarding
window.deleteAccountOnboard = async (id) => {
  try {
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      onboardingAccounts = onboardingAccounts.filter(a => a.id !== id);
      renderOnboardAccounts();
      if (onboardingAccounts.length === 0) {
        btnFinishSetup.setAttribute('disabled', 'true');
      }
    }
  } catch (err) {
    console.error(err);
  }
};

btnFinishSetup.addEventListener('click', () => {
  onboardingOverlay.classList.add('hidden');
  mainApp.classList.remove('hidden');
  fetchStatus();
  fetchLogs();
});

// ── App Status Rendering ──────────────────────────────────────────────

async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.ok) {
      currentStatus = data;
      if (!data.hasAccounts) {
        onboardingOverlay.classList.remove('hidden');
        mainApp.classList.add('hidden');
      } else {
        onboardingOverlay.classList.add('hidden');
        mainApp.classList.remove('hidden');
        renderStatus(data);
      }
    }
  } catch (err) {
    console.error('Status fetch error:', err);
    statusText.textContent = 'Connection Error';
    systemStatus.className = 'status-pill badge-danger';
  }
}

async function fetchLogs() {
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    if (data.ok) {
      renderLogs(data.logs);
    }
  } catch (err) {
    console.error(err);
  }
}

function formatTime(isoString) {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function renderStatus(data) {
  statusText.textContent = 'System Active';
  systemStatus.className = 'status-pill';
  lastChecked.textContent = `Last Checked: ${formatTime(data.lastChecked)}`;

  cfgThreshold.value = data.threshold_hours;
  cfgInterval.value = data.check_interval_minutes;
  activeThreshold.textContent = `${data.threshold_hours}h`;

  // Render Active Account Banner
  const active = data.accounts.find(a => a.isActive);
  if (active) {
    activeOwner.textContent = active.owner;
    activeUsername.textContent = `@${active.username}`;

    if (active.usage) {
      const usage = active.usage;
      activeHours.textContent = `${parseFloat(usage.totalUseHours).toFixed(1)}h`;
      activeRemaining.textContent = `${parseFloat(usage.remainingHours).toFixed(1)}h`;
      activePercent.textContent = `${usage.usagePercent}%`;
      activeProgressBar.style.width = `${usage.usagePercent}%`;

      // Set banner progress color
      activeProgressBar.style.background = '';
      if (usage.totalUseHours >= data.threshold_hours) {
        activeProgressBar.style.background = 'var(--danger)';
      } else if (usage.totalUseHours >= data.threshold_hours - 20) {
        activeProgressBar.style.background = 'var(--warning)';
      } else {
        activeProgressBar.style.background = 'var(--success)';
      }
    } else {
      resetActiveBanner('Usage stats loading...');
    }
  } else {
    resetActiveBanner('No Active Connection Detected');
  }

  // Render Grid
  accountCount.textContent = `${data.accounts.length} accounts`;
  accountsGrid.innerHTML = '';

  data.accounts.forEach(account => {
    const card = document.createElement('div');
    card.className = `account-card ${account.isActive ? 'active' : ''}`;

    const usage = account.usage;
    let badgeClass = 'badge-ok';
    let badgeText = 'Standby';
    let usageHtml = '';

    if (account.isActive) {
      badgeClass = 'badge-active';
      badgeText = 'Active';
    }

    if (usage) {
      const percent = parseFloat(usage.usagePercent);
      let barClass = 'progress-green';

      if (percent >= 95) {
        if (!account.isActive) badgeClass = 'badge-danger';
        badgeText = account.isActive ? 'Active (Full)' : 'Exhausted';
        barClass = 'progress-red';
      } else if (percent >= (data.threshold_hours / 2)) {
        if (!account.isActive) badgeClass = 'badge-warning';
        badgeText = account.isActive ? 'Active (High)' : 'High Usage';
        barClass = 'progress-yellow';
      }

      usageHtml = `
        <div class="card-usage-nums">
          <span class="card-usage-main">${parseFloat(usage.totalUseHours).toFixed(1)}h</span>
          <span class="card-usage-total">of ${usage.freeLimit}</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar ${barClass}" style="width: ${percent}%"></div>
        </div>
        <div class="card-meta" style="margin-top:12px">
          <span>Bill: ${usage.estimatedBill}</span>
          <span>Status: ${usage.status}</span>
        </div>
      `;
    } else {
      badgeClass = 'badge-unknown';
      badgeText = 'No data';
      usageHtml = `
        <div class="no-usage-msg">Waiting for usage data...</div>
      `;
    }

    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-owner">${account.owner}</div>
          <div class="card-username">@${account.username}</div>
        </div>
        <div class="card-actions-top">
          <span class="card-badge ${badgeClass}">${badgeText}</span>
          <button class="btn-danger-sm" style="padding: 2px 6px" onclick="deleteAccount(${account.id})">×</button>
        </div>
      </div>
      <div class="card-usage">
        ${usageHtml}
      </div>
      <div style="margin-top: auto">
        ${account.isActive 
          ? `<button class="btn btn-activate is-active" disabled>Connected to Internet</button>`
          : `<button class="btn btn-activate" onclick="activateAccount(${account.id})">Activate Connection</button>`
        }
      </div>
    `;
    accountsGrid.appendChild(card);
  });

  // Render History
  historyList.innerHTML = '';
  if (data.rotationHistory && data.rotationHistory.length > 0) {
    data.rotationHistory.forEach(item => {
      const hItem = document.createElement('div');
      hItem.className = 'history-item';
      hItem.innerHTML = `
        <div class="history-arrow">
          <span class="history-from">${item.fromOwner}</span>
          <span class="history-arrow-icon">➔</span>
          <span class="history-to">${item.toOwner}</span>
        </div>
        <div class="history-time">${formatTime(item.timestamp)} — ${new Date(item.timestamp).toLocaleDateString()}</div>
        <div class="history-reason">${item.reason}</div>
      `;
      historyList.appendChild(hItem);
    });
  } else {
    historyList.innerHTML = '<div class="empty-state">No rotation events yet</div>';
  }
}

function resetActiveBanner(msg) {
  activeOwner.textContent = msg;
  activeUsername.textContent = '';
  activeHours.textContent = '—';
  activeRemaining.textContent = '—';
  activePercent.textContent = '—';
  activeProgressBar.style.width = '0%';
}

function renderLogs(logs) {
  logsContainer.innerHTML = '';
  if (!logs || logs.length === 0) {
    logsContainer.innerHTML = '<div class="empty-state">No logs available</div>';
    return;
  }

  logs.forEach(log => {
    const line = document.createElement('div');
    const levelClass = log.level === 'error' ? 'log-error' : log.level === 'warn' ? 'log-warn' : 'log-info';
    line.className = `log-line ${levelClass}`;

    const timestamp = log.timestamp ? formatTime(log.timestamp) : '';
    line.innerHTML = `
      <span class="log-time">[${timestamp}]</span>
      <span class="log-message">${escapeHtml(log.message || '')}</span>
    `;
    logsContainer.appendChild(line);
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Manual Switch & Add Modal Actions ──────────────────────────────────

async function activateAccount(accountId) {
  showActivateModal('Initiating Connection...', 'Communicating with router at 192.168.0.1...');
  setActivateProgress(20);

  try {
    setActivateProgress(50);
    const res = await fetch('/api/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId })
    });
    
    setActivateProgress(80);
    const data = await res.json();
    setActivateProgress(100);

    if (data.ok && data.success) {
      showActivateModal('Activated Successfully! 🎉', `${data.message}. The router will reconnect using these PPPoE details now.`, true);
      fetchStatus();
      setTimeout(fetchLogs, 1000);
    } else {
      showActivateModal('Activation Failed ❌', `Error: ${data.error || 'Failed to update credentials on router'}`, true);
    }
  } catch (err) {
    console.error(err);
    showActivateModal('Request Failed ❌', 'Unable to reach local server.', true);
  }
}

window.activateAccount = activateAccount;

// Add account from dashboard header
btnAddAccountHeader.addEventListener('click', () => {
  addAccountModal.classList.add('open');
  modalError.classList.add('hidden');
});

btnCancelAddAccount.addEventListener('click', () => {
  addAccountModal.classList.remove('open');
  modalOwner.value = '';
  modalUsername.value = '';
  modalPassword.value = '';
});

btnConfirmAddAccount.addEventListener('click', async () => {
  const owner = modalOwner.value.trim();
  const username = modalUsername.value.trim();
  const password = modalPassword.value.trim();

  if (!owner || !username || !password) {
    modalError.textContent = 'Please fill out all fields';
    modalError.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, username, password })
    });
    const data = await res.json();
    if (data.ok) {
      addAccountModal.classList.remove('open');
      modalOwner.value = '';
      modalUsername.value = '';
      modalPassword.value = '';
      fetchStatus();
      // Start a background check cycle for the new account
      fetch('/api/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshAll: true }) });
    } else {
      modalError.textContent = data.error || 'Failed to add account';
      modalError.classList.remove('hidden');
    }
  } catch (err) {
    modalError.textContent = 'Server connection error';
    modalError.classList.remove('hidden');
  }
});

// Delete account from dashboard
async function deleteAccount(id) {
  if (!confirm('Are you sure you want to delete this account?')) return;
  try {
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      fetchStatus();
      fetchLogs();
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error(err);
  }
}

window.deleteAccount = deleteAccount;

// ── Settings Config form ──────────────────────────────────────────────

btnSaveConfig.addEventListener('click', async () => {
  const threshold = parseInt(cfgThreshold.value);
  const interval = parseInt(cfgInterval.value);
  const cfgRouterPass = document.getElementById('cfgRouterPass');

  if (isNaN(threshold) || threshold < 1 || threshold > 200) {
    alert('Please enter a valid threshold (1-200 hours).');
    return;
  }
  if (isNaN(interval) || interval < 5 || interval > 180) {
    alert('Please enter a valid interval (5-180 minutes).');
    return;
  }

  btnSaveConfig.disabled = true;
  btnSaveConfig.textContent = 'Saving...';

  const body = {
    threshold_hours: threshold,
    check_interval_minutes: interval,
  };
  if (cfgRouterPass && cfgRouterPass.value) {
    body.router_password = cfgRouterPass.value;
  }

  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      alert('Settings saved!');
      if (cfgRouterPass) cfgRouterPass.value = '';
      fetchStatus();
    } else {
      alert('Failed to save settings');
    }
  } catch (err) {
    alert('Server connection error');
  } finally {
    btnSaveConfig.disabled = false;
    btnSaveConfig.textContent = 'Save Settings';
  }
});

// ── Manual Checks & Refreshes ─────────────────────────────────────────

btnRefreshAll.addEventListener('click', async () => {
  btnRefreshAll.disabled = true;
  btnRefreshAll.textContent = '↻ Scanning...';
  try {
    await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshAll: true })
    });
    alert('Background scan of all accounts started. Updates will appear in a few seconds.');
  } catch (err) {
    console.error(err);
  } finally {
    setTimeout(() => {
      btnRefreshAll.disabled = false;
      btnRefreshAll.textContent = '↻ Refresh All';
    }, 4000);
  }
});

btnRefreshAllFull.addEventListener('click', () => btnRefreshAll.click());

btnCheckNow.addEventListener('click', async () => {
  btnCheckNow.disabled = true;
  btnCheckNow.textContent = 'Checking...';
  try {
    await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshAll: false })
    });
    alert('Active account usage check triggered.');
  } catch (err) {
    console.error(err);
  } finally {
    setTimeout(() => {
      btnCheckNow.disabled = false;
      btnCheckNow.textContent = 'Check Active Account';
    }, 3000);
  }
});

// ── Activate Modal Helpers ────────────────────────────────────────────

function showActivateModal(title, body, isDone = false) {
  activateModal.classList.add('open');
  activateTitle.textContent = title;
  activateBody.textContent = body;
  
  if (isDone) {
    activateProgress.classList.add('hidden');
    btnCloseActivate.style.display = 'inline-block';
  } else {
    activateProgress.classList.remove('hidden');
    btnCloseActivate.style.display = 'none';
  }
}

function setActivateProgress(percent) {
  activateProgressBar.style.width = `${percent}%`;
}

btnCloseActivate.addEventListener('click', () => {
  activateModal.classList.remove('open');
  setTimeout(() => {
    activateProgressBar.style.width = '0%';
  }, 300);
});

// ── Logout ────────────────────────────────────────────────────────────

const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    if (!confirm('This will clear all accounts and return to the setup screen. Are you sure?')) return;

    btnLogout.disabled = true;
    btnLogout.textContent = 'Logging out...';

    try {
      const res = await fetch('/api/logout', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        // Reset onboarding state
        onboardingAccounts = [];
        renderOnboardAccounts();
        btnFinishSetup.setAttribute('disabled', 'true');

        // Reset step indicator
        step1.classList.remove('hidden');
        step2.classList.add('hidden');
        step3.classList.add('hidden');
        dot1.classList.add('active');
        dot1.classList.remove('done');
        dot2.classList.remove('active', 'done');
        dot3.classList.remove('active', 'done');

        // Switch views
        mainApp.classList.add('hidden');
        onboardingOverlay.classList.remove('hidden');
      } else {
        alert('Logout failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Could not reach server');
    } finally {
      btnLogout.disabled = false;
      btnLogout.textContent = '✕ Logout';
    }
  });
}

// ── App Init ──────────────────────────────────────────────────────────

fetchStatus();
fetchLogs();

// Fast poll initially to check status, then normal poll
setTimeout(() => {
  fetchStatus();
  fetchLogs();
}, 2000);

setInterval(fetchStatus, 12000);
setInterval(fetchLogs, 15000);

// ── Share URL (for roommates) ─────────────────────────────────────────
async function loadShareUrl() {
  try {
    const res = await fetch('/api/share-url');
    const data = await res.json();
    if (data.ok) {
      const el = document.getElementById('shareUrlValue');
      if (el) el.textContent = data.url;
    }
  } catch (e) {
    const el = document.getElementById('shareUrlValue');
    if (el) el.textContent = `http://localhost:3000`;
  }
}

function copyShareUrl() {
  const url = document.getElementById('shareUrlValue')?.textContent;
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.querySelector('.share-url-box .btn');
    if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => btn.textContent = '📋 Copy Link', 2000); }
  });
}

loadShareUrl();
