import { buildDemoDataFromRows } from './loadDemoCsv';
import { buildFilteredDefaultData, OVERVIEW_SUMMARY } from './helpers';

/** Rebuild window demo data for the selected date range (CSV or hardcoded fallback). */
export function applyDemoDateRange(dateFrom, dateTo) {
  if (typeof window === 'undefined') return;

  if (window.__DEMO_CSV_RAW__) {
    const injected = buildDemoDataFromRows(window.__DEMO_CSV_RAW__, { dateFrom, dateTo });
    window.__DEMO_DATA__ = injected;
    window.__OVERVIEW_SUMMARY__ = injected.__overviewSummary ?? OVERVIEW_SUMMARY;
    return;
  }

  const { data, overviewSummary } = buildFilteredDefaultData(dateFrom, dateTo);
  window.__DEMO_DATA__ = data;
  window.__OVERVIEW_SUMMARY__ = overviewSummary;
}
