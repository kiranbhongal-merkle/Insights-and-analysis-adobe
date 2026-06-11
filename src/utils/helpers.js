export function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(0) + 'K';
  return Math.round(n).toLocaleString();
}

export function fmtUSD(n) {
  if (n == null) return '—';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3)  return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(n).toLocaleString();
}

export function fmtPct(n) {
  if (n == null) return '—';
  return parseFloat(n).toFixed(2) + '%';
}

export function dropoffColor(pct) {
  if (pct > 70) return '#dc2626';
  if (pct > 40) return '#d97706';
  return '#16a34a';
}

const EXCLUDED_FUNNEL_STEPS = new Set(['Product Listing Page', 'Cart View']);

/**
 * Funnel used for reporting/drill-down.
 * We exclude steps that don’t add analysis value, and recompute drop-off %
 * between the remaining consecutive steps.
 */
export function getEffectiveFunnel() {
  const raw = SAMPLE_DATA.funnel || [];
  const filtered = raw.filter(s => !EXCLUDED_FUNNEL_STEPS.has(s.step));

  return filtered.map((s, i) => {
    if (i === 0) return { ...s, dropoff: null };
    const prev = filtered[i - 1]?.visitors ?? 0;
    const curr = s.visitors ?? 0;
    if (!prev) return { ...s, dropoff: null };
    const pct = ((prev - curr) / prev) * 100;
    const rounded = parseFloat(pct.toFixed(2));
    return { ...s, dropoff: Math.max(0, Math.min(99.9, rounded)) };
  });
}

export const CHART_COLORS = [
  '#3266ad','#e8913a','#27ae60','#c0392b',
  '#8e44ad','#16a085','#d35400','#2980b9',
  '#f39c12','#7f8c8d','#1abc9c','#e74c3c',
];

// Sample data for demo mode (when BigQuery is not connected)
const DEFAULT_SAMPLE_DATA = {
  kpi: [
    { date:'2026-01-01', visits:302958, conversions:498, conv_rate:0.16, revenue:361960744, aov:726829, avg_session:2.32 },
    { date:'2026-01-08', visits:395481, conversions:759, conv_rate:0.19, revenue:553268434, aov:728944, avg_session:2.60 },
    { date:'2026-01-15', visits:366551, conversions:592, conv_rate:0.16, revenue:530571705, aov:896237, avg_session:2.53 },
    { date:'2026-01-22', visits:404505, conversions:680, conv_rate:0.17, revenue:617640267, aov:908295, avg_session:2.64 },
    { date:'2026-01-29', visits:393547, conversions:677, conv_rate:0.17, revenue:628882375, aov:929070, avg_session:2.62 },
    { date:'2026-02-05', visits:386302, conversions:731, conv_rate:0.19, revenue:669454491, aov:915806, avg_session:2.66 },
    { date:'2026-02-12', visits:371025, conversions:683, conv_rate:0.18, revenue:633022492, aov:926826, avg_session:2.55 },
    { date:'2026-02-19', visits:394571, conversions:743, conv_rate:0.19, revenue:689044012, aov:927382, avg_session:2.58 },
    { date:'2026-02-26', visits:381073, conversions:661, conv_rate:0.17, revenue:613133703, aov:927585, avg_session:2.59 },
    { date:'2026-03-05', visits:392270, conversions:729, conv_rate:0.19, revenue:679296398, aov:931818, avg_session:2.61 },
    { date:'2026-03-12', visits:389680, conversions:694, conv_rate:0.18, revenue:648552726, aov:934514, avg_session:2.58 },
    { date:'2026-03-19', visits:398120, conversions:710, conv_rate:0.18, revenue:662450183, aov:933028, avg_session:2.59 },
  ],
  funnel: [
    { step:'Landing Page',        visitors:48463325, dropoff:null },
    { step:'Product Listing Page', visitors:37930,   dropoff:99.9 },
    { step:'Product Detail Page',  visitors:1829902, dropoff:null },
    { step:'Cart View',            visitors:1261350, dropoff:31.1 },
    { step:'Checkout',             visitors:527076,  dropoff:58.2 },
    { step:'Purchase',             visitors:80881,   dropoff:84.7 },
  ],
  channel: [
    { dim:'epp shop',  visits:308928,  conv:15469, rate:5.01, rev:485623400 },
    { dim:'shop',      visits:1817850, conv:73974, rate:4.07, rev:185341200 },
    { dim:'smb shop',  visits:11190,   conv:310,   rate:2.77, rev:12300000  },
    { dim:'undefined', visits:1787846, conv:4445,  rate:0.25, rev:9800000   },
    { dim:'offer',     visits:997355,  conv:982,   rate:0.10, rev:7200000   },
    { dim:'support',   visits:8365591, conv:5047,  rate:0.06, rev:6900000   },
    { dim:'search',    visits:1185038, conv:674,   rate:0.06, rev:1200000   },
    { dim:'home',      visits:4301060, conv:1009,  rate:0.02, rev:900000    },
  ],
  device: [
    { dim:'Desktop', visits:47594082, purch:80282, rate:0.17, abandon:99.83 },
    { dim:'Tablet',  visits:869243,   purch:599,   rate:0.07, abandon:99.93 },
  ],
  usertype: [
    { dim:'Returning', visits:21278968, conv:62030, rate:0.29, rev:695000000, sess:2.79 },
    { dim:'New',       visits:27184357, conv:18851, rate:0.07, rev:85000000,  sess:2.38 },
  ],
  browser: [
    { dim:'Chrome 145.0',      visits:9511566, conv:15776, rate:0.17, rev:82341322 },
    { dim:'Samsung B. 29.0',   visits:6502784, conv:5286,  rate:0.08, rev:62345000 },
    { dim:'Chrome 146.0',      visits:6167063, conv:9235,  rate:0.15, rev:47351046 },
    { dim:'Safari',            visits:3343869, conv:7004,  rate:0.21, rev:28450000 },
    { dim:'Chrome 144.0',      visits:5061572, conv:6893,  rate:0.14, rev:48836290 },
    { dim:'Samsung B.',        visits:1379900, conv:9292,  rate:0.67, rev:12000000 },
  ],
  lasttouch: [
    { dim:'Session Refresh',   visits:1284535,  conv:4921,  rate:0.38, rev:295000000 },
    { dim:'Natural Search',    visits:10692186, conv:22097, rate:0.21, rev:180000000 },
    { dim:'Mobile Application',visits:5141987,  conv:1467,  rate:0.03, rev:120000000 },
    { dim:'Direct',            visits:8540954,  conv:15137, rate:0.18, rev:98000000  },
    { dim:'Pmax',              visits:1577431,  conv:5137,  rate:0.33, rev:42000000  },
    { dim:'Email',             visits:420000,   conv:2520,  rate:0.60, rev:18000000  },
  ],
  country: [
    { dim:'ind', visits:748538,  conv:3094,  rate:0.41, rev:420000000 },
    { dim:'sau', visits:9506317, conv:16709, rate:0.18, rev:285000000 },
    { dim:'jor', visits:1484956, conv:2671,  rate:0.18, rev:198000000 },
    { dim:'tur', visits:5127379, conv:18935, rate:0.37, rev:142000000 },
    { dim:'gbr', visits:287337,  conv:563,   rate:0.20, rev:96000000  },
    { dim:'isr', visits:697923,  conv:2139,  rate:0.31, rev:78000000  },
    { dim:'egy', visits:5591008, conv:8950,  rate:0.16, rev:45000000  },
    { dim:'pak', visits:6507338, conv:8071,  rate:0.12, rev:38000000  },
  ],
  exits: [
    { label:'n_africa:mobile',                exits:2005802, pv:3011367, rate:66.6 },
    { label:'eg:mobile',                      exits:1070626, pv:1655908, rate:64.7 },
    { label:'n_africa:mobile:galaxy s:g…',    exits:1830179, pv:4389783, rate:41.7 },
    { label:'sa_en:mobile:galaxy s:gala…',    exits:1451037, pv:4223276, rate:34.4 },
    { label:'pk:mobile',                      exits:1030936, pv:2169985, rate:47.5 },
    { label:'il:mobile',                      exits:422764,  pv:689256,  rate:61.3 },
    { label:'sa:mobile:galaxy s:galaxy-…',    exits:1379536, pv:4971771, rate:27.7 },
    { label:'sa_en:mobile:audio:finder',      exits:654606,  pv:1117762, rate:58.6 },
  ],
};

/**
 * Active demo data can be injected at runtime (e.g. from CSV).
 * Pages import `SAMPLE_DATA` and will transparently read the injected dataset.
 */
function getInjectedDemoData() {
  if (typeof window === 'undefined') return null;
  return window.__DEMO_DATA__ || null;
}

export const SAMPLE_DATA = new Proxy(DEFAULT_SAMPLE_DATA, {
  get(target, prop) {
    const injected = getInjectedDemoData();
    if (injected && Object.prototype.hasOwnProperty.call(injected, prop) && injected[prop] !== undefined) {
      return injected[prop];
    }
    return target[prop];
  },
});

/** Overview summary totals (demo mode). */
export const OVERVIEW_SUMMARY = {
  visits: 48463325, conv: 80881, rate: 0.17,
  rev: 780000000, aov: 9644, sess: 2.56,
};

/** Active overview summary (respects date filter when applied). */
export function getOverviewSummary() {
  if (typeof window !== 'undefined' && window.__OVERVIEW_SUMMARY__) {
    return window.__OVERVIEW_SUMMARY__;
  }
  return OVERVIEW_SUMMARY;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDateRangeLabel(from, to) {
  const fmt = (d) => {
    if (!d) return '';
    const [y, m] = d.split('-');
    return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
  };
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Until ${fmt(to)}`;
  return 'All dates';
}

/**
 * Site-wide KPI totals from A5_KPI_SUMMARY Overall rows only.
 * Do not sum channel/market dimensions — they overlap and duplicate Overall.
 */
export function computeOverviewFromA5Overall(rows) {
  if (!rows?.length) return null;

  let visits = 0;
  let conv = 0;
  let rev = 0;
  let sessWeighted = 0;

  for (const row of rows) {
    const rowVisits = row.visits ?? row.metric_1 ?? 0;
    const rowConv = row.conversions ?? row.conv ?? row.metric_2 ?? 0;
    const rowRev = row.revenue ?? row.rev ?? row.metric_4 ?? 0;
    const rowSess = row.avg_session ?? row.sess ?? row.metric_6 ?? 0;
    visits += Number(rowVisits) || 0;
    conv += Number(rowConv) || 0;
    rev += Number(rowRev) || 0;
    sessWeighted += (Number(rowSess) || 0) * (Number(rowVisits) || 0);
  }

  return {
    visits,
    conv,
    rate: visits > 0 ? parseFloat(((conv / visits) * 100).toFixed(2)) : 0,
    rev,
    aov: conv > 0 ? Math.round(rev / conv) : 0,
    sess: visits > 0 ? parseFloat((sessWeighted / visits).toFixed(2)) : 0,
  };
}

function scaleMetricRow(row, fields, ratio) {
  const next = { ...row };
  for (const f of fields) {
    if (next[f] != null && typeof next[f] === 'number') {
      next[f] = Math.max(0, Math.round(next[f] * ratio));
    }
  }
  return next;
}

/** Filter hardcoded demo data when CSV is not loaded. */
export function buildFilteredDefaultData(dateFrom, dateTo) {
  const inRange = (date) => {
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    return true;
  };

  const allKpi = DEFAULT_SAMPLE_DATA.kpi || [];
  const kpi = allKpi.filter(r => inRange(r.date));
  const totalVisits = allKpi.reduce((s, r) => s + r.visits, 0);
  const filteredVisits = kpi.reduce((s, r) => s + r.visits, 0);
  const ratio = totalVisits > 0 ? filteredVisits / totalVisits : 1;

  const scaleConvRow = (row) => {
    const next = scaleMetricRow(row, ['visits', 'conv', 'conversions', 'purch', 'rev', 'revenue', 'exits', 'pv', 'visitors'], ratio);
    const visits = next.visits ?? next.visitors ?? next.pv;
    const conv = next.conv ?? next.conversions ?? next.purch;
    if (visits > 0 && conv != null && next.rate != null) {
      next.rate = parseFloat(((conv / visits) * 100).toFixed(2));
    }
    return next;
  };

  const data = {
    kpi,
    funnel: (DEFAULT_SAMPLE_DATA.funnel || []).map(r => scaleMetricRow(r, ['visitors'], ratio)),
    channel: (DEFAULT_SAMPLE_DATA.channel || []).map(scaleConvRow),
    device: (DEFAULT_SAMPLE_DATA.device || []).map(scaleConvRow),
    usertype: (DEFAULT_SAMPLE_DATA.usertype || []).map(scaleConvRow),
    browser: (DEFAULT_SAMPLE_DATA.browser || []).map(scaleConvRow),
    lasttouch: (DEFAULT_SAMPLE_DATA.lasttouch || []).map(scaleConvRow),
    country: (DEFAULT_SAMPLE_DATA.country || []).map(scaleConvRow),
    exits: (DEFAULT_SAMPLE_DATA.exits || []).map(r => {
      const next = scaleMetricRow(r, ['exits', 'pv'], ratio);
      if (next.pv > 0) next.rate = parseFloat(((next.exits / next.pv) * 100).toFixed(1));
      return next;
    }),
  };

  return {
    data,
    overviewSummary: computeOverviewFromA5Overall(kpi) ?? { ...OVERVIEW_SUMMARY },
  };
}

/** Dimension labels for KPI drill-down selector. */
export const DRILL_DIMENSION_META = {
  channel:   { label: 'Entry page channel', dimKey: 'dim' },
  lasttouch: { label: 'Last touch channel', dimKey: 'dim' },
  device:    { label: 'Device type',        dimKey: 'dim' },
  usertype:  { label: 'User type',          dimKey: 'dim' },
  browser:   { label: 'Device manufacturer', dimKey: 'dim' },
  country:   { label: 'Country',            dimKey: 'dim' },
  kpi:       { label: 'Week',               dimKey: 'date' },
};

/** Per-KPI drill-down: dimensions, default slice, primary metric extractor. */
export const KPI_DRILL_CONFIG = {
  visits: {
    dimensions: ['channel', 'lasttouch', 'device', 'usertype', 'browser', 'country'],
    defaultDimension: 'channel',
    primaryLabel: 'Visits',
    formatPrimary: fmtNum,
    primaryField: r => r.visits ?? r.visitors,
  },
  conv: {
    dimensions: ['channel', 'lasttouch', 'device', 'usertype', 'browser', 'country'],
    defaultDimension: 'channel',
    primaryLabel: 'Conversions',
    formatPrimary: v => (v == null ? '—' : Number(v).toLocaleString()),
    primaryField: r => r.conv ?? r.conversions ?? r.purch,
  },
  rate: {
    dimensions: ['channel', 'lasttouch', 'device', 'usertype', 'browser', 'country'],
    defaultDimension: 'lasttouch',
    primaryLabel: 'Conv rate',
    formatPrimary: fmtPct,
    primaryField: r => r.rate ?? r.conv_rate,
  },
  rev: {
    dimensions: ['channel', 'lasttouch', 'country', 'usertype', 'browser'],
    defaultDimension: 'channel',
    primaryLabel: 'Revenue (USD)',
    formatPrimary: fmtUSD,
    primaryField: r => r.rev ?? r.revenue,
  },
  aov: {
    dimensions: ['channel', 'lasttouch', 'country', 'usertype', 'kpi'],
    defaultDimension: 'country',
    primaryLabel: 'Avg order value',
    formatPrimary: fmtUSD,
    primaryField: r => {
      if (r.aov != null) return r.aov;
      const conv = r.conv ?? r.conversions ?? r.purch;
      const rev = r.rev ?? r.revenue;
      return conv > 0 && rev != null ? Math.round(rev / conv) : null;
    },
  },
  sess: {
    dimensions: ['usertype', 'device', 'kpi'],
    defaultDimension: 'usertype',
    primaryLabel: 'Avg session (min)',
    formatPrimary: v => (v == null ? '—' : `${parseFloat(v).toFixed(2)}m`),
    primaryField: r => r.sess ?? r.avg_session,
  },
  exits: {
    dimensions: ['channel', 'lasttouch', 'country', 'device', 'browser', 'usertype'],
    defaultDimension: 'channel',
    primaryLabel: 'Exits',
    formatPrimary: fmtNum,
    primaryField: r => r.exits,
  },
  exit_rate: {
    dimensions: ['channel', 'lasttouch', 'country', 'device', 'browser'],
    defaultDimension: 'country',
    primaryLabel: 'Exit rate',
    formatPrimary: fmtPct,
    primaryField: r => r.rate,
  },
  abandon: {
    dimensions: ['channel', 'lasttouch', 'country', 'usertype', 'browser'],
    defaultDimension: 'channel',
    primaryLabel: 'Abandonment %',
    formatPrimary: v => (v == null ? '—' : `${parseFloat(v).toFixed(2)}%`),
    primaryField: r => r.abandon,
  },
};

/** Analysis pages: primary dataset per route. */
export const ANALYSIS_SOURCE_META = {
  device:    { sourceId: 'device',    title: 'Device',             field: 'dim' },
  usertype:  { sourceId: 'usertype',  title: 'User type',          field: 'dim' },
  country:   { sourceId: 'country',   title: 'Country',            field: 'dim' },
  browser:   { sourceId: 'browser',   title: 'Competitor Device',  field: 'dim' },
  lasttouch: { sourceId: 'lasttouch', title: 'Last touch channel', field: 'dim' },
  exits:     { sourceId: 'exits',     title: 'Exit page',          field: 'label' },
};

export const CROSS_DRILL_DIMENSIONS = [
  'channel', 'lasttouch', 'country', 'device', 'usertype', 'browser',
];

export function getDrillTargetsForSource(sourceId) {
  return CROSS_DRILL_DIMENSIONS.filter(id => id !== sourceId && SAMPLE_DATA[id]?.length);
}

/** Segment totals within one analysis dataset (not site-wide — use getOverviewSummary for that). */
export function getDatasetSummary(datasetKey) {
  const rows = SAMPLE_DATA[datasetKey];
  if (!rows?.length) return { visits: 0, conv: 0, rev: 0, rate: 0 };
  const visits = rows.reduce((s, r) => s + (r.visits ?? r.visitors ?? r.pv ?? 0), 0);
  const conv = rows.reduce((s, r) => s + (r.conv ?? r.conversions ?? r.purch ?? 0), 0);
  const rev = rows.reduce((s, r) => s + (r.rev ?? r.revenue ?? 0), 0);
  const rate = visits > 0 ? parseFloat(((conv / visits) * 100).toFixed(2)) : 0;
  return { visits, conv, rev, rate };
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) - h) + str.charCodeAt(i);
  return Math.abs(h);
}

function pathContextKey(path = []) {
  return path.map(p => `${p.dimensionId}:${p.segmentName}`).join('>');
}

/** Demo-model affinity: how much a row belongs to the current drill path. */
function pathRowAffinity(row, dimensionId, path = [], contextKey = '') {
  if (!path?.length) return 1;
  const rowLabel = dimensionLabel(row, dimensionId);
  let mult = 1;
  for (const step of path) {
    const h = hashStr(`${contextKey}|${step.dimensionId}|${step.segmentName}|${dimensionId}|${rowLabel}`);
    mult *= 0.28 + (h % 72) / 100;
    const stepLabel = String(step.segmentName).toLowerCase();
    const label = String(rowLabel).toLowerCase();
    if (label.includes(stepLabel) || stepLabel.includes(label)) mult *= 1.35;
  }
  return mult;
}

export function getDrillPathSummary(path = []) {
  if (!path?.length) return null;
  const last = path[path.length - 1];
  return {
    depth: path.length,
    lastDimension: DRILL_DIMENSION_META[last.dimensionId]?.label ?? last.dimensionId,
    lastSegment: last.segmentName,
  };
}

export function findSourceRow(sourceId, segmentName) {
  const rows = SAMPLE_DATA[sourceId];
  if (!rows) return null;
  return rows.find(r => String(r.dim ?? r.label ?? r.step) === String(segmentName));
}

/** Cross-dimension breakdown for a clicked segment (conserves the segment total). */
export function buildSegmentDrilldown(sourceId, segmentName, targetDimId, metricKey, path = []) {
  const sourceRow = findSourceRow(sourceId, segmentName);
  const config = KPI_DRILL_CONFIG[metricKey];
  if (!sourceRow || !config) return [];

  // Seed the walk with the clicked page segment's full metric bundle.
  const base = rowBundle(sourceRow);
  const rootBundle = deriveBundle(base);
  rootBundle.exits = base.exits;
  rootBundle.primary = metricPrimary(metricKey, rootBundle, config, sourceRow);
  if (rootBundle.primary == null || Number.isNaN(rootBundle.primary)) return [];

  const incoming = walkToIncoming(metricKey, path, config, { rootBundle });
  if (!incoming) return [];

  const ctx = `${metricKey}|${sourceId}:${segmentName}|${pathContextKey(path)}`;
  const dist = distributeBundle(metricKey, targetDimId, incoming, path, ctx, config);

  const mapped = dist
    .map(d => ({
      dimension: d.label,
      primary: d.bundle.primary,
      visits: d.bundle.visits,
      conv: d.bundle.conv,
      rate: d.bundle.rate,
      rev: d.bundle.rev,
    }))
    .filter(r => r.primary != null && !Number.isNaN(r.primary));

  return withContribPct(mapped, metricKey).sort((a, b) => (b.primary ?? 0) - (a.primary ?? 0));
}

export function getSegmentDrillInsights(sourceId, segmentName, metricKey, rows, targetDimLabel) {
  const config = KPI_DRILL_CONFIG[metricKey];
  const sourceRow = findSourceRow(sourceId, segmentName);
  const insights = [];
  const top = rows[0];
  const meta = ANALYSIS_SOURCE_META[sourceId];

  if (top) {
    insights.push({
      title: `${top.dimension} leads within ${segmentName}`,
      body: `${config?.formatPrimary(top.primary)} (${top.contribPct.toFixed(1)}% of ${config?.primaryLabel ?? metricKey} for this ${meta?.title ?? 'segment'}), viewed through ${targetDimLabel}.`,
      severity: top.contribPct >= 20 ? 'amber' : 'green',
    });
  }

  if (sourceRow?.rate != null && metricKey === 'rate') {
    const sev = sourceRow.rate < 0.1 ? 'red' : sourceRow.rate >= 0.3 ? 'green' : 'amber';
    insights.push({
      title: `${segmentName} conv rate benchmark`,
      body: `This segment converts at ${fmtPct(sourceRow.rate)}. Compare against site average 0.17% and optimise checkout for under-performing ${targetDimLabel} slices.`,
      severity: sev,
    });
  }

  if (sourceId === 'lasttouch' && /mobile application/i.test(segmentName)) {
    insights.push({
      title: 'App handoff likely culprit',
      body: 'Mobile Application last-touch underperforms — validate deep links, cookie persistence, and in-app browser checkout.',
      severity: 'red',
    });
  }

  if (sourceId === 'browser' && /apple/i.test(segmentName)) {
    insights.push({
      title: 'Competitor device traffic',
      body: 'Apple-device visitors may be comparison shopping — tailor messaging and retargeting for cross-device conversion.',
      severity: 'amber',
    });
  }

  if (sourceId === 'exits' && sourceRow?.rate >= 60) {
    insights.push({
      title: 'Critical exit rate',
      body: `${fmtPct(sourceRow.rate)} of pageviews exit from this path — add recovery banners, simplified nav, and monitor Core Web Vitals on top ${targetDimLabel} contributors.`,
      severity: 'red',
    });
  }

  return insights.slice(0, 3);
}

function dimensionLabel(row, dimensionId) {
  const meta = DRILL_DIMENSION_META[dimensionId];
  if (!meta) return '—';
  const raw = row[meta.dimKey] ?? row.dim ?? row.label ?? row.step;
  if (raw == null) return '—';
  if (dimensionId === 'kpi' && typeof raw === 'string' && raw.length >= 10) {
    return raw.slice(5);
  }
  return String(raw);
}

// ── Conserving drill-down attribution ─────────────────────────
// When a segment is drilled into, its metrics are distributed across
// the child dimension so the breakdown reconciles back to the parent
// at every level (e.g. Desktop 713K → child segments sum to 713K).
// Each additive metric (visits/conv/rev) is shared by its own
// value×affinity weight; ratio metrics (rate/aov/session) and the
// primary value are re-derived from the conserved sums.

const ADDITIVE_PRIMARY = new Set(['visits', 'conv', 'rev', 'exits']);
const RATE_LIKE_PRIMARY = new Set(['rate', 'exit_rate']);

function r2(n) {
  return parseFloat(Number(n).toFixed(2));
}

function rowBundle(row) {
  const isExitRow = row.exits != null && row.pv != null;
  return {
    visits: Number(row.visits ?? row.visitors ?? (isExitRow ? row.pv : 0) ?? 0) || 0,
    conv: Number(row.conv ?? row.conversions ?? row.purch ?? 0) || 0,
    rev: Number(row.rev ?? row.revenue ?? 0) || 0,
    exits: Number(row.exits ?? 0) || 0,
    exitRate: row.rate != null ? Number(row.rate) : null,
    sess: row.sess ?? row.avg_session ?? null,
    abandon: row.abandon != null ? Number(row.abandon) : null,
  };
}

function deriveBundle(b) {
  const rate = b.exitRate != null
    ? Number(b.exitRate)
    : (b.visits > 0 ? r2((b.conv / b.visits) * 100) : null);
  return {
    ...b,
    rate,
    aov: b.conv > 0 ? Math.round(b.rev / b.conv) : null,
  };
}

/** Primary value for a metric given a (conserved) metric bundle + its raw row. */
function metricPrimary(kpiKey, bundle, config, rawRow) {
  switch (kpiKey) {
    case 'rate':
      return rawRow?.rate ?? bundle.rate;
    case 'exit_rate':
      return rawRow?.rate ?? rawRow?.exitRate ?? bundle.rate;
    case 'exits':
      return rawRow?.exits ?? bundle.exits ?? 0;
    case 'aov':
      return bundle.aov;
    case 'sess':
      return bundle.sess;
    case 'abandon':
      return rawRow?.abandon ?? (bundle.visits > 0 ? r2(100 - (bundle.conv / bundle.visits) * 100) : null);
    case 'visits':
      return bundle.visits;
    case 'conv':
      return bundle.conv;
    case 'rev':
      return bundle.rev;
    default:
      return config?.primaryField ? config.primaryField(rawRow ?? bundle) : null;
  }
}

function rootBundleForSegment(dimensionId, segmentName, kpiKey, config) {
  const rows = SAMPLE_DATA[dimensionId] || [];
  const row = rows.find(r => dimensionLabel(r, dimensionId) === String(segmentName));
  if (!row) return null;
  const bundle = deriveBundle(rowBundle(row));
  bundle.primary = metricPrimary(kpiKey, bundle, config, row);
  return bundle;
}

/**
 * Distribute a parent bundle across the rows of `dimensionId`.
 * Returns one entry per child segment whose additive metrics sum back
 * to the parent. `primary` is conserved for additive metrics and
 * re-derived for ratio metrics.
 */
function distributeBundle(kpiKey, dimensionId, parent, path, ctx, config) {
  const targets = SAMPLE_DATA[dimensionId] || [];
  if (!targets.length || !parent) return [];

  const items = targets.map(row => ({
    row,
    label: dimensionLabel(row, dimensionId),
    aff: pathRowAffinity(row, dimensionId, path, ctx),
    b: rowBundle(row),
  }));

  const wSum = (sel) => items.reduce((s, x) => s + sel(x), 0);
  const tV = wSum(x => x.b.visits * x.aff);
  const tC = wSum(x => x.b.conv * x.aff);
  const tR = wSum(x => x.b.rev * x.aff);
  const tE = wSum(x => (x.b.exits ?? 0) * x.aff);
  const tAff = wSum(x => x.aff) || items.length || 1;

  let sessScale = 1;
  if (parent.sess != null) {
    const wAvg = items.reduce((s, x) => {
      const share = tV > 0 ? (x.b.visits * x.aff) / tV : x.aff / tAff;
      return s + (x.b.sess ?? parent.sess) * share;
    }, 0);
    sessScale = wAvg > 0 ? parent.sess / wAvg : 1;
  }

  return items.map(x => {
    const shareV = tV > 0 ? (x.b.visits * x.aff) / tV : x.aff / tAff;
    const shareC = tC > 0 ? (x.b.conv * x.aff) / tC : shareV;
    const shareR = tR > 0 ? (x.b.rev * x.aff) / tR : shareV;
    const shareE = tE > 0 ? ((x.b.exits ?? 0) * x.aff) / tE : shareV;
    const bundle = deriveBundle({
      visits: Math.round(parent.visits * shareV),
      conv: Math.round(parent.conv * shareC),
      rev: Math.round(parent.rev * shareR),
      exits: Math.round((parent.exits ?? 0) * shareE),
      sess: parent.sess != null ? r2((x.b.sess ?? parent.sess) * sessScale) : x.b.sess,
    });

    if (RATE_LIKE_PRIMARY.has(kpiKey)) bundle.primary = bundle.rate;
    else if (kpiKey === 'aov') bundle.primary = bundle.aov;
    else if (kpiKey === 'sess') bundle.primary = bundle.sess;
    else if (kpiKey === 'abandon') bundle.primary = bundle.visits > 0 ? r2(100 - (bundle.conv / bundle.visits) * 100) : null;
    else if (kpiKey === 'visits') bundle.primary = bundle.visits;
    else if (kpiKey === 'conv') bundle.primary = bundle.conv;
    else if (kpiKey === 'rev') bundle.primary = bundle.rev;
    else if (kpiKey === 'exits') bundle.primary = Math.round((parent.exits ?? parent.primary ?? 0) * shareE);
    else bundle.primary = parent.primary != null ? Math.round(parent.primary * shareV) : null;

    return { label: x.label, row: x.row, shareV, bundle };
  });
}

/**
 * Walk the selected drill path to obtain the metric bundle entering the
 * current (deepest) level. When `rootIsTrue`, the first path segment keeps
 * its real value (overview metric drill-down); otherwise `rootBundle` seeds
 * the walk (analysis-page segment drill-down).
 */
function walkToIncoming(kpiKey, path, config, { rootBundle = null, rootIsTrue = false } = {}) {
  if (!path.length) return rootBundle;
  let bundle = rootIsTrue
    ? rootBundleForSegment(path[0].dimensionId, path[0].segmentName, kpiKey, config)
    : rootBundle;
  const startIdx = rootIsTrue ? 1 : 0;
  for (let i = startIdx; i < path.length && bundle; i += 1) {
    const sub = path.slice(0, i);
    const ctx = `${kpiKey}|${pathContextKey(sub)}`;
    const dist = distributeBundle(kpiKey, path[i].dimensionId, bundle, sub, ctx, config);
    const sel = dist.find(d => d.label === String(path[i].segmentName));
    bundle = sel ? sel.bundle : bundle;
  }
  return bundle;
}

function withContribPct(rows, kpiKey) {
  const additive = ADDITIVE_PRIMARY.has(kpiKey);
  if (additive) {
    const totalP = rows.reduce((s, r) => s + (typeof r.primary === 'number' ? r.primary : 0), 0);
    return rows.map(r => ({ ...r, contribPct: totalP > 0 ? (r.primary / totalP) * 100 : 0 }));
  }
  const totalV = rows.reduce((s, r) => s + (r.visits || 0), 0);
  return rows.map(r => ({ ...r, contribPct: totalV > 0 ? ((r.visits || 0) / totalV) * 100 : 0 }));
}

/** Normalized rows for drill-down chart + table (conserves totals across levels). */
export function buildDrilldownData(kpiKey, dimensionId, path = []) {
  const config = KPI_DRILL_CONFIG[kpiKey];
  if (!config) return [];
  const rows = SAMPLE_DATA[dimensionId];
  if (!rows?.length) return [];

  const hasPath = path.length > 0;

  // Level 0 — show real per-segment values (already sum to the root total).
  if (!hasPath) {
    return rows
      .map(row => {
        const bundle = deriveBundle(rowBundle(row));
        return {
          dimension: dimensionLabel(row, dimensionId),
          primary: config.primaryField(row),
          visits: bundle.visits,
          conv: bundle.conv,
          rate: row.rate ?? row.conv_rate ?? bundle.rate,
          rev: bundle.rev,
          sess: bundle.sess,
          aov: row.aov ?? bundle.aov,
        };
      })
      .filter(r => r.primary != null && !Number.isNaN(r.primary))
      .sort((a, b) => (b.primary ?? 0) - (a.primary ?? 0));
  }

  // Drilled — distribute the parent segment's bundle across this dimension.
  const incoming = walkToIncoming(kpiKey, path, config, { rootIsTrue: true });
  if (!incoming) return [];

  const ctx = `${kpiKey}|${pathContextKey(path)}`;
  const dist = distributeBundle(kpiKey, dimensionId, incoming, path, ctx, config);

  const mapped = dist
    .map(d => ({
      dimension: d.label,
      primary: d.bundle.primary,
      visits: d.bundle.visits,
      conv: d.bundle.conv,
      rate: d.bundle.rate,
      rev: d.bundle.rev,
      sess: d.bundle.sess,
      aov: d.bundle.aov,
    }))
    .filter(r => r.primary != null && !Number.isNaN(r.primary));

  return withContribPct(mapped, kpiKey).sort((a, b) => (b.primary ?? 0) - (a.primary ?? 0));
}

/**
 * Aggregate a set of drill-down rows into running totals.
 * Sums additive metrics and derives ratio metrics (rate/aov/session)
 * from the totals so they stay correct at every drill level.
 */
export function aggregateDrillRows(rows = []) {
  let visits = 0;
  let conv = 0;
  let rev = 0;
  let lostSessions = 0;
  let sessWeighted = 0;
  let primarySum = 0;
  let hasPrimary = false;

  for (const r of rows) {
    if (r.visits != null) visits += Number(r.visits) || 0;
    if (r.conv != null) conv += Number(r.conv) || 0;
    if (r.rev != null) rev += Number(r.rev) || 0;
    if (r.lostSessions != null) lostSessions += Number(r.lostSessions) || 0;
    if (r.sess != null && r.visits) sessWeighted += (Number(r.sess) || 0) * (Number(r.visits) || 0);
    if (r.primary != null && Number.isFinite(Number(r.primary))) {
      primarySum += Number(r.primary);
      hasPrimary = true;
    }
  }

  return {
    visits,
    conv,
    rev,
    lostSessions,
    rate: visits > 0 ? parseFloat(((conv / visits) * 100).toFixed(2)) : null,
    aov: conv > 0 ? Math.round(rev / conv) : null,
    sess: visits > 0 && sessWeighted > 0 ? parseFloat((sessWeighted / visits).toFixed(2)) : null,
    primarySum: hasPrimary ? primarySum : null,
  };
}

/**
 * Total value for the "primary" column of a metric drill-down.
 * Additive metrics sum; ratio metrics are recomputed from totals.
 */
export function getDrillPrimaryTotal(rows, metricKey) {
  const t = aggregateDrillRows(rows);
  switch (metricKey) {
    case 'rate':
    case 'exit_rate':
      return t.rate;
    case 'aov':
      return t.aov;
    case 'sess':
      return t.sess;
    case 'abandon':
      return t.visits > 0 ? parseFloat((100 - (t.conv / t.visits) * 100).toFixed(2)) : null;
    case 'exits':
      return t.primarySum;
    default:
      return t.primarySum;
  }
}

/** Dimensions available for funnel drop-off drill-down. */
export const FUNNEL_DRILL_DIMENSIONS = [
  'channel', 'lasttouch', 'country', 'device', 'usertype', 'browser',
];

/** Estimate sessions lost between the previous funnel step and this one. */
export function getFunnelLostSessions(stepName) {
  const funnel = getEffectiveFunnel();
  const idx = funnel.findIndex(f => f.step === stepName);
  if (idx <= 0) return 0;
  const prev = funnel[idx - 1].visitors;
  const curr = funnel[idx].visitors;
  return Math.max(0, prev - curr);
}

function funnelSegmentWeight(row, stepName) {
  const rate = parseFloat(row.rate ?? row.conv_rate ?? 0.1) || 0.1;
  const visits = row.visits ?? row.visitors ?? 0;
  let mult = 1 / Math.max(rate, 0.03);

  const dim = (row.dim ?? row.label ?? '').toLowerCase();
  if (stepName === 'Product Listing Page' && (dim.includes('undefined') || dim === 'home')) mult *= 1.55;
  if (stepName === 'Cart View' && dim.includes('mobile')) mult *= 1.2;
  if (stepName === 'Checkout' && (dim === 'support' || dim.includes('mobile application'))) mult *= 1.45;
  if (stepName === 'Checkout' && dim === 'tablet') mult *= 1.25;
  if (stepName === 'Purchase' && rate < 0.1) mult *= 1.35;
  if (stepName === 'Purchase' && dim.includes('samsung b. 29')) mult *= 1.5;

  return visits * mult;
}

// Distribute a lost-session total across a dimension by funnel weight × affinity.
function distributeFunnelLost(stepName, dimId, incoming, subPath) {
  const dimRows = SAMPLE_DATA[dimId];
  if (!dimRows?.length) return [];
  const ctx = `${stepName}|${pathContextKey(subPath)}`;
  const weighted = dimRows.map(row => ({
    row,
    label: dimensionLabel(row, dimId),
    weight: funnelSegmentWeight(row, stepName) * pathRowAffinity(row, dimId, subPath, ctx),
  }));
  const totalW = weighted.reduce((s, r) => s + r.weight, 0) || 1;
  return weighted.map(w => ({
    ...w,
    share: w.weight / totalW,
    lostSessions: Math.round(incoming * (w.weight / totalW)),
  }));
}

/** Per-segment drop-off attribution for a funnel step (conserves lost sessions per level). */
export function buildFunnelDropoffData(stepName, dimensionId, path = []) {
  const step = getEffectiveFunnel().find(f => f.step === stepName);
  if (!step || step.dropoff == null) return [];

  const dimRows = SAMPLE_DATA[dimensionId];
  if (!dimRows?.length) return [];

  const totalLost = getFunnelLostSessions(stepName);
  if (!totalLost) return [];

  // Walk the path so the current level's total equals the parent segment's lost sessions.
  let incoming = totalLost;
  for (let i = 0; i < path.length; i += 1) {
    const dist = distributeFunnelLost(stepName, path[i].dimensionId, incoming, path.slice(0, i));
    const sel = dist.find(d => d.label === String(path[i].segmentName));
    incoming = sel ? sel.lostSessions : incoming;
  }

  const dist = distributeFunnelLost(stepName, dimensionId, incoming, path);

  return dist
    .map(d => {
      const row = d.row;
      const segDropoff = Math.min(99.9, step.dropoff * (0.75 + d.share * dimRows.length * 0.35));
      return {
        dimension: d.label,
        lostSessions: d.lostSessions,
        contribPct: d.share * 100,
        segDropoff,
        visits: row.visits ?? row.visitors,
        conv: row.conv ?? row.conversions ?? row.purch,
        rate: row.rate ?? row.conv_rate,
        rev: row.rev ?? row.revenue,
      };
    })
    .filter(r => r.lostSessions > 0)
    .sort((a, b) => b.lostSessions - a.lostSessions);
}

const FUNNEL_STEP_INSIGHTS = {
  'Product Listing Page': [
    { match: d => /undefined|home/i.test(d), title: 'Low-intent entry traffic', body: 'Home and undefined channels land on PLP but rarely progress — tighten landing-to-PLP routing and category relevance.', severity: 'red' },
  ],
  'Cart View': [
    { match: d => /new/i.test(d), title: 'New users abandon carts', body: 'First-time visitors lack trust signals at cart — surface delivery, returns, and payment badges above the fold.', severity: 'amber' },
  ],
  'Checkout': [
    { match: d => /support|mobile application/i.test(d), title: 'Support & app → web friction', body: 'These segments show the steepest checkout loss — audit SSO, address autofill, and payment method availability.', severity: 'red' },
    { match: d => /tablet/i.test(d), title: 'Tablet checkout layout', body: 'Tablet drop-off exceeds desktop — validate responsive payment widgets and sticky CTAs.', severity: 'amber' },
  ],
  'Purchase': [
    { match: d => /samsung b\. 29/i.test(d), title: 'Samsung Browser 29 checkout bug', body: 'Anomalously low completion vs other browsers — QA payment SDK on this WebView build.', severity: 'red' },
    { match: d => /returning/i.test(d), title: 'Returning users still leak', body: 'Even loyal users drop at payment — test saved-card flows and OTP latency.', severity: 'amber' },
  ],
};

/** Auto-generated + rule-based insights for the drill-down modal. */
export function getFunnelDropoffInsights(stepName, rows, dimensionLabel) {
  const insights = [];
  const step = getEffectiveFunnel().find(f => f.step === stepName);
  const top = rows[0];
  const runner = rows[1];

  if (top) {
    const sev = top.contribPct >= 22 ? 'red' : top.contribPct >= 12 ? 'amber' : 'green';
    insights.push({
      title: `${top.dimension} — largest drop-off contributor`,
      body: `An estimated ${fmtNum(top.lostSessions)} sessions lost (${top.contribPct.toFixed(1)}% of drop-off at this step) within ${dimensionLabel}. Segment conv rate ${top.rate != null ? fmtPct(top.rate) : 'n/a'} vs step average ${step?.dropoff != null ? step.dropoff + '%' : '—'}.`,
      severity: sev,
    });
  }

  if (runner && runner.contribPct >= 8) {
    insights.push({
      title: `${runner.dimension} — secondary driver`,
      body: `Adds ${fmtNum(runner.lostSessions)} more lost sessions (${runner.contribPct.toFixed(1)}%). Consider paired fixes with ${top?.dimension ?? 'the top segment'}.`,
      severity: 'amber',
    });
  }

  const rules = FUNNEL_STEP_INSIGHTS[stepName] ?? [];
  for (const rule of rules) {
    const hit = rows.find(r => rule.match(r.dimension));
    if (hit) {
      insights.push({ title: rule.title, body: rule.body, severity: rule.severity });
      break;
    }
  }

  if (step?.dropoff > 70) {
    insights.push({
      title: 'Critical step — prioritise in QBR',
      body: `Overall ${step.dropoff}% drop-off is above the 70% critical threshold. Run funnel replay and error-log analysis for the top two ${dimensionLabel} segments first.`,
      severity: 'red',
    });
  }

  return insights.slice(0, 4);
}
