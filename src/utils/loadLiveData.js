// ============================================================
// Live data loader
// ------------------------------------------------------------
// Fetches row-level rows from /api/dashboard (same origin on
// Cloud Run) and feeds them through the demo CSV aggregation
// pipeline so live and demo data render identically.
// ============================================================

import { buildDemoDataFromRows, EMPTY_DASHBOARD_DATA } from './loadDemoCsv';

/** Initialise window data shell before first render (prevents hardcoded demo flash). */
export function initBigQueryOnlyMode() {
  if (typeof window === 'undefined') return;
  window.__DATA_SOURCE__ = 'bigquery';
  window.__DEMO_CSV_RAW__ = [];
  window.__DEMO_DATA__ = { ...EMPTY_DASHBOARD_DATA };
  window.__OVERVIEW_SUMMARY__ = EMPTY_DASHBOARD_DATA.__overviewSummary;
}

function clearLiveData() {
  if (typeof window === 'undefined') return;
  window.__DATA_SOURCE__ = 'bigquery';
  window.__DEMO_CSV_RAW__ = [];
  window.__DEMO_DATA__ = { ...EMPTY_DASHBOARD_DATA };
  window.__OVERVIEW_SUMMARY__ = EMPTY_DASHBOARD_DATA.__overviewSummary;
}

/**
 * Load live BigQuery data for a date range and inject it onto window.
 * @param {{from?: string, to?: string}} range
 */
export async function loadLiveData({ from, to } = {}) {
  if (typeof window === 'undefined') return { loaded: false, reason: 'no-window' };

  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  let res;
  try {
    res = await fetch(`/api/dashboard?${params.toString()}`, { cache: 'no-store' });
  } catch {
    clearLiveData();
    return { loaded: false, reason: 'network-error' };
  }

  if (!res.ok) {
    clearLiveData();
    return { loaded: false, reason: `request-failed:${res.status}` };
  }

  const payload = await res.json();
  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  window.__DATA_SOURCE__ = 'bigquery';
  window.__DEMO_CSV_RAW__ = rows;

  const built = buildDemoDataFromRows(rows, { dateFrom: from, dateTo: to });
  window.__DEMO_DATA__ = built;
  window.__OVERVIEW_SUMMARY__ = built.__overviewSummary ?? EMPTY_DASHBOARD_DATA.__overviewSummary;

  return { loaded: true, count: rows.length, empty: rows.length === 0 };
}
