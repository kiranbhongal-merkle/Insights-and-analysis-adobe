# Samsung Analytics Dashboard

A React webapp for Adobe Analytics data from BigQuery.  
Built for Samsung RHQ — row-level journey analysis · USD-normalised revenue.

**Live BigQuery table:** `vdc200006-mena-eng-dev.RHQ_INSIGHTS.User_Journey_Analysis_Adobe`

---

## Features

- **Analysis pages**: Overview, Funnel, Device, Page Exits, Country, User Type, Competitor Device, Last Touch, Custom Report, Glossary
- **BigQuery live connection** via server-side `/api/dashboard` on Cloud Run (no tokens in the browser)
- **Demo mode** — bundled CSV fallback when the API is unavailable locally
- **PowerPoint export** of all pages, charts and insights
- **Dark / light mode** toggle

---

## Local Development

```bash
npm install

# Terminal A — backend on :8080 (BigQuery via Application Default Credentials)
npm run server

# Terminal B — React dev server on :3000 (proxies /api → :8080)
npm start
```

Without the backend, the app loads `public/demo_data/Test_new.csv`.

Copy `.env.example` to `.env` to override BigQuery settings locally.

---

## GCP Deployment (Cloud Run)

See **[DEPLOY.md](DEPLOY.md)** for the full guide (one-time setup, IAM, rollback, Windows PowerShell).

```bash
gcloud config set project vdc200006-mena-eng-dev
gcloud builds submit --config cloudbuild.yaml
```

Or on Windows:

```powershell
.\deploy.ps1
```

The runtime service account `user-journey@PROJECT.iam.gserviceaccount.com` needs `roles/bigquery.dataViewer` and `roles/bigquery.jobUser` on the project/dataset.

---

## Data Flow

```
BigQuery (vdc200006-mena-eng-dev.RHQ_INSIGHTS.User_Journey_Analysis_Adobe)
    ↓ server/bigquery.js
GET /api/dashboard
    ↓ loadLiveData.js → buildDemoDataFromRows()
React pages (Recharts visualisations)
```

---

## Project Structure

```
server/
  index.js          — Express: static build + /api/dashboard
  bigquery.js       — BigQuery query (column list + date filter)
src/
  App.js            — Router, live/demo data loading
  utils/
    loadDemoCsv.js  — CSV schema + aggregation pipeline
    loadLiveData.js — Fetches /api/dashboard
  pages/            — One page per analysis
Dockerfile          — Multi-stage build for Cloud Run
cloudbuild.yaml     — Build, push, deploy pipeline
DEPLOY.md           — GCP setup and rollback
```

---

## Customisation

### Add a new data field

1. Add the column to `User_Journey_Analysis_Adobe` in BigQuery.
2. Add the column name to `COLUMNS` in `server/bigquery.js`.
3. Map it in `src/utils/loadDemoCsv.js` if needed for charts/KPIs.

### Update FX rates

Edit `FX_RATES` in `src/config/bigquery.js`.
