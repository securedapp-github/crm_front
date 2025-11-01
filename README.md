# CRM Monorepo

This repository contains both the backend (Node.js/Express/MySQL) and the frontend (React + Vite) for the CRM system.

## Repository Structure

- **crm-backend/**: Node.js + Express + Sequelize API
- **crm-frontend/**: React + Vite client

## Environment Variables

### Backend: `crm-backend/.env`

Create a `.env` file inside `crm-backend/` with the following keys:

```env
# App
PORT=5000

# Database (MySQL)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=crmdb
DB_DIALECT=mysql
DB_PORT=3306

# CORS
FRONTEND_URL=http://localhost:5173

# Email (SMTP)
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_app_password
```

Notes:

- Replace `your_mysql_password`, `your_email@example.com`, and `your_app_password` with real values.
- Make sure the MySQL database `crmdb` exists (or change `DB_NAME`).

### Frontend: `crm-frontend/.env` (optional)

If your frontend needs environment variables, create `crm-frontend/.env` and add entries like:

```env
# Backend API base URL used by Axios/fetch
VITE_BACKEND_URL=http://localhost:5000



## Install & Run

### 1) Backend

```bash
# From repository root
npm install --prefix crm-backend
npm run dev --prefix crm-backend
```

- Starts API at `http://localhost:5000` (per `.env`)

### Database reset (clean slate for QA)

```bash
# From repository root
npm run reset-db --prefix crm-backend
```

- Runs `scripts/resetDatabase.js`, which executes `src/sql/schema.sql` to drop & recreate the `crmdb` database, then forces Sequelize to sync all models.
- Use this whenever you need a blank environment before E2E testing. Do **not** hit the demo seed endpoint afterwards unless you want sample data restored.

### Password reset emails

- Ensure `EMAIL_USER`/`EMAIL_PASS` are valid SMTP credentials in `crm-backend/.env`.
- The API now exposes:
  - `POST /api/auth/forgot-password` with `{ email }` to send a reset link (1-hour expiry).
  - `POST /api/auth/reset-password` with `{ token, password }` from that link to set a new password.
- Frontend helpers `requestPasswordReset` and `resetPassword` are available in `crm-frontend/src/api/auth.js` for building the UI flow.

### 2) Frontend

```bash
# From repository root
npm install --prefix crm-frontend
npm run dev --prefix crm-frontend
```

- Vite dev server runs at `http://localhost:5173`

### chart ``

npm install recharts --prefix crm-frontend
