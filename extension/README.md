# SecuredApp CRM Activity Tracker - Chrome Extension (Manifest V3)

Real-time employee browser activity, productivity classification, and domain allowlist policy enforcement for SecuredApp CRM.

---

## 🚀 How to Load & Test in Google Chrome

1. Open **Google Chrome** and navigate to `chrome://extensions`.
2. Toggle ON **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select this directory:
   ```
   c:\Users\NIKIL\Documents\securedapp\crm admin\extension
   ```
5. The **SecuredApp Activity Tracker** extension is now active in your browser toolbar!

---

## ⚙️ Features

- **Live Activity Capture**: Accurately tracks active tab domain, page title, duration, and idle state.
- **Auto-Sync Heartbeat**: Flushes browsing sessions and pings the CRM backend every 30 seconds.
- **Domain Allowlist Enforcement**: Automatically syncs allowed domain policies from CRM and enforces strict/permissive recording.
- **CORS-Free & Resilient**: Background service worker directly dispatches batches with automatic retry queues and offline markers.
- **Dual User Identification**: Supports simple employee identifier/email input or full JWT authentication.
- **Configurable Endpoints**: Easily switch between Production (`https://crm-be.securedapp.io`), Staging, and Localhost (`http://localhost:5000/api/activity`).
