// ============================================================
// Live data loader
// ------------------------------------------------------------
// Fetches pre-aggregated dashboard data from /api/dashboard
// (BigQuery SQL on the server) and injects it for the UI.
// ============================================================

import { EMPTY_DASHBOARD_DATA } from './loadDemoCsv';

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

  let payload;
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }

  if (!res.ok) {
    clearLiveData();
    return {
      loaded: false,
      reason: `request-failed:${res.status}`,
      message: payload.message || payload.error || null,
    };
  }

  const dashboard = payload.dashboard && typeof payload.dashboard === 'object'
    ? payload.dashboard
    : { ...EMPTY_DASHBOARD_DATA };

  window.__DATA_SOURCE__ = 'bigquery';
  window.__DEMO_CSV_RAW__ = [];
  window.__DEMO_DATA__ = dashboard;
  window.__OVERVIEW_SUMMARY__ = dashboard.__overviewSummary ?? EMPTY_DASHBOARD_DATA.__overviewSummary;

  const visits = dashboard.__overviewSummary?.visits ?? 0;

  return {
    loaded: true,
    empty: Boolean(payload.empty) || visits === 0,
    aggregated: Boolean(payload.aggregated),
  };
}
