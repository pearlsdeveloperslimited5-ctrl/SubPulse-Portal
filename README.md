# SubPulse Multi-Module Business Portal

This directory contains the clean, fully-functioning codebase of the **SubPulse Business Portal** (including Subscriptions, Sales CRM, Helpdesk/IT Tickets, and Accounting modules).

---

## 📁 Project Structure

```text
subpulse-portal/
│
├── public/                 # Static Assets (Frontend)
│   ├── index.html          # Main HTML structure, layout, modules, and modals
│   ├── app.js              # Frontend logic, event handling, metric computations, and API sync
│   ├── style.css           # Styling system (custom dark theme, layouts, responsive rules)
│   └── favicon.png         # Portal favicon
│
├── .htaccess               # Apache routing rules (routes /api/* to api.php, secures json database)
├── api.php                 # PHP REST API router (handles routing, CORS, method tunneling, and requests)
├── backend.php             # Core backend library (contains DB read/write, email alerts, and helper functions)
├── cron.php                # Automated alert script (triggered daily via cron to check due payments)
├── database.json           # JSON database file (contains user credentials, subscriptions, logs, and settings)
└── README.md               # Setup and reference documentation (this file)
```

---

## 🚀 Key Modules & Features

### 1. 📅 Subscription Tracker
* Automated upcoming payment tracking and spending summaries.
* Multi-currency cost aggregates calculated dynamically.
* Payment confirmation log tracker.

### 2. 📊 Sales CRM
* Stage Kanban Board (**New** ➔ **Contacted** ➔ **Proposal** ➔ **Negotiation** ➔ **Closed Won** ➔ **Closed Lost**).
* Drag-and-drop opportunity cards.
* Deal capture modal with live commission previews.
* Performance forecasts, agent leaderboards, and monthly summaries.

### 🛠️ 3. IT Helpdesk Tickets
* SLA prioritization countdown timer:
  * **Critical:** 4 hours SLA
  * **High:** 12 hours SLA
  * **Medium:** 24 hours SLA
  * **Low:** 72 hours SLA
* Drag-and-drop ticket status boards.
* Customer Satisfaction (CSAT) 5-star rating feedback system on ticket resolution.

### 💼 4. Accounting & Double-Entry Bookkeeping
* Split company selectors: **Consolidated Group** | **Pearls Developers Limited** | **Pearls IT**.
* Automated double-entry ledger journal postings for invoices and expense bills.
* Bank statement matching & reconciliation interface.
* Full reporting suite: P&L Statement, Balance Sheet, Cash Flow, Trial Balance, and Aged Debtors.

---

## 🔧 Database Configuration

The system uses a server-locked JSON database (`database.json`). The default admin user credentials are:
* **Username:** `hammad` (or `admin`)
* **Password:** `Well2025%%%%%%`

Direct public downloads of `database.json` and `backend.php` are blocked by `.htaccess` rules for security.

---

## ⏰ Cron Job Setup (Reminder Emails)

Set up a daily cron job in your cPanel dashboard:
* **Interval:** Once Per Day (`0 0 * * *`)
* **Command:**
  ```bash
  /usr/local/bin/php /home/p140338/public_html/tracker.pearls-developers-limited.co.uk/cron.php >/dev/null 2>&1
  ```

---

## 💻 Running the Project

1. **Local Server:**
   You can run this project locally on any server with PHP support (e.g. XAMPP, MAMP, or the built-in PHP server):
   ```bash
   php -S localhost:8000
   ```
2. **Production Server:**
   Upload all files in this directory to your cPanel `public_html/` or a subdirectory root using FTP. It runs instantly on standard Apache PHP hosting.
