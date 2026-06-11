// ============================================================
// Server-side BigQuery access
// ------------------------------------------------------------
// Runs parameterized aggregation queries against BigQuery using
// the Cloud Run service account (ADC). The dashboard API returns
// pre-aggregated chart data, not row-level exports.
// ============================================================

const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT = process.env.BQ_PROJECT || 'vdc200006-mena-eng-dev';
const DATASET = process.env.BQ_DATASET || 'RHQ_INSIGHTS';
const TABLE = process.env.BQ_TABLE || 'User_Journey_Analysis_Adobe';
const LOCATION = process.env.BQ_LOCATION || 'US';

const bq = new BigQuery({ projectId: PROJECT });

const FQ_TABLE = `\`${PROJECT}.${DATASET}.${TABLE}\``;

function normalizeBqRow(r) {
  const out = { ...r };
  if (out.date && typeof out.date === 'object' && 'value' in out.date) {
    out.date = out.date.value;
  }
  return out;
}

/**
 * Run a parameterized BigQuery SQL statement.
 * @param {string} query
 * @param {Record<string, unknown>} params
 * @param {Record<string, string>} [types]
 */
async function runQuery(query, params = {}, types = {}) {
  const mergedTypes = { from: 'STRING', to: 'STRING', ...types };
  const [rows] = await bq.query({
    query,
    params,
    types: mergedTypes,
    location: LOCATION,
  });
  return rows.map(normalizeBqRow);
}

module.exports = {
  runQuery,
  FQ_TABLE,
  config: { PROJECT, DATASET, TABLE, LOCATION },
};
