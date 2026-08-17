/**
 * SecuredApp CRM Activity Tracker - Options Script
 */

const PRESETS = {
  prod_io: {
    crmApiUrl: 'https://crm-be.securedapp.io/api/activity',
    authApiUrl: 'https://crm-be.securedapp.io/api/auth'
  },
  prod_in: {
    crmApiUrl: 'https://crm.securedapp.in/api/activity',
    authApiUrl: 'https://crm.securedapp.in/api/auth'
  },
  local: {
    crmApiUrl: 'http://localhost:5000/api/activity',
    authApiUrl: 'http://localhost:5000/api/auth'
  }
};

// DOM Elements
const serverPreset = document.getElementById('serverPreset');
const crmApiUrlInput = document.getElementById('crmApiUrl');
const authApiUrlInput = document.getElementById('authApiUrl');
const testConnectionBtn = document.getElementById('testConnectionBtn');
const testResultMsg = document.getElementById('testResultMsg');

const userIdInput = document.getElementById('userId');
const deviceIdInput = document.getElementById('deviceId');
const browserNameInput = document.getElementById('browserName');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const saveStatusMsg = document.getElementById('saveStatusMsg');

const refreshPoliciesBtn = document.getElementById('refreshPoliciesBtn');
const policyCountDesc = document.getElementById('policyCountDesc');
const policyList = document.getElementById('policyList');

const diagQueueCount = document.getElementById('diagQueueCount');
const diagLastSync = document.getElementById('diagLastSync');
const diagAuthStatus = document.getElementById('diagAuthStatus');
const headerSyncBadge = document.getElementById('headerSyncBadge');

const forceFlushBtn = document.getElementById('forceFlushBtn');
const resetStorageBtn = document.getElementById('resetStorageBtn');

document.addEventListener('DOMContentLoaded', async () => {
  await loadOptions();
  setupListeners();
});

async function loadOptions() {
  const data = await chrome.storage.local.get(null);

  crmApiUrlInput.value = data.crmApiUrl || PRESETS.prod_io.crmApiUrl;
  authApiUrlInput.value = data.authApiUrl || PRESETS.prod_io.authApiUrl;
  userIdInput.value = data.userId || data.userEmail || '';
  deviceIdInput.value = data.deviceId || '';
  browserNameInput.value = data.browserName || 'Chrome';

  // Determine preset
  if (data.crmApiUrl === PRESETS.prod_io.crmApiUrl || !data.crmApiUrl) {
    serverPreset.value = 'prod_io';
  } else if (data.crmApiUrl === PRESETS.prod_in.crmApiUrl) {
    serverPreset.value = 'prod_in';
  } else if (data.crmApiUrl === PRESETS.local.crmApiUrl) {
    serverPreset.value = 'local';
  } else {
    serverPreset.value = 'custom';
  }

  // Diagnostics
  const queue = data.pendingQueue || [];
  diagQueueCount.textContent = `${queue.length} item(s)`;

  if (data.lastSyncTime) {
    diagLastSync.textContent = new Date(data.lastSyncTime).toLocaleTimeString();
    headerSyncBadge.textContent = 'Active Sync';
    headerSyncBadge.className = 'badge success';
  } else {
    diagLastSync.textContent = 'Never';
    headerSyncBadge.textContent = 'Idle';
    headerSyncBadge.className = 'badge';
  }

  if (data.authToken) {
    diagAuthStatus.textContent = `Authenticated (User: ${data.userName || data.userId || 'Active'})`;
  } else {
    diagAuthStatus.textContent = 'Anonymous / Identifier Mode';
  }

  // Policies
  renderPolicies(data.allowedDomains || [], data.strictAllowlistOnly);
}

function renderPolicies(policies, strictMode) {
  if (!policies || policies.length === 0) {
    policyCountDesc.textContent = 'No custom allowlist policies received. Extension monitors standard browsing.';
    policyList.innerHTML = '<div class="empty-state">No policy rules configured on CRM server.</div>';
    return;
  }

  policyCountDesc.textContent = `${policies.length} policy rule(s) synced from CRM. ${strictMode ? 'Strict allowlist enforcement is ON.' : 'Categorization mode active.'}`;
  policyList.innerHTML = policies.map(p => `
    <div class="policy-item">
      <span class="policy-pattern">${p.domainPattern || 'Unknown'}</span>
      <span class="policy-badge ${p.category || 'neutral'}">${p.category || 'rule'}</span>
    </div>
  `).join('');
}

function setupListeners() {
  // Preset selector change
  serverPreset.addEventListener('change', () => {
    const val = serverPreset.value;
    if (PRESETS[val]) {
      crmApiUrlInput.value = PRESETS[val].crmApiUrl;
      authApiUrlInput.value = PRESETS[val].authApiUrl;
    }
  });

  // Test Connection
  testConnectionBtn.addEventListener('click', () => {
    const apiUrl = crmApiUrlInput.value.trim();
    testConnectionBtn.disabled = true;
    testResultMsg.textContent = 'Testing reachability...';
    testResultMsg.className = 'test-result';

    chrome.runtime.sendMessage({ action: 'TEST_CONNECTION', apiUrl }, (res) => {
      testConnectionBtn.disabled = false;
      if (res && res.success) {
        testResultMsg.className = 'test-result success';
        testResultMsg.textContent = `✓ Connected! Response time: ${res.latency}ms (${res.count} policies found)`;
      } else {
        testResultMsg.className = 'test-result error';
        testResultMsg.textContent = `✗ Failed: ${res?.error || 'No response from endpoint'}`;
      }
    });
  });

  // Save Settings
  saveSettingsBtn.addEventListener('click', () => {
    const crmApiUrl = crmApiUrlInput.value.trim();
    const authApiUrl = authApiUrlInput.value.trim();
    const userId = userIdInput.value.trim();
    const deviceId = deviceIdInput.value.trim();
    const browserName = browserNameInput.value.trim() || 'Chrome';

    saveSettingsBtn.disabled = true;
    saveStatusMsg.textContent = 'Saving...';
    saveStatusMsg.className = 'status-msg';

    chrome.runtime.sendMessage({
      action: 'UPDATE_CONFIG',
      data: {
        crmApiUrl,
        authApiUrl,
        userId,
        deviceId,
        browserName
      }
    }, async () => {
      saveSettingsBtn.disabled = false;
      saveStatusMsg.className = 'status-msg success';
      saveStatusMsg.textContent = 'Settings saved successfully!';
      setTimeout(() => { saveStatusMsg.textContent = ''; }, 2500);
      await loadOptions();
    });
  });

  // Refresh Policies
  refreshPoliciesBtn.addEventListener('click', async () => {
    refreshPoliciesBtn.textContent = 'Refreshing...';
    chrome.runtime.sendMessage({ action: 'SYNC_NOW' }, async () => {
      refreshPoliciesBtn.textContent = 'Refresh';
      await loadOptions();
    });
  });

  // Force Flush
  forceFlushBtn.addEventListener('click', () => {
    forceFlushBtn.textContent = 'Flushing...';
    chrome.runtime.sendMessage({ action: 'SYNC_NOW' }, async (res) => {
      forceFlushBtn.textContent = 'Force Flush Queue';
      await loadOptions();
    });
  });

  // Reset Storage
  resetStorageBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all extension settings and cache to default values?')) {
      await chrome.storage.local.clear();
      chrome.runtime.sendMessage({ action: 'UPDATE_CONFIG', data: {} }, async () => {
        await loadOptions();
      });
    }
  });
}
