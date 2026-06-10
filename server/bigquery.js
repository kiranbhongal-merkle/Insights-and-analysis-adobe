// ============================================================
// Server-side BigQuery access
// ------------------------------------------------------------
// Runs parameterized queries against BigQuery using the Cloud Run
// service account (Application Default Credentials / Workload
// Identity) — no OAuth tokens ever touch the browser.
//
// The query returns ROW-LEVEL daily rows in the SAME schema as the
// demo CSV (see src/utils/loadDemoCsv.js). The client then reuses the
// existing aggregation pipeline, so demo and live behave identically.
//
// To add / change data fields in future you only need to:
//   1. add the column to the table/view in BigQuery, and
//   2. add its name to COLUMNS below (+ map it client-side if needed).
// ============================================================

const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT = process.env.BQ_PROJECT || 'vdc200006-mena-eng-dev';
const DATASET = process.env.BQ_DATASET || 'RHQ_INSIGHTS';
const TABLE = process.env.BQ_TABLE || 'User_Journey_Analysis';
const LOCATION = process.env.BQ_LOCATION || 'US';
const ROW_LIMIT = Number(process.env.BQ_ROW_LIMIT || 200000);

const bq = new BigQuery({ projectId: PROJECT });

const FQ_TABLE = `\`${PROJECT}.${DATASET}.${TABLE}\``;

// Columns expected by the dashboard (must match the demo CSV schema).
const COLUMNS = [
  'date',
  'traffic_source',
  'last_touch_channel',
  'user_type',
  'country',
  'device_category',
  'manufacturer',
  'visits',
  'users',
  'reached_landing',
  'reached_pdp',
  'reached_atc',
  'reached_cart',
  'reached_checkout',
  'converted',
  'cart_added',
  'orders',
  'purchases',
  'bounced_visits',
  'total_pageviews',
  'units_sold',
  'revenue_usd',
  'session_count',
  'top_exit_page',
  'top_exit_page_count',
];

/**
 * Fetch row-level daily rows filtered by an (optional) date range.
 * @param {{from?: string, to?: string}} range  ISO dates (YYYY-MM-DD)
 * @returns {Promise<object[]>}
 */
async function getRows({ from, to } = {}) {
  const query = `
    SELECT ${COLUMNS.join(',\n           ')}
    FROM ${FQ_TABLE}
    WHERE (@from IS NULL OR date >= DATE(@from))
      AND (@to   IS NULL OR date <= DATE(@to))
    ORDER BY date
    LIMIT @rowLimit`;

  const [rows] = await bq.query({
    query,
    params: { from: from || null, to: to || null, rowLimit: ROW_LIMIT },
    types: { from: 'STRING', to: 'STRING', rowLimit: 'INT64' },
    location: LOCATION,
  });

  // BigQuery returns DATE columns as { value: 'YYYY-MM-DD' }; normalize to string.
  return rows.map((r) => {
    const date = r.date && typeof r.date === 'object' && 'value' in r.date ? r.date.value : r.date;
    return { ...r, date };
  });
}

module.exports = {
  getRows,
  config: { PROJECT, DATASET, TABLE, LOCATION },
};
