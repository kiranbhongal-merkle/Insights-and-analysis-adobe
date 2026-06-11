// ============================================================
// useBigQuery — fetches data from BigQuery REST API
// Uses Google Identity Services for OAuth2 in browser
// On GCP (Cloud Run / App Engine) use workload identity instead
// ============================================================

import { useState, useCallback } from 'react';
import { BQ_CONFIG, BQ_TABLE_FQ } from '../config/bigquery';

const BQ_BASE = `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_CONFIG.projectId}/queries`;

export function useBigQuery() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const query = useCallback(async (sql, token) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(BQ_BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sql,
          useLegacySql: false,
          timeoutMs: 60000,
          location: 'US',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // Parse rows into objects
      const fields = data.schema?.fields || [];
      const rows = (data.rows || []).map(row =>
        Object.fromEntries(
          fields.map((f, i) => [f.name, row.f[i]?.v ?? null])
        )
      );
      return { rows, totalRows: data.totalRows, jobComplete: data.jobComplete };
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { query, loading, error };
}

// ── SQL builder helpers ──────────────────────────────────────

export function buildAnalysisQuery({ analysis, dateFrom, dateTo, limit = 500 }) {
  return `
    SELECT date, analysis, dimension, sort_order,
           metric_1, metric_2, metric_3, metric_4, metric_5, metric_6
    FROM ${BQ_TABLE_FQ}
    WHERE analysis = '${analysis}'
      ${dateFrom ? `AND date >= '${dateFrom}'` : ''}
      ${dateTo   ? `AND date <= '${dateTo}'`   : ''}
    ORDER BY date, sort_order
    LIMIT ${limit}
  `;
}

export function buildCustomQuery({ metrics, dimensions, filters, dateFrom, dateTo, limit = 1000 }) {
  const metricCols  = metrics.join(', ');
  const filterClauses = filters
    .filter(f => f.value)
    .map(f => `${f.field} ${f.op} '${f.value}'`)
    .join(' AND ');

  return `
    SELECT date, dimension, ${metricCols}
    FROM ${BQ_TABLE_FQ}
    WHERE 1=1
      ${dateFrom ? `AND date >= '${dateFrom}'` : ''}
      ${dateTo   ? `AND date <= '${dateTo}'`   : ''}
      ${filterClauses ? `AND ${filterClauses}` : ''}
    ORDER BY date, metric_4 DESC NULLS LAST
    LIMIT ${limit}
  `;
}
