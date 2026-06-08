import React from 'react';
import { BookOpen, Hash, Layers, Calculator, Sparkles, Palette } from 'lucide-react';

// ── Metric definitions ───────────────────────────────────────
const METRICS = [
  {
    name: 'Visits',
    measures: 'Total sessions in the selected period.',
    formula: 'SUM(visits)',
    notes: 'The base denominator for most rate metrics.',
  },
  {
    name: 'Conversions',
    measures: 'Completed purchases.',
    formula: 'SUM(converted)',
    notes: 'The primary success event across the app.',
  },
  {
    name: 'Conversion Rate',
    measures: 'Share of visits that end in a purchase.',
    formula: 'conversions ÷ visits × 100',
    notes: 'When aggregated it is a visit-weighted average — not a simple mean of segment rates.',
  },
  {
    name: 'Revenue (USD)',
    measures: 'Purchase value, normalised to US dollars.',
    formula: 'SUM(revenue_usd)',
    notes: 'Local currencies are converted to USD using the FX rates defined in the data pipeline.',
  },
  {
    name: 'Avg Order Value (AOV)',
    measures: 'Average revenue per conversion.',
    formula: 'revenue ÷ conversions',
    notes: 'Recomputed from totals at every drill level rather than averaged.',
  },
  {
    name: 'Avg Session',
    measures: 'Mean session length, in minutes.',
    formula: 'total_session_mins ÷ session_count',
    notes: 'Visit-weighted when rolled up across segments.',
  },
  {
    name: 'Exits',
    measures: 'Sessions whose last page was a given page.',
    formula: 'SUM(top_exit_page_count)',
    notes: 'Used on the Page Exits tab to find leakage.',
  },
  {
    name: 'Exit Rate',
    measures: 'Share of a page\u2019s pageviews that end the session.',
    formula: 'exits ÷ pageviews × 100',
    notes: '≥ 60% is flagged as critical leakage.',
  },
  {
    name: 'Abandonment %',
    measures: 'Share of visits that do not convert (Device tab).',
    formula: '100 − conversion rate',
    notes: 'The inverse of conversion rate; high values often signal checkout friction.',
  },
  {
    name: 'Drop-off %',
    measures: 'Sessions lost between two consecutive funnel steps.',
    formula: '(1 − step visitors ÷ previous step visitors) × 100',
    notes: '> 70% is urgent, 40–70% is moderate, < 40% is acceptable.',
  },
  {
    name: 'Efficiency Index',
    measures: 'Conversion rate rescaled for easy comparison (Last Touch).',
    formula: '(conversions ÷ visits) × 10,000',
    notes: 'Makes very small conversion rates easier to compare side by side.',
  },
  {
    name: 'Contribution %',
    measures: 'A segment\u2019s share of its parent within a drill-down.',
    formula: 'segment value ÷ parent total',
    notes: 'Additive metrics use their own share; derived metrics use the visit share.',
  },
];

// ── Dimension definitions ────────────────────────────────────
const DIMENSIONS = [
  { name: 'Entry Channel', desc: 'The acquisition channel that started the session.', field: 'traffic_source', example: 'Organic, Paid Search, Direct' },
  { name: 'Last-Touch Channel', desc: 'The final channel before a purchase.', field: 'last_touch_channel', example: 'Email, Pmax, Session Refresh' },
  { name: 'Device', desc: 'Device category of the session.', field: 'device_category', example: 'Desktop, Mobile, Tablet' },
  { name: 'User Type', desc: 'Whether the visitor is new or returning.', field: 'user_type', example: 'New, Returning' },
  { name: 'Browser', desc: 'Browser (and version where available).', field: 'browser', example: 'Chrome, Safari, Samsung Browser' },
  { name: 'Country', desc: 'Visitor market, as an ISO 3-letter code.', field: 'country', example: 'usa, sau, ind' },
  { name: 'Funnel Step', desc: 'Stage of the purchase journey.', field: 'derived from reached_*', example: 'Landing → Product → Cart → Checkout → Purchase' },
  { name: 'Exit Page', desc: 'The last page viewed in a session.', field: 'top_exit_page', example: '/cart, /checkout' },
  { name: 'Week / Date', desc: 'Time bucket used for trend charts.', field: 'date', example: 'KPI trend X-axis' },
];

// ── Calculation logic blocks ─────────────────────────────────
const LOGIC = [
  {
    title: 'USD revenue normalisation',
    body: 'Revenue arrives in local currencies. Each row\u2019s revenue is converted to USD using fixed FX rates (divide, multiply or passthrough per currency) before any aggregation, so every revenue and AOV figure in the app is directly comparable across markets.',
  },
  {
    title: 'Aggregation & Top-N bucketing',
    body: 'Raw rows are grouped by the chosen dimension and their additive metrics (visits, conversions, revenue) are summed; rates and AOV are then derived from those totals. High-cardinality dimensions are limited to the largest segments, with the remainder rolled into a single "Other" bucket so charts stay readable.',
  },
  {
    title: 'Funnel construction',
    body: 'The funnel uses a strictly decreasing sequence — Landing → Product Detail → Add to Cart → Checkout → Purchase. Each step\u2019s drop-off is the share of sessions lost versus the previous step, which keeps the funnel monotonic and the drop-off percentages meaningful.',
  },
  {
    title: 'Conserving drill-down attribution',
    body: 'When you drill into a segment, its parent total is distributed proportionally across the child dimension rather than recomputed independently. This means additive metrics (visits, conversions, revenue) always sum back to the value you clicked, and derived metrics (rate, AOV) are recalculated from those conserved totals at each level.',
  },
  {
    title: 'Insights generation',
    body: 'Every "Key insights" panel is produced by deterministic JavaScript — no AI model. The functions rank and threshold the data currently in view (top revenue, best converter vs. the weighted average, biggest opportunity, traffic concentration, funnel leaks, exit leakage) and fill plain-language templates. Because they read the filtered datasets at render time, they refresh automatically whenever the date range changes.',
  },
  {
    title: 'Date filtering & data source',
    body: 'In demo mode the app loads a CSV, keeps the raw rows in memory, and re-aggregates them whenever the date range changes. The same datasets power every page through a shared accessor, so KPIs, charts, tables and insights always reflect the selected period.',
  },
];

// ── Colour / threshold legend ────────────────────────────────
const LEGEND = [
  { metric: 'Conversion rate', rules: [
    { cls: 'green', label: '≥ 0.30% — strong' },
    { cls: 'blue', label: '≥ 0.15% — average' },
    { cls: 'amber', label: '< 0.15% — weak' },
  ] },
  { metric: 'Exit rate', rules: [
    { cls: 'red', label: '≥ 60% — critical' },
    { cls: 'amber', label: '≥ 40% — high' },
    { cls: 'blue', label: '< 40% — normal' },
  ] },
  { metric: 'Funnel drop-off', rules: [
    { cls: 'red', label: '> 70% — urgent' },
    { cls: 'amber', label: '40–70% — moderate' },
    { cls: 'green', label: '< 40% — acceptable' },
  ] },
];

function SectionHeader({ icon: Icon, title, children }) {
  return (
    <div className="card-header">
      <Icon size={16} style={{ color: 'var(--blue)', flexShrink: 0 }} />
      <span className="card-title">{title}</span>
      {children}
    </div>
  );
}

export default function GlossaryPage() {
  return (
    <>
      <div className="card">
        <SectionHeader icon={BookOpen} title="Glossary & methodology" />
        <div className="info-banner">
          <strong>What's in here:</strong> definitions for every metric and dimension used across the
          dashboard, plus the calculation logic behind the charts, drill-downs and insights. Use it as the
          single source of truth for how each number is produced.
        </div>
      </div>

      <div className="card">
        <SectionHeader icon={Hash} title="Metrics" />
        <table className="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>What it measures</th>
              <th>Calculation</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map(m => (
              <tr key={m.name}>
                <td><strong>{m.name}</strong></td>
                <td>{m.measures}</td>
                <td><code className="glossary-formula">{m.formula}</code></td>
                <td style={{ color: 'var(--text2)' }}>{m.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <SectionHeader icon={Layers} title="Dimensions" />
        <table className="data-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Description</th>
              <th>Source field</th>
              <th>Example values</th>
            </tr>
          </thead>
          <tbody>
            {DIMENSIONS.map(d => (
              <tr key={d.name}>
                <td><strong>{d.name}</strong></td>
                <td>{d.desc}</td>
                <td><code className="glossary-formula">{d.field}</code></td>
                <td style={{ color: 'var(--text2)' }}>{d.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <SectionHeader icon={Calculator} title="Calculation logic" />
        <div className="glossary-logic">
          {LOGIC.map(l => (
            <div className="glossary-logic-item" key={l.title}>
              <div className="glossary-logic-title">{l.title}</div>
              <div className="glossary-logic-body">{l.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <SectionHeader icon={Sparkles} title="How insights are generated" />
        <div className="info-banner">
          Insights are <strong>rule-based JavaScript, not AI</strong>. They are deterministic (the same data
          always yields the same insight), computed in the browser, and recalculated on every filter change.
          They surface the patterns encoded in the rules — top/bottom performers, opportunity sizing, funnel
          leaks and leakage — rather than discovering novel correlations.
        </div>
      </div>

      <div className="card">
        <SectionHeader icon={Palette} title="Colour & threshold legend" />
        <table className="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Thresholds</th>
            </tr>
          </thead>
          <tbody>
            {LEGEND.map(row => (
              <tr key={row.metric}>
                <td><strong>{row.metric}</strong></td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {row.rules.map(r => (
                      <span key={r.label} className={`badge badge-${r.cls}`}>{r.label}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
