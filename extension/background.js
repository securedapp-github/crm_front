/**
 * SecuredApp CRM Activity Tracker - Background Service Worker
 * Manifest V3 Compliant
 */

// Configuration Constants
const DEFAULT_API_URL = 'https://crm-be.securedapp.io/api/activity';
const DEFAULT_AUTH_URL = 'https://crm-be.securedapp.io/api/auth';
const HEARTBEAT_ALARM_NAME = 'crm_heartbeat';
const POLICY_SYNC_ALARM_NAME = 'crm_policy_sync';
const HEARTBEAT_INTERVAL_MINUTES = 0.5; // Every 30 seconds
const POLICY_SYNC_INTERVAL_MINUTES = 5;  // Every 5 minutes
const MAX_QUEUE_SIZE = 300;

// In-memory state tracking
let sessionStartTime = Date.now();
let activeTabInfo = null;
let isUserIdle = false;

// ----------------------------------------------------
// Initialization & Lifecycle
// ----------------------------------------------------
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[SecuredApp Activity Tracker] Installed/Updated:', details.reason);
  await initStorageDefaults();
  setupAlarms();
  await syncAllowedDomains();
  await captureCurrentActiveTab();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[SecuredApp Activity Tracker] Browser Startup');
  await initStorageDefaults();
  setupAlarms();
  await syncAllowedDomains();
  await captureCurrentActiveTab();
});

async function initStorageDefaults() {
  const data = await chrome.storage.local.get([
    'enabled',
    'crmApiUrl',
    'authApiUrl',
    'userId',
    'userName',
    'userEmail',
    'authToken',
    'deviceId',
    'browserName',
    'pendingQueue',
    'allowedDomains',
    'strictAllowlistOnly',
    'lastSyncTime',
    'lastSyncStatus'
  ]);

  const updates = {};
  if (data.enabled === undefined) updates.enabled = true;
  if (!data.crmApiUrl) updates.crmApiUrl = DEFAULT_API_URL;
  if (!data.authApiUrl) updates.authApiUrl = DEFAULT_AUTH_URL;
  if (!data.deviceId) updates.deviceId = `Device-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  if (!data.browserName) updates.browserName = 'Chrome';
  if (!Array.isArray(data.pendingQueue)) updates.pendingQueue = [];
  if (!Array.isArray(data.allowedDomains)) updates.allowedDomains = [];
  if (data.strictAllowlistOnly === undefined) updates.strictAllowlistOnly = false;
  if (!data.lastSyncStatus) updates.lastSyncStatus = 'idle';

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
}

function setupAlarms() {
  chrome.alarms.create(HEARTBEAT_ALARM_NAME, { periodInMinutes: HEARTBEAT_INTERVAL_MINUTES });
  chrome.alarms.create(POLICY_SYNC_ALARM_NAME, { periodInMinutes: POLICY_SYNC_INTERVAL_MINUTES });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === HEARTBEAT_ALARM_NAME) {
    await handleHeartbeat();
  } else if (alarm.name === POLICY_SYNC_ALARM_NAME) {
    await syncAllowedDomains();
  }
});

// ----------------------------------------------------
// URL & Domain Helpers
// ----------------------------------------------------
function extractDomain(urlStr) {
  if (!urlStr) return '';
  try {
    const formatted = urlStr.startsWith('http') ? urlStr : `https://${urlStr}`;
    const url = new URL(formatted);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch (e) {
    return (urlStr.split('/')[0] || '').replace(/^www\./, '').toLowerCase();
  }
}

function isInternalUrl(urlStr) {
  if (!urlStr) return true;
  return urlStr.startsWith('chrome://') ||
         urlStr.startsWith('chrome-extension://') ||
         urlStr.startsWith('edge://') ||
         urlStr.startsWith('about:') ||
         urlStr.startsWith('view-source:');
}

function classifyDomainHeuristic(domain) {
  const prodKeywords = ['github', 'gitlab', 'jira', 'confluence', 'stackoverflow', 'figma', 'notion', 'docs.google', 'slack', 'crm', 'securedapp', 'linear', 'trello', 'asana'];
  const unprodKeywords = ['facebook', 'instagram', 'twitter', 'x.com', 'tiktok', 'youtube', 'netflix', 'reddit', 'twitch', 'gaming', 'discord', 'pinterest'];

  const lower = (domain || '').toLowerCase();
  if (prodKeywords.some(k => lower.includes(k))) return 'productive';
  if (unprodKeywords.some(k => lower.includes(k))) return 'unproductive';
  return 'neutral';
}

function matchesDomainPattern(pattern, domain, fullUrl) {
  if (!pattern) return false;
  const cleanPat = pattern.trim().toLowerCase();
  const cleanDom = (domain || '').toLowerCase();
  const cleanUrl = (fullUrl || '').toLowerCase();

  if (cleanPat.startsWith('*.')) {
    const base = cleanPat.replace('*.', '');
    return cleanDom.endsWith(base) || cleanDom === base;
  }
  if (cleanPat.includes('*')) {
    const regexStr = '^' + cleanPat.replace(/\*/g, '.*') + '$';
    try {
      const regex = new RegExp(regexStr, 'i');
      return regex.test(cleanDom) || regex.test(cleanUrl);
    } catch (e) {
      return cleanDom.includes(cleanPat.replace(/\*/g, ''));
    }
  }
  return cleanDom === cleanPat || cleanDom.endsWith('.' + cleanPat) || cleanUrl.includes(cleanPat);
}

// ----------------------------------------------------
// Tab & Session Tracking
// ----------------------------------------------------
async function captureCurrentActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab && tab.url) {
      await updateActiveTab(tab);
    }
  } catch (err) {
    console.debug('[SecuredApp] captureCurrentActiveTab error:', err);
  }
}

async function updateActiveTab(tab) {
  const state = await chrome.storage.local.get(['enabled', 'allowedDomains', 'strictAllowlistOnly']);
  if (!state.enabled) return;

  const now = Date.now();
  const durationSec = Math.max(1, Math.min(300, Math.round((now - sessionStartTime) / 1000)));

  // Record previous tab if valid
  if (activeTabInfo && activeTabInfo.url && !isInternalUrl(activeTabInfo.url)) {
    const prevDomain = extractDomain(activeTabInfo.url);
    const category = getCategoryForDomain(prevDomain, activeTabInfo.url, state.allowedDomains);

    const isAllowed = !state.strictAllowlistOnly || state.allowedDomains.length === 0 ||
      state.allowedDomains.some(p => p.isActive && matchesDomainPattern(p.domainPattern, prevDomain, activeTabInfo.url));

    if (isAllowed) {
      const activityRecord = {
        url: activeTabInfo.url,
        domain: prevDomain,
        pageTitle: activeTabInfo.title || prevDomain,
        category: category,
        startTime: new Date(sessionStartTime).toISOString(),
        endTime: new Date(now).toISOString(),
        durationSeconds: durationSec,
        isIdle: isUserIdle
      };
      await enqueueActivity(activityRecord);
    }
  }

  // Switch to new tab
  sessionStartTime = now;
  activeTabInfo = {
    id: tab.id,
    url: tab.url,
    title: tab.title || '',
    favIconUrl: tab.favIconUrl || ''
  };

  // Update current session in storage for popup live card
  const newDomain = extractDomain(tab.url);
  const newCategory = getCategoryForDomain(newDomain, tab.url, state.allowedDomains);
  await chrome.storage.local.set({
    currentSession: {
      url: tab.url,
      domain: newDomain,
      pageTitle: tab.title || newDomain,
      category: newCategory,
      startTime: sessionStartTime,
      isIdle: isUserIdle
    }
  });
}

function getCategoryForDomain(domain, fullUrl, allowedDomains) {
  if (Array.isArray(allowedDomains)) {
    for (const p of allowedDomains) {
      if (p.isActive && matchesDomainPattern(p.domainPattern, domain, fullUrl)) {
        if (p.category) return p.category;
      }
    }
  }
  return classifyDomainHeuristic(domain);
}

// ----------------------------------------------------
// Tab Event Listeners
// ----------------------------------------------------
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      await updateActiveTab(tab);
    }
  } catch (err) {
    console.debug('[SecuredApp] tabs.onActivated error:', err);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    await updateActiveTab(tab);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus - user may be out of browser
    isUserIdle = true;
  } else {
    isUserIdle = false;
    await captureCurrentActiveTab();
  }
});

chrome.idle.onStateChanged.addListener((newState) => {
  isUserIdle = (newState !== 'active');
  console.log('[SecuredApp] Idle state:', newState);
});

// ----------------------------------------------------
// Queue & Sync Engine
// ----------------------------------------------------
async function enqueueActivity(record) {
  const { pendingQueue = [] } = await chrome.storage.local.get(['pendingQueue']);
  pendingQueue.push(record);

  // Keep queue bounded
  while (pendingQueue.length > MAX_QUEUE_SIZE) {
    pendingQueue.shift();
  }

  await chrome.storage.local.set({ pendingQueue });
}

async function handleHeartbeat() {
  const state = await chrome.storage.local.get(['enabled', 'allowedDomains', 'strictAllowlistOnly']);
  if (!state.enabled) return;

  // Capture current segment
  if (activeTabInfo && activeTabInfo.url && !isInternalUrl(activeTabInfo.url)) {
    const now = Date.now();
    const durationSec = Math.max(1, Math.min(300, Math.round((now - sessionStartTime) / 1000)));
    const domain = extractDomain(activeTabInfo.url);
    const category = getCategoryForDomain(domain, activeTabInfo.url, state.allowedDomains);

    const isAllowed = !state.strictAllowlistOnly || state.allowedDomains.length === 0 ||
      state.allowedDomains.some(p => p.isActive && matchesDomainPattern(p.domainPattern, domain, activeTabInfo.url));

    if (isAllowed) {
      const activityRecord = {
        url: activeTabInfo.url,
        domain: domain,
        pageTitle: activeTabInfo.title || domain,
        category: category,
        startTime: new Date(sessionStartTime).toISOString(),
        endTime: new Date(now).toISOString(),
        durationSeconds: durationSec,
        isIdle: isUserIdle
      };
      await enqueueActivity(activityRecord);
      sessionStartTime = now;
    }
  }

  // Flush queue to backend
  await flushQueueToBackend();
}

async function flushQueueToBackend() {
  const state = await chrome.storage.local.get([
    'crmApiUrl',
    'userId',
    'userEmail',
    'userName',
    'authToken',
    'deviceId',
    'browserName',
    'pendingQueue'
  ]);

  const queue = state.pendingQueue || [];
  if (queue.length === 0) return { success: true, count: 0 };

  const baseUrl = (state.crmApiUrl || DEFAULT_API_URL).replace(/\/$/, '');
  const userIdentifier = state.userId || state.userEmail || state.userName || 'Default-User';

  const payload = {
    userId: userIdentifier,
    browserName: state.browserName || 'Chrome',
    deviceId: state.deviceId || 'Chrome-Device',
    timezoneOffset: new Date().getTimezoneOffset(),
    activities: queue
  };

  const headers = { 'Content-Type': 'application/json' };
  if (state.authToken) {
    headers['Authorization'] = `Bearer ${state.authToken}`;
  }

  try {
    const endpoint = baseUrl.endsWith('/log') ? baseUrl : `${baseUrl}/log`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      await chrome.storage.local.set({
        pendingQueue: [],
        lastSyncTime: Date.now(),
        lastSyncStatus: 'success',
        lastSyncCount: queue.length
      });
      console.log(`[SecuredApp] Successfully synced ${queue.length} activities to CRM`);
      return { success: true, count: queue.length };
    } else {
      const errText = await res.text().catch(() => '');
      console.warn(`[SecuredApp] Sync HTTP error (${res.status}):`, errText);
      await chrome.storage.local.set({
        lastSyncStatus: 'error',
        lastSyncError: `HTTP ${res.status}`
      });
      return { success: false, error: `HTTP ${res.status}` };
    }
  } catch (err) {
    console.warn('[SecuredApp] Sync network error:', err.message);
    await chrome.storage.local.set({
      lastSyncStatus: 'error',
      lastSyncError: err.message
    });
    return { success: false, error: err.message };
  }
}

async function sendOfflineSignal() {
  const state = await chrome.storage.local.get([
    'crmApiUrl',
    'userId',
    'userEmail',
    'userName',
    'authToken',
    'deviceId',
    'browserName'
  ]);

  const baseUrl = (state.crmApiUrl || DEFAULT_API_URL).replace(/\/$/, '');
  const userIdentifier = state.userId || state.userEmail || state.userName || 'Default-User';

  const payload = {
    userId: userIdentifier,
    browserName: state.browserName || 'Chrome',
    deviceId: state.deviceId || 'Chrome-Device',
    timezoneOffset: new Date().getTimezoneOffset(),
    activities: [{
      url: 'chrome://extension-turned-off',
      domain: 'extension-disabled',
      pageTitle: 'Extension Turned Off',
      category: 'neutral',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds: 0,
      isIdle: true
    }]
  };

  const headers = { 'Content-Type': 'application/json' };
  if (state.authToken) {
    headers['Authorization'] = `Bearer ${state.authToken}`;
  }

  try {
    const endpoint = baseUrl.endsWith('/log') ? baseUrl : `${baseUrl}/log`;
    await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    console.log('[SecuredApp] Sent offline signal to CRM backend');
  } catch (e) {
    console.debug('[SecuredApp] Failed to send offline signal:', e);
  }
}

// ----------------------------------------------------
// Policy & Allowed Domains Sync
// ----------------------------------------------------
async function syncAllowedDomains() {
  const state = await chrome.storage.local.get(['crmApiUrl', 'userId', 'authToken']);
  const baseUrl = (state.crmApiUrl || DEFAULT_API_URL).replace(/\/$/, '');
  const cleanBase = baseUrl.endsWith('/log') ? baseUrl.replace(/\/log$/, '') : baseUrl;
  const endpoint = `${cleanBase}/allowed-domains${state.userId ? `?userId=${encodeURIComponent(state.userId)}` : ''}`;

  const headers = {};
  if (state.authToken) headers['Authorization'] = `Bearer ${state.authToken}`;

  try {
    const res = await fetch(endpoint, { headers });
    if (res.ok) {
      const data = await res.json();
      await chrome.storage.local.set({
        allowedDomains: data.allowedDomains || [],
        strictAllowlistOnly: Boolean(data.strictAllowlistOnly)
      });
      console.log(`[SecuredApp] Synced ${data.allowedDomains ? data.allowedDomains.length : 0} allowed domains.`);
    }
  } catch (err) {
    console.debug('[SecuredApp] Policy sync error:', err.message);
  }
}

// ----------------------------------------------------
// Message Communication Handler (Popup & Options)
// ----------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'GET_STATUS': {
          const storage = await chrome.storage.local.get(null);
          sendResponse({
            success: true,
            data: {
              enabled: storage.enabled ?? true,
              userId: storage.userId || storage.userEmail || '',
              userName: storage.userName || '',
              userEmail: storage.userEmail || '',
              crmApiUrl: storage.crmApiUrl || DEFAULT_API_URL,
              authApiUrl: storage.authApiUrl || DEFAULT_AUTH_URL,
              deviceId: storage.deviceId || '',
              currentSession: storage.currentSession || null,
              pendingQueueCount: (storage.pendingQueue || []).length,
              allowedDomainsCount: (storage.allowedDomains || []).length,
              strictAllowlistOnly: Boolean(storage.strictAllowlistOnly),
              lastSyncTime: storage.lastSyncTime || null,
              lastSyncStatus: storage.lastSyncStatus || 'idle',
              lastSyncError: storage.lastSyncError || null,
              authToken: storage.authToken || ''
            }
          });
          break;
        }

        case 'SET_ENABLED': {
          const newEnabled = Boolean(message.enabled);
          await chrome.storage.local.set({ enabled: newEnabled });
          if (!newEnabled) {
            await sendOfflineSignal();
          } else {
            sessionStartTime = Date.now();
            await captureCurrentActiveTab();
          }
          sendResponse({ success: true, enabled: newEnabled });
          break;
        }

        case 'SYNC_NOW': {
          await handleHeartbeat();
          const storage = await chrome.storage.local.get(['lastSyncStatus', 'lastSyncTime', 'lastSyncError', 'pendingQueue']);
          sendResponse({
            success: storage.lastSyncStatus === 'success',
            lastSyncTime: storage.lastSyncTime,
            pendingCount: (storage.pendingQueue || []).length,
            error: storage.lastSyncError
          });
          break;
        }

        case 'TEST_CONNECTION': {
          const targetUrl = (message.apiUrl || DEFAULT_API_URL).replace(/\/$/, '');
          const checkUrl = targetUrl.endsWith('/allowed-domains') ? targetUrl : `${targetUrl}/allowed-domains`;
          const t0 = Date.now();
          try {
            const res = await fetch(checkUrl, { method: 'GET' });
            const latency = Date.now() - t0;
            if (res.ok) {
              const body = await res.json().catch(() => ({}));
              sendResponse({
                success: true,
                status: res.status,
                latency,
                count: body.count || 0
              });
            } else {
              sendResponse({
                success: false,
                status: res.status,
                latency,
                error: `HTTP ${res.status}`
              });
            }
          } catch (err) {
            sendResponse({
              success: false,
              latency: Date.now() - t0,
              error: err.message || 'Connection failed'
            });
          }
          break;
        }

        case 'LOGIN': {
          const { email, password, authUrl } = message;
          const targetAuthUrl = (authUrl || DEFAULT_AUTH_URL).replace(/\/$/, '');
          const endpoint = targetAuthUrl.endsWith('/extension-login') ? targetAuthUrl : `${targetAuthUrl}/extension-login`;

          try {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok && data.success && data.token) {
              await chrome.storage.local.set({
                authToken: data.token,
                userId: String(data.userId || (data.user && data.user.id) || email),
                userName: data.user?.name || email,
                userEmail: data.user?.email || email,
                userRole: data.user?.role || 'employee'
              });
              await syncAllowedDomains();
              sendResponse({ success: true, user: data.user });
            } else {
              sendResponse({ success: false, error: data.error || 'Authentication failed' });
            }
          } catch (err) {
            sendResponse({ success: false, error: err.message || 'Network error during login' });
          }
          break;
        }

        case 'LOGOUT': {
          await chrome.storage.local.set({
            authToken: '',
            userId: '',
            userName: '',
            userEmail: '',
            userRole: ''
          });
          sendResponse({ success: true });
          break;
        }

        case 'UPDATE_CONFIG': {
          await chrome.storage.local.set(message.data || {});
          if (message.data?.crmApiUrl || message.data?.userId) {
            await syncAllowedDomains();
          }
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (err) {
      console.error('[SecuredApp] Message handler error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep message channel open for async response
});
