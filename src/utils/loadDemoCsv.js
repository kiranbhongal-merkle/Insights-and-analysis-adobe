// ============================================================
// Demo CSV loader
// ------------------------------------------------------------
// Parses the raw, row-level analytics export shipped in
// /public/demo_data/Test_new.csv and aggregates it into the
// dataset shapes the dashboard pages expect (kpi, funnel,
// channel, device, country, browser, lasttouch,
// usertype, exits + a site-wide overview summary).
//
// Raw CSV columns (Test_new.csv):
//   date, traffic_source, last_touch_channel, user_type, country,
//   device_category, manufacturer, visits, users, reached_landing,
//   reached_pdp, reached_atc, reached_cart, reached_checkout, converted,
//   cart_added, orders, purchases, bounced_visits, total_pageviews,
//   units_sold, revenue_usd, session_count, top_exit_page, top_exit_page_count
//
// Legacy column names (test_data.csv) are still accepted via normalizeRawRow.
// ============================================================

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

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

/** Map new or legacy CSV / API row shapes onto one internal schema. */
export function normalizeRawRow(r) {
  if (!r) return r;
  return {
    date: r.date,
    traffic_source: r.traffic_source,
    last_touch_channel: r.last_touch_channel,
    user_type: r.user_type,
    country: r.country,
    browser: r.browser ?? r.manufacturer,
    device_category: r.device_category,
    visits: num(r.visits),
    users: num(r.users),
    reached_landing: num(r.reached_landing),
    reached_pdp: num(r.reached_pdp),
    reached_atc: num(r.reached_atc),
    reached_cart: num(r.reached_cart),
    reached_checkout: num(r.reached_checkout),
    converted: num(r.converted),
    add_to_cart_events: num(r.add_to_cart_events ?? r.cart_added),
    checkout_events: num(r.checkout_events),
    purchase_events: num(r.purchase_events ?? r.purchases),
    revenue_usd: num(r.revenue_usd),
    total_session_mins: num(r.total_session_mins),
    session_count: num(r.session_count),
    top_exit_page: r.top_exit_page,
    top_exit_page_count: num(r.top_exit_page_count),
    bounced_visits: num(r.bounced_visits),
    total_pageviews: num(r.total_pageviews),
    units_sold: num(r.units_sold),
  };
}

// Aggregate raw rows by a dimension key into running metric buckets.
function aggregateBy(rows, keyFn) {
  const map = new Map();
  for (const r of rows) {
    const key = keyFn(r);
    if (key == null || key === '') continue;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { visits: 0, conv: 0, rev: 0, atc: 0, purch: 0, sessMin: 0, sessCnt: 0 };
      map.set(key, bucket);
    }
    bucket.visits += r.visits;
    bucket.conv += r.converted;
    bucket.rev += r.revenue_usd;
    bucket.atc += r.add_to_cart_events;
    bucket.purch += r.purchase_events;
    bucket.sessMin += r.total_session_mins;
    bucket.sessCnt += r.session_count;
  }
  return map;
}

// Convert an aggregation map to conversion-style rows, keeping the
// top `limit` by visits and bucketing the long tail into "Other".
function toConvRows(map, { limit = 14, sumExtra = true } = {}) {
  const rows = [...map.entries()].map(([dim, b]) => ({
    dim,
    visits: b.visits,
    conv: b.conv,
    rate: convRate(b.visits, b.conv),
    rev: Math.round(b.rev),
    sess: b.sessCnt > 0 ? round2(b.sessMin / b.sessCnt) : 0,
    _atc: b.atc,
    _purch: b.purch,
  }));
  rows.sort((a, b) => b.visits - a.visits);

  if (rows.length <= limit || !sumExtra) {
    return rows.map(({ _atc, _purch, ...r }) => r);
  }

  const head = rows.slice(0, limit);
  const tail = rows.slice(limit);
  const other = tail.reduce(
    (acc, r) => {
      acc.visits += r.visits;
      acc.conv += r.conv;
      acc.rev += r.rev;
      acc.sessW += r.sess * r.visits;
      return acc;
    },
    { visits: 0, conv: 0, rev: 0, sessW: 0 },
  );

  return [
    ...head.map(({ _atc, _purch, ...r }) => r),
    {
      dim: `Other (${tail.length})`,
      visits: other.visits,
      conv: other.conv,
      rate: convRate(other.visits, other.conv),
      rev: other.rev,
      sess: other.visits > 0 ? round2(other.sessW / other.visits) : 0,
    },
  ];
}

/** Empty dashboard shell — used when BigQuery returns no rows (never show hardcoded demo). */
export const EMPTY_DASHBOARD_DATA = {
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

/**
 * Build all dashboard datasets from raw rows, filtered by date range.
 * Returns the object injected onto window.__DEMO_DATA__.
 */
export function buildDemoDataFromRows(rawRows, { dateFrom, dateTo } = {}) {
  const rows = (rawRows || [])
    .map(normalizeRawRow)
    .filter(r => {
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  if (!rows.length) return { ...EMPTY_DASHBOARD_DATA };

  // ── Site-wide overview totals ──────────────────────────────
  let tVisits = 0, tConv = 0, tRev = 0, tSessMin = 0, tSessCnt = 0;
  // ── Funnel step totals ─────────────────────────────────────
  let fLanding = 0, fPdp = 0, fAtc = 0, fCheckout = 0, fPurchase = 0;
  // ── KPI trend by date ──────────────────────────────────────
  const byDate = new Map();

  for (const r of rows) {
    tVisits += r.visits;
    tConv += r.converted;
    tRev += r.revenue_usd;
    tSessMin += r.total_session_mins;
    tSessCnt += r.session_count;

    fLanding += r.reached_landing;
    fPdp += r.reached_pdp;
    fAtc += r.reached_atc;
    fCheckout += r.reached_checkout;
    fPurchase += r.converted;

    let d = byDate.get(r.date);
    if (!d) {
      d = { visits: 0, conv: 0, rev: 0, sessMin: 0, sessCnt: 0 };
      byDate.set(r.date, d);
    }
    d.visits += r.visits;
    d.conv += r.converted;
    d.rev += r.revenue_usd;
    d.sessMin += r.total_session_mins;
    d.sessCnt += r.session_count;
  }

  const overviewSummary = {
    visits: tVisits,
    conv: tConv,
    rate: convRate(tVisits, tConv),
    rev: Math.round(tRev),
    aov: tConv > 0 ? Math.round(tRev / tConv) : 0,
    sess: tSessCnt > 0 ? round2(tSessMin / tSessCnt) : 0,
  };

  const kpi = [...byDate.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([date, d]) => ({
      date,
      visits: d.visits,
      conversions: d.conv,
      conv_rate: convRate(d.visits, d.conv),
      revenue: Math.round(d.rev),
      aov: d.conv > 0 ? Math.round(d.rev / d.conv) : 0,
      avg_session: d.sessCnt > 0 ? round2(d.sessMin / d.sessCnt) : 0,
    }));

  // Monotonic funnel: Landing → PDP → Add to Cart → Checkout → Purchase.
  const funnelSteps = [
    { step: 'Landing Page',        visitors: fLanding },
    { step: 'Product Detail Page', visitors: fPdp },
    { step: 'Add to Cart',         visitors: fAtc },
    { step: 'Checkout',            visitors: fCheckout },
    { step: 'Purchase',            visitors: fPurchase },
  ];
  const funnel = funnelSteps.map((s, i) => {
    if (i === 0) return { ...s, dropoff: null };
    const prev = funnelSteps[i - 1].visitors || 0;
    const drop = prev > 0 ? round2(((prev - s.visitors) / prev) * 100) : null;
    return { ...s, dropoff: drop == null ? null : Math.max(0, Math.min(99.9, drop)) };
  });

  // ── Dimension datasets ─────────────────────────────────────
  const channel = toConvRows(aggregateBy(rows, r => r.traffic_source));
  const lasttouch = toConvRows(aggregateBy(rows, r => r.last_touch_channel));
  const usertype = toConvRows(aggregateBy(rows, r => r.user_type), { sumExtra: false });
  const country = toConvRows(aggregateBy(rows, r => r.country));
  const browser = toConvRows(aggregateBy(rows, r => r.browser));

  const deviceMap = aggregateBy(rows, r => r.device_category);
  const device = [...deviceMap.entries()]
    .map(([dim, b]) => ({
      dim,
      visits: b.visits,
      purch: b.conv,
      rate: convRate(b.visits, b.conv),
      abandon: b.visits > 0 ? round2(100 - (b.conv / b.visits) * 100) : null,
    }))
    .sort((a, b) => b.visits - a.visits);

  // ── Exit pages ─────────────────────────────────────────────
  const exitMap = new Map();
  for (const r of rows) {
    const label = r.top_exit_page && r.top_exit_page.trim() ? r.top_exit_page : '(not set)';
    let e = exitMap.get(label);
    if (!e) { e = { exits: 0, pv: 0 }; exitMap.set(label, e); }
    e.exits += r.top_exit_page_count;
    e.pv += r.visits;
  }
  let exitRows = [...exitMap.entries()].map(([label, e]) => ({
    label,
    exits: e.exits,
    pv: e.pv,
    rate: e.pv > 0 ? parseFloat(((e.exits / e.pv) * 100).toFixed(1)) : 0,
  }));
  exitRows.sort((a, b) => b.exits - a.exits);
  const exits = exitRows.slice(0, 15);

  return {
    __overviewSummary: overviewSummary,
    kpi,
    funnel,
    channel,
    lasttouch,
    usertype,
    country,
    browser,
    device,
    exits,
  };
}

/**
 * Fetch + parse the raw demo CSV and stash normalized rows on window.
 * The actual aggregation happens later (per selected date range) in
 * buildDemoDataFromRows, driven by applyDemoDateRange.
 */
export async function loadDemoCsvIntoWindow({ url = '/demo_data/Test_new.csv' } = {}) {
  if (typeof window === 'undefined') return { loaded: false, reason: 'no-window' };

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return { loaded: false, reason: `fetch-failed:${res.status}` };

  const text = await res.text();
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return { loaded: false, reason: 'empty' };

  const header = parseCsvLine(lines[0]).map(h => h.trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const required = ['date', 'visits'];
  if (required.some(c => idx[c] == null)) {
    return { loaded: false, reason: 'unexpected-schema' };
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    if (!lines[i]) continue;
    const c = parseCsvLine(lines[i]);
    const date = c[idx.date];
    if (!date) continue;

    const raw = {};
    for (const h of header) {
      raw[h] = c[idx[h]];
    }
    raw.date = date;
    rows.push(normalizeRawRow(raw));
  }

  if (!rows.length) return { loaded: false, reason: 'no-rows' };

  window.__DEMO_CSV_RAW__ = rows;
  return { loaded: true, url, count: rows.length };
}
