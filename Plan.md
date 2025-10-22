## CRM System Design

CRM = Customer Relationship Management system.
 It helps a business manage:

Objective:

To develop a minimum viable CRM system that centralizes customer interactions, manages leads and sales pipelines, and delivers actionable insights — enabling small and growing businesses to improve customer relationships and operational efficiency within a single intuitive platform.

## 🗓️ Timeline Overview

| Phase   | Days   | Focus                                             |
| ------- | ------ | ------------------------------------------------- |
| Phase 1 | 1–3   | Planning & Design                                 |
| Phase 2 | 4–8   | Core Development (Backend + Frontend Integration) |
| Phase 3 | 9–14  | Feature Implementation                            |
| Phase 4 | 15–18 | Data Analysis & UX Improvements                   |
| Phase 5 | 19–20 | Testing & Deployment                              |

---

## 🎨 Phase 1 (Days 1–3): Planning & Design

### 1. Define Core Features

Focus only on essentials for the MVP:

* Contacts Management
* Sales/Deals Tracking
* Lead Generation & Management
* Customer Support Tickets
* Basic Dashboard & Reports

### 2. Front-End Architecture

* Framework: React.js (or Vue.js / Angular)
* Structure: Component-based & Modular
* Communication: Axios (for REST API integration)
* Styling: Tailwind CSS

### 3. UI/UX Design Principles

* Dashboard-first layout: Key metrics overview at a glance
* Intuitive navigation: Persistent sidebar or top nav bar
* Minimalist UI: Clean layout, consistent color palette, readable typography
* Responsive design: Work seamlessly on desktop, tablet, and mobile

---

## 💻 Phase 2 (Days 4–8): Core Development (Backend + Frontend Integration)

### 1. Backend Setup

* Framework: Node.js + Express
* Database: MySQL
* Models:

  * User
  * Contact
  * Lead / Deal
  * Task / Ticket

### 2. API Development

* Create RESTful APIs for CRUD operations:

  * /contacts
  * /leads
  * /deals
  * /tasks

### 3. Authentication

* JWT-based registration and login system
* Protected routes for authorized users only

### 4. Contact Management (Front-End + Back-End Integration)

* View all contacts
* Add new contact (Form + API call)
* View detailed contact profile

---

## 🛠️ Phase 3 (Days 9–14): Feature Implementation

### 1.  Marketing & Lead Management


* **Campaign schema**
  * Identification: `id`, `name`, `code`/slug, `description`, `businessUnit`/`companyId`.
  * Planning: `objective`, `channel` (Email, Paid Ads, Events…), `audienceSegment`, `productLine`, `startDate`, `endDate`.
  * Financials: `currency`, `budget`, `expectedSpend`, `plannedLeads`.
  * Ownership & workflow: `campaignOwnerId`, optional `teamIds`, `status` (Planned/Active/Paused/Completed), `priority`, `complianceChecklist`, integrations (`externalCampaignId`, `utmSource`, etc.).
  * Metrics (calculated): `actualSpend`, `generatedLeads`, `wonDeals`, `revenueAttributed`, `roi`. These update as leads/deals sync.
* **Lead schema**
  * Identity: `id`, `firstName`, `lastName`, `company`, `jobTitle`, `email`, `phone`, `location`.
  * Attribution: `campaignId` (required for structured campaigns), `source` (Web form, Event, Referral), `utm` tags if captured.
  * Status & scoring: `stage` (New, Contacted, Qualified, etc.), `score`, `temperature` (Hot/Warm/Cold), `statusReason`.
  * Ownership & history: `ownerId`, `createdBy`, timestamps, `notes`, `lastContactedAt`, `nextActionAt`.
  * Qualification data: budget/authority/need/timeline flags, interested products, consent flags (GDPR/CCPA).
  * Conversion linkage: `convertedContactId`, `dealId`, `closedAt`.
* **Relationship rules**
  * Campaign = strategic container; created once with planning info.
  * Lead = individual prospect tied to a campaign via `campaignId`. Keep `campaignId` optional by allowing a “General/Unassigned” campaign for organic leads. Metrics in analytics (e.g.,

    LeadAnalytics.jsx) aggregate leads back to their campaigns.



1️⃣ Capture — Get New Leads

* You can create campaigns (like ads, events, or promotions)
* You can add new leads (people interested in your business)
* Each lead can be linked to a campaign.
* When a lead is added to a campaign, the system updates the campaign’s total leads count.
* Leads can also be auto-assigned to salespeople using a round-robin rule (each gets one in turn).

2️⃣ Scoring — Rank Your Leads

* Each lead gets a score (0–100) to show how likely they are to become a customer.
* You can update the score and mark a lead as “Hot” if their score is above 70.
* This helps the team know who to focus on first.

3️⃣ Nurturing — Follow Up

* You can select multiple leads and create follow-up tasks (like calls or emails).
* Example: Create a 3-step drip of follow-ups over a few days.
* Tasks are stored in the database using /api/tasks.
* Later, this can be expanded to send automated emails.

4️⃣ Conversion — Turn Leads Into Customers

* Once a lead is ready, you can convert them into a Contact and a Deal (a sales opportunity).
* The backend automatically:
* Creates a new Contact and Deal record.
* Removes the original lead from the leads table.
* This moves the lead into the Sales Pipeline.

5️⃣ Analytics — See Results

* View overall marketing performance:
* Total leads
* Hot leads
* Converted leads
* Conversion rate (%)
* Also see top campaigns by number of leads generated.

#### Sample Data (use for frontend walkthroughs)

* **Campaigns**

  * *Launch Sprint 2025* — Stage: Active · Budget: ₹85,000 · Duration: 01 Apr – 30 Apr · Goal: promote new product features.
  * *Webinar Series Q2* — Stage: Planned · Budget: ₹45,000 · Duration: 10 May – 24 May · Goal: capture leads via weekly webinars.
  * *Festive Cashback Promo* — Stage: Completed · Budget: ₹1,10,000 · Duration: 01 Dec – 20 Dec (last year) · Leads generated: 420.
* **Leads**

  * *Aarav Sharma* — Email: [aarav@techverse.in](mailto:aarav@techverse.in) · Phone: +91 98765 43120 · Source: Website · Linked Campaign: Launch Sprint 2025 · Lead stage: Contacted · Score: 45.
  * *Priya Menon* — Email: [priya.menon@finedge.co](mailto:priya.menon@finedge.co) · Phone: +91 98220 77551 · Source: Webinar · Linked Campaign: Webinar Series Q2 · Lead stage: New · Score: 20.
  * *Rahul Goyal* — Email: [rahul@retailworks.in](mailto:rahul@retailworks.in) · Phone: +91 98110 22345 · Source: Referral · Linked Campaign: Festive Cashback Promo · Lead stage: Qualified · Score: 72 (marked Hot).
  * *Sneha Kulkarni* — Email: [sneha@creativesutra.com](mailto:sneha@creativesutra.com) · Phone: +91 98980 11334 · Source: Email · Linked Campaign: Launch Sprint 2025 · Lead stage: Lost · Score: 30.
  * *Mohan Rao* — Email: [mohan.rao@buildsmart.in](mailto:mohan.rao@buildsmart.in) · Phone: +91 97030 44221 · Source: Event · Linked Campaign: Webinar Series Q2 · Lead stage: Contacted · Score: 55.

## 2. Sales Management

* Sales Pipeline Dashboard:

  * Visual Kanban board for deal stages
  * Move deals across stages (e.g., “New,” “In Progress,” “Closed”)
* Backend logic to track deal progress

Example : A rep adds a new lead for a customer interested in a 3BHK flat → schedules a visit → marks it as “In Progress” → closes the deal → system updates the pipeline and revenue reports automatically.

### 3. Customer Service

* Ticket Management System:

  * Create, assign, and update support tickets
  * Ticket statuses: “Open,” “In Progress,” “Resolved”

Example: A customer reports a missing package → ticket auto-created → support team assigns it to “Agent John” → John contacts the delivery partner → marks it as “Resolved” → system emails the customer the resolution.

### 4. Collaboration Tools

* Notes & Comments: Add notes on contact or deal pages
* Task Assignment: Assign follow-up actions to specific users

Example: The project manager adds a note on a client deal: “Client approved Facebook ad campaign; start by Friday.” → The designer gets an assigned task automatically → team tracks it to completion.

---

## 📊 Phase 4 (Days 15–18): Data Analysis & UX Improvements

### 1. Data Visualization

* Sales Reports:

  * Bar or pie chart showing deals per pipeline stage
* Activity Feed:
* Show recent user actions (“John added a new deal,” etc.)

### 2. UX Enhancements

* Responsive Design: Mobile and tablet optimization
* Search Functionality: Global search bar for contacts, leads, or deals
* Onboarding:

  * Simple walkthrough or tooltips for new users

---

## 🚀 Phase 5 (Days 19–20): Testing & Deployment

### 1. Functionality Testing

* Validate every CRUD function
* Ensure pipeline movements and task assignments work correctly

### 2. Usability Testing

* Have a new tester use the system without guidance
* Gather and apply feedback for UI improvements

### 3. Deployment ( for testing )

* Frontend Hosting: Vercel / Netlify
* Backend Hosting: Render
* Database: PostgreSQL on Render or Supabase

### 4. Final Review

* Code cleanup and documentation
* Basic security validation
* Ensure scalability for post-MVP expansion

---

## ⚙️ Recommended Tech Stack

| Layer      | Technology           | Purpose                |
| ---------- | -------------------- | ---------------------- |
| Frontend   | React + Tailwind CSS | UI development         |
| Backend    | Node.js + Express    | API server             |
| Database   | MySQL                | Data storage           |
| Auth       | JWT (JSON Web Token) | Secure login & session |
| Charts     | Recharts or Chart.js | Visual reports         |
| Deployment | From Company         | (For Testing Render)   |

---

## 🧩 Deliverables by Day 20

✅ Functional CRM MVP with:

* User login & authentication
* Contacts & Leads Management
* Sales Pipeline Dashboard
* Task & Ticket Tracking
* Analytics Dashboard
* Notes, Comments, and Collaboration
* Fully responsive UI

Total Time Duration - 20 Days



* **Database rebuild**

  * **Recreate `campaigns`** using the updated block in

    crm-backend/src/sql/schema.sql.
  * **Revise `leads` DDL** before running it: include desired columns (`firstName`, `lastName`, `email`, `phone`, `company`, `jobTitle`, `industry`, `region`, `source`, `campaignId`, `stage`, `score`,

    autoAssign, timestamps, owner FK, etc.). Update

    schema.sql accordingly, then execute the `CREATE TABLE leads (...)` statement.
  * **Recreate dependent tables** (`activities`, others) and add foreign keys (`leads.campaignId → campaigns.id`, `activities.leadId → leads.id`). Re-enable FK checks afterwards.
* **Backend updates**

  * **Models** : extend `crm-backend/src/models/Lead.js` to match the new schema (fields, enums, default values) and hook `Lead.belongsTo(User, { foreignKey: 'ownerId' })`.
  * **Controllers/services** (`leadController`, any service layer): accept new payload fields, validate optional `campaignId`, and implement the round-robin/auto-assign logic when

    autoAssign is true (pick next user, set `ownerId`).
  * **Analytics** : ensure

  analyticsController.getSummary maps the new lead attributes (stage, score) if needed.
* **Frontend alignment**

  * **Campaign form** (

    crm-frontend/src/pages/Marketing/CampaignList.jsx): add inputs for the new campaign fields (objective, channel, owner select, currency/budget, planned leads, status/priority).
  * **Lead form** (

    LeadList.jsx): include the expanded fields, enforce `campaignId` dropdown, add “Auto-assign sales rep” checkbox that posts `autoAssign: true`.
  * Update API calls to send/receive the richer campaign and lead objects.
* **Reseed & verify**

  * After backend/frontend changes, seed a few campaigns and leads to confirm round-robin assignment, analytics totals, and UI rendering.
  * Run the app end-to-end (create campaign → add lead with auto-assign) to validate workflow.


* **Database rebuild**

  * **Recreate `campaigns`** using the updated block in

    crm-backend/src/sql/schema.sql.
  * **Revise `leads` DDL** before running it: include desired columns (`firstName`, `lastName`, `email`, `phone`, `company`, `jobTitle`, `industry`, `region`, `source`, `campaignId`, `stage`, `score`,

    autoAssign, timestamps, owner FK, etc.). Update

    schema.sql accordingly, then execute the `CREATE TABLE leads (...)` statement.
  * **Recreate dependent tables** (`activities`, others) and add foreign keys (`leads.campaignId → campaigns.id`, `activities.leadId → leads.id`). Re-enable FK checks afterwards.
* **Backend updates**

  * **Models** : extend `crm-backend/src/models/Lead.js` to match the new schema (fields, enums, default values) and hook `Lead.belongsTo(User, { foreignKey: 'ownerId' })`.
  * **Controllers/services** (`leadController`, any service layer): accept new payload fields, validate optional `campaignId`, and implement the round-robin/auto-assign logic when

    autoAssign is true (pick next user, set `ownerId`).
  * **Analytics** : ensure

  analyticsController.getSummary maps the new lead attributes (stage, score) if needed.
* **Frontend alignment**

  * **Campaign form** (

    crm-frontend/src/pages/Marketing/CampaignList.jsx): add inputs for the new campaign fields (objective, channel, owner select, currency/budget, planned leads, status/priority).
  * **Lead form** (

    LeadList.jsx): include the expanded fields, enforce `campaignId` dropdown, add “Auto-assign sales rep” checkbox that posts `autoAssign: true`.
  * Update API calls to send/receive the richer campaign and lead objects.
* **Reseed & verify**

  * After backend/frontend changes, seed a few campaigns and leads to confirm round-robin assignment, analytics totals, and UI rendering.
  * Run the app end-to-end (create campaign → add lead with auto-assign) to validate workflow.
