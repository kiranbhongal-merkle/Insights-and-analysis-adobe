// ============================================================
// Live data loader
// ------------------------------------------------------------
// Fetches row-level rows from /api/dashboard (same origin on
// Cloud Run) and feeds them through the demo CSV aggregation
// pipeline so live and demo data render identically.
// ============================================================

import { buildDemoDataFromRows } from './loadDemoCsv';
import { OVERVIEW_SUMMARY } from './helpers';

/**
 * Load live BigQuery data for a date range and inject it onto window.
 * @param {{from?: string, to?: string}} range
 */
export async function loadLiveData({ from, to } = {}) {
  if (typeof window === 'undefined') return { loaded: false, reason: 'no-window' };

  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const res = await fetch(`/api/dashboard?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    return { loaded: false, reason: `request-failed:${res.status}` };
  }

  const payload = await res.json();
  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  window.__DEMO_CSV_RAW__ = rows;

  const built = buildDemoDataFromRows(rows, { dateFrom: from, dateTo: to });
  window.__DEMO_DATA__ = built;
  window.__OVERVIEW_SUMMARY__ = built.__overviewSummary ?? OVERVIEW_SUMMARY;

  return { loaded: true, count: rows.length };
}
