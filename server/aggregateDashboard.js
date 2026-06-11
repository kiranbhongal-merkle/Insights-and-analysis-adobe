// ============================================================
// Server-side dashboard aggregation (BigQuery SQL)
// ------------------------------------------------------------
// Runs grouped queries in BigQuery and returns the same dataset
// shapes the React app expects (kpi, funnel, channel, …).
// Avoids shipping row-level data to the browser.
// ============================================================

const { runQuery, FQ_TABLE, config } = require('./bigquery');

const DATE_FILTER = '(@from IS NULL OR date >= DATE(@from)) AND (@to IS NULL OR date <= DATE(@to))';
const DATE_PARAMS = { from: 'STRING', to: 'STRING' };

function num(v) {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(n) {
  return parseFloat(Number(n).toFixed(2));
}

function convRate(visits, conv) {
  return visits > 0 ? round2((conv / visits) * 100) : 0;
}

function toConvRows(rows, { limit = 14, sumExtra = true } = {}) {
  const mapped = (rows || [])
    .filter((r) => r.dim != null && String(r.dim).trim() !== '')
    .map((r) => ({
      dim: String(r.dim),
      visits: num(r.visits),
      conv: num(r.conv),
      rate: convRate(num(r.visits), num(r.conv)),
      rev: Math.round(num(r.rev)),
      sess: 0,
    }))
    .sort((a, b) => b.visits - a.visits);

  if (mapped.length <= limit || !sumExtra) return mapped;

  const head = mapped.slice(0, limit);
  const tail = mapped.slice(limit);
  const other = tail.reduce(
    (acc, r) => {
      acc.visits += r.visits;
      acc.conv += r.conv;
      acc.rev += r.rev;
      return acc;
    },
    { visits: 0, conv: 0, rev: 0 },
  );

  return [
    ...head,
    {
      dim: `Other (${tail.length})`,
      visits: other.visits,
      conv: other.conv,
      rate: convRate(other.visits, other.conv),
      rev: other.rev,
      sess: 0,
    },
  ];
}

function buildFunnel(steps) {
  return steps.map((s, i) => {
    if (i === 0) return { ...s, dropoff: null };
    const prev = steps[i - 1].visitors || 0;
    const drop = prev > 0 ? round2(((prev - s.visitors) / prev) * 100) : null;
    return {
      ...s,
      dropoff: drop == null ? null : Math.max(0, Math.min(99.9, drop)),
    };
  });
}

const EMPTY_DASHBOARD = {
  __overviewSummary: { visits: 0, conv: 0, rate: 0, rev: 0, aov: 0, sess: 0 },
  kpi: [],
  funnel: [],
  channel: [],
  lasttouch: [],
  usertype: [],
  country: [],
  browser: [],
  device: [],
  exits: [],
};

async function dimQuery(dimensionSql, params) {
  return runQuery(
    `SELECT ${dimensionSql} AS dim,
            SUM(visits) AS visits,
            SUM(converted) AS conv,
            SUM(revenue_usd) AS rev
     FROM ${FQ_TABLE}
     WHERE ${DATE_FILTER}
     GROUP BY dim
     HAVING dim IS NOT NULL AND TRIM(CAST(dim AS STRING)) != ''`,
    params,
    DATE_PARAMS,
  );
}

/**
 * @param {{from?: string, to?: string}} range
 * @returns {Promise<object>}
 */
async function getAggregatedDashboard({ from, to } = {}) {
  const params = { from: from || null, to: to || null };

  const [
    overviewRows,
    kpiRows,
    channelRows,
    lasttouchRows,
    usertypeRows,
    countryRows,
    browserRows,
    deviceRows,
    exitRows,
  ] = await Promise.all([
    runQuery(
      `SELECT
         SUM(visits) AS visits,
         SUM(converted) AS conv,
         SUM(revenue_usd) AS rev,
         SUM(session_count) AS sess_cnt,
         SUM(reached_landing) AS f_landing,
         SUM(reached_pdp) AS f_pdp,
         SUM(reached_atc) AS f_atc,
         SUM(reached_checkout) AS f_checkout,
         SUM(converted) AS f_purchase
       FROM ${FQ_TABLE}
       WHERE ${DATE_FILTER}`,
      params,
      DATE_PARAMS,
    ),
    runQuery(
      `SELECT
         date,
         SUM(visits) AS visits,
         SUM(converted) AS conv,
         SUM(revenue_usd) AS rev,
         SUM(session_count) AS sess_cnt
       FROM ${FQ_TABLE}
       WHERE ${DATE_FILTER}
       GROUP BY date
       ORDER BY date`,
      params,
      DATE_PARAMS,
    ),
    dimQuery('traffic_source', params),
    dimQuery('last_touch_channel', params),
    dimQuery('user_type', params),
    dimQuery('country', params),
    dimQuery('manufacturer', params),
    runQuery(
      `SELECT
         device_category AS dim,
         SUM(visits) AS visits,
         SUM(converted) AS conv,
         SUM(revenue_usd) AS rev
       FROM ${FQ_TABLE}
       WHERE ${DATE_FILTER}
       GROUP BY dim
       HAVING dim IS NOT NULL AND TRIM(CAST(dim AS STRING)) != ''`,
      params,
      DATE_PARAMS,
    ),
    runQuery(
      `SELECT
         COALESCE(NULLIF(TRIM(top_exit_page), ''), '(not set)') AS label,
         SUM(top_exit_page_count) AS exits,
         SUM(visits) AS pv
       FROM ${FQ_TABLE}
       WHERE ${DATE_FILTER}
       GROUP BY label
       ORDER BY exits DESC
       LIMIT 15`,
      params,
      DATE_PARAMS,
    ),
  ]);

  const o = overviewRows[0] || {};
  const tVisits = num(o.visits);
  if (!tVisits) return { ...EMPTY_DASHBOARD };

  const tConv = num(o.conv);
  const tRev = num(o.rev);

  const overviewSummary = {
    visits: tVisits,
    conv: tConv,
    rate: convRate(tVisits, tConv),
    rev: Math.round(tRev),
    aov: tConv > 0 ? Math.round(tRev / tConv) : 0,
    sess: 0,
  };

  const kpi = kpiRows.map((r) => {
    const visits = num(r.visits);
    const conv = num(r.conv);
    const rev = num(r.rev);
    return {
      date: r.date,
      visits,
      conversions: conv,
      conv_rate: convRate(visits, conv),
      revenue: Math.round(rev),
      aov: conv > 0 ? Math.round(rev / conv) : 0,
      avg_session: 0,
    };
  });

  const funnel = buildFunnel([
    { step: 'Landing Page', visitors: num(o.f_landing) },
    { step: 'Product Detail Page', visitors: num(o.f_pdp) },
    { step: 'Add to Cart', visitors: num(o.f_atc) },
    { step: 'Checkout', visitors: num(o.f_checkout) },
    { step: 'Purchase', visitors: num(o.f_purchase) },
  ]);

  const device = deviceRows
    .map((r) => {
      const visits = num(r.visits);
      const purch = num(r.conv);
      return {
        dim: String(r.dim),
        visits,
        purch,
        rate: convRate(visits, purch),
        abandon: visits > 0 ? round2(100 - (purch / visits) * 100) : null,
      };
    })
    .sort((a, b) => b.visits - a.visits);

  const exits = exitRows.map((r) => {
    const exitsN = num(r.exits);
    const pv = num(r.pv);
    return {
      label: String(r.label),
      exits: exitsN,
      pv,
      rate: pv > 0 ? parseFloat(((exitsN / pv) * 100).toFixed(1)) : 0,
    };
  });

  return {
    __overviewSummary: overviewSummary,
    kpi,
    funnel,
    channel: toConvRows(channelRows),
    lasttouch: toConvRows(lasttouchRows),
    usertype: toConvRows(usertypeRows, { sumExtra: false }),
    country: toConvRows(countryRows),
    browser: toConvRows(browserRows),
    device,
    exits,
  };
}

module.exports = {
  getAggregatedDashboard,
  EMPTY_DASHBOARD,
  config,
};
