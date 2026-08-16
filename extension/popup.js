/**
 * SecuredApp CRM Activity Tracker - Popup Script
 */

let state = {
  enabled: true,
  currentSession: null,
  userId: '',
  userName: '',
  userEmail: '',
  crmApiUrl: '',
  authApiUrl: '',
  pendingQueueCount: 0,
  allowedDomainsCount: 0,
  strictAllowlistOnly: false,
  lastSyncTime: null,
  lastSyncStatus: 'idle',
  authToken: ''
};

let timerInterval = null;

// DOM Elements
const trackingToggle = document.getElementById('trackingToggle');
const statusBanner = document.getElementById('statusBanner');
const statusLabel = document.getElementById('statusLabel');
const serverBadge = document.getElementById('serverBadge');
const openOptionsBtn = document.getElementById('openOptionsBtn');

const currentDomainEl = document.getElementById('currentDomain');
const currentPageTitleEl = document.getElementById('currentPageTitle');
const domainFavicon = document.getElementById('domainFavicon');
const categoryBadge = document.getElementById('categoryBadge');
const sessionDurationTimer = document.getElementById('sessionDurationTimer');
const idleLabel = document.getElementById('idleLabel');
const idleIndicator = document.getElementById('idleIndicator');

const allowlistNotice = document.getElementById('allowlistNotice');
const allowlistText = document.getElementById('allowlistText');

const userAvatar = document.getElementById('userAvatar');
const userNameDisplay = document.getElementById('userNameDisplay');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const userActionBtn = document.getElementById('userActionBtn');
const userDrawer = document.getElementById('userDrawer');

const tabIdentifierBtn = document.getElementById('tabIdentifierBtn');
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabIdentifierContent = document.getElementById('tabIdentifierContent');
const tabLoginContent = document.getElementById('tabLoginContent');

const userInputField = document.getElementById('userInputField');
const saveUserBtn = document.getElementById('saveUserBtn');

const loginEmailField = document.getElementById('loginEmailField');
const loginPasswordField = document.getElementById('loginPasswordField');
const doLoginBtn = document.getElementById('doLoginBtn');
const loginMsg = document.getElementById('loginMsg');

const syncNowBtn = document.getElementById('syncNowBtn');
const syncIcon = document.getElementById('syncIcon');
const syncStatusText = document.getElementById('syncStatusText');
const pendingQueueText = document.getElementById('pendingQueueText');
const openDashboardLink = document.getElementById('openDashboardLink');

// ----------------------------------------------------
// Initialization
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  await refreshState();
  setupEventListeners();
  startTimer();
});

async function refreshState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
      if (response && response.success) {
        state = { ...state, ...response.data };
        renderUI();
      }
      resolve();
    });
  });
}

function renderUI() {
  // Tracking status toggle
  trackingToggle.checked = state.enabled;
  if (state.enabled) {
    statusBanner.className = 'status-banner active';
    statusLabel.textContent = 'Tracker Active';
  } else {
    statusBanner.className = 'status-banner disabled';
    statusLabel.textContent = 'Tracker Paused';
  }

  // Server badge
  const isLocal = (state.crmApiUrl || '').includes('localhost') || (state.crmApiUrl || '').includes('127.0.0.1');
  serverBadge.textContent = isLocal ? 'Localhost' : 'Production';

  // Active Session
  const session = state.currentSession;
  if (session && state.enabled) {
    currentDomainEl.textContent = session.domain || 'Active Browsing';
    currentPageTitleEl.textContent = session.pageTitle || 'Monitoring active tab';
    currentPageTitleEl.title = session.pageTitle || session.url || '';

    // Category
    const cat = (session.category || 'neutral').toLowerCase();
    categoryBadge.className = `category-badge ${cat}`;
    categoryBadge.textContent = cat;

    // Idle
    if (session.isIdle) {
      idleLabel.textContent = 'Idle';
      idleIndicator.querySelector('.idle-dot').className = 'idle-dot idle';
    } else {
      idleLabel.textContent = 'Active';
      idleIndicator.querySelector('.idle-dot').className = 'idle-dot';
    }

    // Favicon
    if (session.domain && !session.domain.startsWith('chrome')) {
      domainFavicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(session.domain)}&sz=32`;
      domainFavicon.onerror = () => { domainFavicon.src = 'icons/icon16.png'; };
    } else {
      domainFavicon.src = 'icons/icon16.png';
    }
  } else {
    currentDomainEl.textContent = state.enabled ? 'Browser Active' : 'Extension Paused';
    currentPageTitleEl.textContent = state.enabled ? 'Ready to log sessions' : 'Tracking is currently turned off';
    categoryBadge.className = 'category-badge neutral';
    categoryBadge.textContent = 'Neutral';
    sessionDurationTimer.textContent = '00:00';
    domainFavicon.src = 'icons/icon16.png';
  }

  // Allowlist Banner
  if (state.strictAllowlistOnly && state.allowedDomainsCount > 0) {
    allowlistNotice.className = 'allowlist-notice strict';
    allowlistText.textContent = `Strict shield active: ${state.allowedDomainsCount} allowed domains`;
  } else {
    allowlistNotice.className = 'allowlist-notice';
    allowlistText.textContent = state.allowedDomainsCount > 0
      ? `Allowlist sync active (${state.allowedDomainsCount} policies)`
      : 'Monitoring all work domains';
  }

  // User details
  const displayName = state.userName || state.userId || 'Guest User';
  const displayEmail = state.userEmail || (state.userId.includes('@') ? state.userId : 'Not authenticated');
  userNameDisplay.textContent = displayName;
  userEmailDisplay.textContent = displayEmail;
  userAvatar.textContent = displayName.charAt(0).toUpperCase() || 'U';

  if (state.authToken) {
    userActionBtn.textContent = 'Logout';
  } else {
    userActionBtn.textContent = 'Change';
  }

  userInputField.value = state.userId || state.userName || '';
  loginEmailField.value = state.userEmail || (state.userId.includes('@') ? state.userId : '');

  // Queue and sync info
  pendingQueueText.textContent = `${state.pendingQueueCount || 0} queued`;
  if (state.lastSyncTime) {
    const secAgo = Math.max(0, Math.round((Date.now() - state.lastSyncTime) / 1000));
    syncStatusText.textContent = secAgo < 60 ? `Synced ${secAgo}s ago` : `Synced ${Math.round(secAgo / 60)}m ago`;
  } else {
    syncStatusText.textContent = 'Not synced yet';
  }
}

// ----------------------------------------------------
// Timer Tick
// ----------------------------------------------------
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (state.enabled && state.currentSession && state.currentSession.startTime) {
      const elapsedSec = Math.max(0, Math.round((Date.now() - state.currentSession.startTime) / 1000));
      const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const secs = String(elapsedSec % 60).padStart(2, '0');
      sessionDurationTimer.textContent = `${mins}:${secs}`;
    }
  }, 1000);
}

// ----------------------------------------------------
// Event Listeners
// ----------------------------------------------------
function setupEventListeners() {
  // Toggle monitoring
  trackingToggle.addEventListener('change', async () => {
    const enabled = trackingToggle.checked;
    chrome.runtime.sendMessage({ action: 'SET_ENABLED', enabled }, async () => {
      await refreshState();
    });
  });

  // Open settings
  openOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // User Drawer Toggle
  userActionBtn.addEventListener('click', async () => {
    if (state.authToken && userActionBtn.textContent === 'Logout') {
      chrome.runtime.sendMessage({ action: 'LOGOUT' }, async () => {
        await refreshState();
      });
      return;
    }
    userDrawer.classList.toggle('hidden');
  });

  // Drawer Tabs
  tabIdentifierBtn.addEventListener('click', () => {
    tabIdentifierBtn.className = 'tab-btn active';
    tabLoginBtn.className = 'tab-btn';
    tabIdentifierContent.className = 'tab-content active';
    tabLoginContent.className = 'tab-content';
  });

  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.className = 'tab-btn active';
    tabIdentifierBtn.className = 'tab-btn';
    tabLoginContent.className = 'tab-content active';
    tabIdentifierContent.className = 'tab-content';
  });

  // Save Simple User ID
  saveUserBtn.addEventListener('click', async () => {
    const val = userInputField.value.trim();
    if (!val) return;
    saveUserBtn.textContent = 'Saving...';
    chrome.runtime.sendMessage({
      action: 'UPDATE_CONFIG',
      data: {
        userId: val,
        userName: val,
        userEmail: val.includes('@') ? val : ''
      }
    }, async () => {
      saveUserBtn.textContent = 'Saved!';
      setTimeout(() => {
        saveUserBtn.textContent = 'Save';
        userDrawer.classList.add('hidden');
      }, 800);
      await refreshState();
    });
  });

  // Full CRM JWT Login
  doLoginBtn.addEventListener('click', async () => {
    const email = loginEmailField.value.trim();
    const password = loginPasswordField.value.trim();
    if (!email || !password) {
      loginMsg.className = 'auth-msg error';
      loginMsg.textContent = 'Email & password required';
      return;
    }

    doLoginBtn.textContent = 'Signing in...';
    doLoginBtn.disabled = true;
    loginMsg.textContent = '';

    chrome.runtime.sendMessage({
      action: 'LOGIN',
      email,
      password,
      authUrl: state.authApiUrl
    }, async (res) => {
      doLoginBtn.disabled = false;
      doLoginBtn.textContent = 'Authenticate via CRM';

      if (res && res.success) {
        loginMsg.className = 'auth-msg success';
        loginMsg.textContent = 'Login successful!';
        setTimeout(() => {
          userDrawer.classList.add('hidden');
          loginMsg.textContent = '';
        }, 1000);
        await refreshState();
      } else {
        loginMsg.className = 'auth-msg error';
        loginMsg.textContent = res?.error || 'Authentication failed';
      }
    });
  });

  // Sync Now Button
  syncNowBtn.addEventListener('click', async () => {
    syncIcon.classList.add('animate-spin');
    syncNowBtn.disabled = true;

    chrome.runtime.sendMessage({ action: 'SYNC_NOW' }, async (res) => {
      syncIcon.classList.remove('animate-spin');
      syncNowBtn.disabled = false;
      await refreshState();
    });
  });

  // Open Dashboard Link
  openDashboardLink.addEventListener('click', (e) => {
    e.preventDefault();
    const dashboardUrl = (state.crmApiUrl || '').includes('localhost')
      ? 'http://localhost:5173/dashboard/activity/live'
      : 'https://crm.securedapp.io/dashboard/activity/live';
    chrome.tabs.create({ url: dashboardUrl });
  });
}
