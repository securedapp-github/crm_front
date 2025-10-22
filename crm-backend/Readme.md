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
