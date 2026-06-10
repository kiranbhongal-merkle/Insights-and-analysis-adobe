# Samsung Analytics Dashboard

A React webapp for Adobe Analytics data from BigQuery.  
Built for Samsung RHQ — Jan–May 2026 · 10 analyses · USD-normalised revenue.

---

## Features

- **10 analysis pages**: KPI, Funnel, Channel, Device, Page Exits, Country, User Type, Browser, Last Touch, Currency
- **Custom Report Builder**: select any metrics + dimensions, choose chart type, add filters, save reports
- **Edit / add / remove** metrics and dimensions from any report
- **BigQuery live connection** via OAuth2 token (or automatic on GCP via workload identity)
- **USD revenue normalisation** with editable FX rates in Settings
- **Dark / light mode** toggle
- **GCP App Engine deployment** — one command

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm start
# Opens http://localhost:3000

# 3. Connect to BigQuery (optional — demo data works offline)
# In Settings, paste: gcloud auth print-access-token
```

---

## GCP Deployment

```bash
# 1. Build production bundle
npm run build

# 2. Deploy to App Engine
gcloud app deploy

# Your app will be live at:
# https://vdc200007-samsung-rhq-prod.appspot.com
```

### BigQuery Access on GCP

When running on App Engine, authentication is automatic — no token needed.

Grant BigQuery access to the App Engine service account:

```bash
gcloud projects add-iam-policy-binding vdc200007-samsung-rhq-prod \
  --member="serviceAccount:vdc200007-samsung-rhq-prod@appspot.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"
```

---

## Data Flow

```
BigQuery (vdc200006-mena-eng-dev.RHQ_INSIGHTS.User_journey_Analysis_Adobe*)
    ↓ REST API (BigQuery Jobs REST API)
React App (useBigQuery hook)
    ↓ 
Recharts visualisations
```

The `useBigQuery` hook in `src/hooks/useBigQuery.js` handles all BQ queries.
In demo mode (no token), the app uses `src/utils/helpers.js → SAMPLE_DATA`.

---

## Project Structure

```
src/
  config/
    bigquery.js       — Project ID, FX rates, analysis metadata
  hooks/
    useBigQuery.js    — BigQuery REST API hook + SQL builders
  utils/
    helpers.js        — Formatters, sample data, chart colors
  components/
    Charts.jsx        — Recharts wrappers (KPI, HBar, VBar, Donut, Line)
  pages/
    OverviewPage.jsx  — KPI summary + trends
    FunnelPage.jsx    — Funnel drop-off analysis
    ChannelPage.jsx   — Channel conversion
    DevicePage.jsx    — Device abandonment
    ExitsPage.jsx     — Page exit analysis
    CountryPage.jsx   — Country performance
    UserTypePage.jsx  — New vs returning
    BrowserPage.jsx   — Browser performance
    LastTouchPage.jsx — Last-touch attribution
    CurrencyPage.jsx  — Currency split
    CustomReportPage.jsx — Report builder (add/edit/remove)
    SettingsPage.jsx  — BQ connection, FX rates, deploy guide
  App.js              — Router, sidebar, topbar, global context
  App.css             — Global styles (dark/light theme)
app.yaml              — GCP App Engine config
```

---

## Customisation

### Add a new analysis page

1. Add the analysis code to `src/config/bigquery.js → ANALYSES`
2. Add metric labels to `ANALYSIS_METRIC_LABELS`
3. Create `src/pages/MyNewPage.jsx`
4. Add a route + nav item in `src/App.js`

### Update FX rates

Go to **Settings → Currency Exchange Rates**, edit the rates, and copy the generated SQL into your BigQuery query.

### Add a custom report

Go to **Custom Report → New report**, select:
- Analysis (data source)
- Metrics (up to 4)
- Chart type
- Date range
- Filters

---

## SQL Query

The full BigQuery SQL (v3 with USD normalisation) is in:
`User_journey_Analysis_Adobe`

Run it in BigQuery and save results to a table for faster dashboard queries:

```sql
CREATE OR REPLACE TABLE `vdc200007-samsung-rhq-prod.3_adobe.analytics_results`
AS (
  -- paste the full v3 query here
);
```

Then schedule this query to run daily via BigQuery Scheduled Queries.
