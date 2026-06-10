// ============================================================
// Report model collector.
//
// Gathers everything currently shown on the web app — KPI
// summaries, per-page datasets, charts and the auto-generated
// insights — into one structured model. Reused by the
// PowerPoint export so the deck always matches what the user
// sees on screen (it reads the same date-filtered SAMPLE_DATA).
// ============================================================

import {
  SAMPLE_DATA,
  getOverviewSummary,
  getEffectiveFunnel,
  getDatasetSummary,
  formatDateRangeLabel,
  fmtNum,
  fmtUSD,
  fmtPct,
} from './helpers';
import {
  buildOverviewInsights,
  buildFunnelInsights,
  buildDeviceInsights,
  buildExitsInsights,
  buildSegmentInsights,
} from './insights';

const num = (v) => (v == null ? '' : Number(v).toLocaleString());

// PowerPoint number-format codes used for native chart data labels.
const FMT = {
  COUNT: '#,##0',
  PCT: '0.0"%"',
  USD: '$#,##0',
};

/** Overview KPI cards (mirrors OverviewPage). */
function overviewSection() {
  const s = getOverviewSummary();
  const kpi = SAMPLE_DATA.kpi || [];

  return {
    id: 'overview',
    title: 'Overview',
    kpis: [
      { label: 'Total Visits', value: fmtNum(s.visits) },
      { label: 'Conversions', value: num(s.conv) },
      { label: 'Conv Rate', value: `${s.rate}%` },
      { label: 'Revenue (USD)', value: fmtUSD(s.rev) },
      { label: 'Avg Order', value: fmtUSD(s.aov) },
      { label: 'Avg Session', value: `${s.sess}m` },
    ],
    insights: buildOverviewInsights(s, SAMPLE_DATA),
    chart: {
      title: 'Weekly visits',
      type: 'bar', barDir: 'col', fmtCode: FMT.COUNT,
      labels: kpi.map(r => String(r.date).slice(5)),
      values: kpi.map(r => r.visits),
    },
    chart2: {
      title: 'Weekly revenue (USD)',
      type: 'area', barDir: 'col', fmtCode: FMT.USD,
      labels: kpi.map(r => String(r.date).slice(5)),
      values: kpi.map(r => r.revenue),
    },
    table: {
      title: 'Weekly KPI trend',
      columns: ['Week', 'Visits', 'Conv rate', 'Revenue (USD)'],
      rows: kpi.map(r => [
        String(r.date).slice(5),
        fmtNum(r.visits),
        `${r.conv_rate}%`,
        fmtUSD(r.revenue),
      ]),
    },
  };
}

/** Funnel steps + drop-off (mirrors FunnelPage). */
function funnelSection() {
  const funnel = getEffectiveFunnel();
  return {
    id: 'funnel',
    title: 'Conversion Funnel',
    kpis: [],
    insights: buildFunnelInsights(funnel),
    chart: {
      title: 'Drop-off % at each step',
      type: 'bar', barDir: 'col', fmtCode: FMT.PCT,
      labels: funnel.filter(f => f.dropoff != null).map(f => f.step),
      values: funnel.filter(f => f.dropoff != null).map(f => f.dropoff),
    },
    chart2: {
      title: 'Sessions reaching each step',
      type: 'bar', barDir: 'bar', fmtCode: FMT.COUNT,
      labels: funnel.map(f => f.step),
      values: funnel.map(f => f.visitors),
    },
    table: {
      title: 'Funnel steps',
      columns: ['Step', 'Sessions', 'Drop-off'],
      rows: funnel.map(r => [
        r.step,
        fmtNum(r.visitors),
        r.dropoff == null ? '—' : `${r.dropoff}%`,
      ]),
    },
  };
}

/** Generic segment dataset { dim, visits, conv, rate, rev }. */
function segmentSection({ id, title, datasetKey, noun, nounPlural, insights }) {
  const data = SAMPLE_DATA[datasetKey] || [];
  const summary = getDatasetSummary(datasetKey);
  return {
    id,
    title,
    kpis: [
      { label: 'Total Visits', value: fmtNum(summary.visits) },
      { label: 'Conversions', value: num(summary.conv) },
      { label: 'Conv Rate', value: `${summary.rate}%` },
      { label: 'Revenue (USD)', value: fmtUSD(summary.rev) },
    ],
    insights: insights ?? buildSegmentInsights(data, { noun, nounPlural }),
    chart: {
      title: `Revenue by ${noun} (USD)`,
      type: 'bar', barDir: 'bar', fmtCode: FMT.USD,
      labels: [...data].sort((a, b) => (b.rev ?? 0) - (a.rev ?? 0)).map(r => String(r.dim)),
      values: [...data].sort((a, b) => (b.rev ?? 0) - (a.rev ?? 0)).map(r => r.rev ?? 0),
    },
    chart2: {
      title: `Conversion rate by ${noun}`,
      type: 'bar', barDir: 'bar', fmtCode: FMT.PCT,
      labels: [...data].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)).map(r => String(r.dim)),
      values: [...data].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)).map(r => r.rate ?? 0),
    },
    table: {
      title: `${title} performance`,
      columns: ['Segment', 'Visits', 'Conversions', 'Conv rate', 'Revenue (USD)'],
      rows: data.map(r => [
        String(r.dim),
        fmtNum(r.visits),
        num(r.conv),
        fmtPct(r.rate),
        fmtUSD(r.rev),
      ]),
    },
  };
}

/** Device dataset (abandonment instead of revenue). */
function deviceSection() {
  const data = SAMPLE_DATA.device || [];
  const summary = getDatasetSummary('device');
  return {
    id: 'device',
    title: 'Device',
    kpis: [
      { label: 'Total Visits', value: fmtNum(summary.visits) },
      { label: 'Purchases', value: num(summary.conv) },
      { label: 'Conv Rate', value: `${summary.rate}%` },
    ],
    insights: buildDeviceInsights(data),
    chart: {
      title: 'Abandonment rate by device',
      type: 'bar', barDir: 'col', fmtCode: FMT.PCT,
      labels: data.map(r => String(r.dim)),
      values: data.map(r => r.abandon ?? 0),
    },
    chart2: {
      title: 'Purchase share by device',
      type: 'doughnut', fmtCode: FMT.COUNT,
      labels: data.map(r => String(r.dim)),
      values: data.map(r => r.purch ?? 0),
    },
    table: {
      title: 'Device comparison',
      columns: ['Device', 'Visits', 'Purchases', 'Conv %', 'Abandon %'],
      rows: data.map(r => [
        String(r.dim),
        fmtNum(r.visits),
        num(r.purch),
        `${r.rate}%`,
        `${r.abandon}%`,
      ]),
    },
  };
}

/** Exits dataset { label, exits, pv, rate }. */
function exitsSection() {
  const data = SAMPLE_DATA.exits || [];
  const totExits = data.reduce((s, r) => s + (r.exits || 0), 0);
  const totPv = data.reduce((s, r) => s + (r.pv || 0), 0);
  const sorted = [...data].sort((a, b) => b.rate - a.rate);
  return {
    id: 'exits',
    title: 'Page Exits',
    kpis: [
      { label: 'Total exits', value: fmtNum(totExits) },
      { label: 'Pageviews', value: fmtNum(totPv) },
      { label: 'Avg exit rate', value: `${totPv > 0 ? ((totExits / totPv) * 100).toFixed(1) : 0}%` },
    ],
    insights: buildExitsInsights(data),
    chart: {
      title: 'Exit rate % by page',
      type: 'bar', barDir: 'bar', fmtCode: FMT.PCT,
      labels: sorted.map(r => String(r.label)),
      values: sorted.map(r => r.rate),
    },
    chart2: {
      title: 'Exit volume by page',
      type: 'bar', barDir: 'bar', fmtCode: FMT.COUNT,
      labels: [...data].sort((a, b) => (b.exits ?? 0) - (a.exits ?? 0)).map(r => String(r.label)),
      values: [...data].sort((a, b) => (b.exits ?? 0) - (a.exits ?? 0)).map(r => r.exits ?? 0),
    },
    table: {
      title: 'Exit page detail',
      columns: ['Page', 'Exits', 'Pageviews', 'Exit rate'],
      rows: sorted.map(r => [String(r.label), fmtNum(r.exits), fmtNum(r.pv), `${r.rate}%`]),
    },
  };
}

/**
 * Full ordered list of report sections, reflecting the live
 * (date-filtered) data currently displayed on the web app.
 */
export function getReportSections() {
  return [
    overviewSection(),
    funnelSection(),
    deviceSection(),
    exitsSection(),
    segmentSection({ id: 'country', title: 'Country', datasetKey: 'country', noun: 'market', nounPlural: 'markets' }),
    segmentSection({ id: 'usertype', title: 'User Type', datasetKey: 'usertype', noun: 'group', nounPlural: 'groups' }),
    segmentSection({ id: 'browser', title: 'Competitor Device', datasetKey: 'browser', noun: 'device brand', nounPlural: 'device brands' }),
    segmentSection({ id: 'lasttouch', title: 'Last Touch', datasetKey: 'lasttouch', noun: 'channel', nounPlural: 'channels' }),
  ];
}

export function getReportMeta(dateRange) {
  return {
    title: 'Samsung Analytics Insights',
    periodLabel: dateRange ? formatDateRangeLabel(dateRange.from, dateRange.to) : 'All dates',
    generatedAt: new Date(),
  };
}
