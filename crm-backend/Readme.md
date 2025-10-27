JWT Token Creation :-

**# Generate 64 random hex chars for JWT_SECRET**
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate another for SESSION_SECRET

node **-**e **"console.log(require('crypto').randomBytes(32).toString('hex'))"**

## Lead Automatic Flow hmm its correct ?

## 🧩 Step 1 — The Goal

They want:

> When a lead enters the system, it should automatically get assigned, moved, and acted upon **without manual intervention.**

So, the automation points are:

| Stage                                    | What Should Happen Automatically                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **1️⃣ Campaign → Lead Capture** | When a campaign runs, any incoming lead (from website form / ad / import) should be created automatically and linked to the campaign |
| **2️⃣ Lead Assignment**          | As soon as a lead is created, it should automatically assign to a sales rep (based on region, source, round-robin, etc.)             |
| **3️⃣ Lead Progression**         | If lead status or time condition changes, move to next stage (e.g., “Contacted” → “Qualified”) automatically                    |
| **4️⃣ Notifications**            | Send alerts or reminders to reps (email / dashboard / Slack, etc.)                                                                   |
| **5️⃣ Sync to Pipeline**         | Once a lead is marked as “Qualified,” it should automatically create a**Deal record**in the Sales Pipeline                   |

---



Here are five fresh campaign configs you can plug into the **Add Campaign** modal—each one is unique and includes every field from the form:

| Field                            | Campaign 1                             | Campaign 2                                          | Campaign 3                          | Campaign 4                                   | Campaign 5                                    |
| -------------------------------- | -------------------------------------- | --------------------------------------------------- | ----------------------------------- | -------------------------------------------- | --------------------------------------------- |
| **Name**                   | Quantum Pulse Launch                   | Apex Retention Surge                                | Horizon Sync Tour                   | NovaPulse Ignite                             | Summit Elevate Series                         |
| **Campaign code**          | QP-PLS-26                              | ARS-Q4-25                                           | HS-Tour-25                          | NP-IGNITE-26                                 | SES-Global-25                                 |
| **Objective**              | Product Launch                         | Retention                                           | Awareness                           | Lead Gen                                     | Product Launch                                |
| **Channel**                | Multi-channel                          | Email                                               | Event                               | Paid Ads                                     | Social Media                                  |
| **Audience segment**       | Enterprise                             | Mid-market                                          | Enterprise                          | SMB                                          | Mid-market                                    |
| **Product line**           | Quantum Suite                          | Apex Support Cloud                                  | Horizon Services                    | NovaPulse Platform                           | Summit Collaboration                          |
| **Budget**                 | 140000                                 | 68000                                               | 95000                               | 52000                                        | 78000                                         |
| **Expected spend**         | 132000                                 | 64000                                               | 87000                               | 50000                                        | 76000                                         |
| **Currency**               | USD                                    | USD                                                 | USD                                 | USD                                          | USD                                           |
| **Start date**             | 2026-02-01                             | 2025-10-05                                          | 2025-07-10                          | 2026-03-18                                   | 2025-11-12                                    |
| **End date**               | 2026-04-30                             | 2025-12-28                                          | 2025-09-15                          | 2026-06-20                                   | 2026-02-28                                    |
| **Campaign stage**         | Active                                 | Planned                                             | Active                              | Planned                                      | Active                                        |
| **Priority**               | High                                   | Medium                                              | Low                                 | Medium                                       | High                                          |
| **External campaign ID**   | QP-ALPHA-26                            | APEX-RET-25                                         | HZ-SYNC-25                          | NP-LEAD-26                                   | SUMMIT-ELV-25                                 |
| **UTM source**             | webinar                                | lifecycle                                           | roadshow                            | google                                       | linkedin                                      |
| **UTM medium**             | live-event                             | drip                                                | partner                             | cpc                                          | sponsored                                     |
| **UTM campaign**           | quantum-pulse-launch                   | apex-retention-surge                                | horizon-sync-tour                   | novapulse-ignite                             | summit-elevate-series                         |
| **Compliance checklist**   | Messaging reviewed, opt-out & GDPR OK. | Legal approval logged; unsubscribe footer verified. | Venue privacy + opt-in forms ready. | Ad creatives cleared; cookie banner enabled. | Social disclosures & policy review completed. |
| **Company name**           | Quantum Dynamic Labs                   | ApexWave Software                                   | HorizonSync Global                  | NovaPulse Systems                            | SummitOne Tech                                |
| **Company domain**         | quantumdynamiclabs.com                 | apexwave.io                                         | horizonsyncglobal.com               | novapulse.ai                                 | summitone.tech                                |
| **Is already a customer?** | ✅                                     | ❌                                                  | ❌                                  | ✅                                           | ❌                                            |

Just enter each column’s values into the modal fields and save; they’ll appear in your campaign list and drive the new dashboard/pipeline metrics.
