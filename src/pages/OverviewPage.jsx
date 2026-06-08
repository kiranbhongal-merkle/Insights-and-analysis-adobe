import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../App';
import { KPITrendChart, RevenueChart } from '../components/Charts';
import InfoHint from '../components/InfoHint';
import InsightsPanel from '../components/InsightsPanel';
import MetricDrilldownModal from '../components/MetricDrilldownModal';
import DownloadCsvButton from '../components/DownloadCsvButton';
import { SAMPLE_DATA, getOverviewSummary, formatDateRangeLabel, fmtNum, fmtUSD } from '../utils/helpers';
import { buildOverviewInsights } from '../utils/insights';

const TREND_CSV_COLUMNS = [
  { key: 'date', header: 'Week' },
  { key: 'visits', header: 'Visits' },
  { key: 'conv_rate', header: 'Conv rate %' },
  { key: 'revenue', header: 'Revenue (USD)' },
];

const KPI_CARDS = [
  { label: 'Total Visits',   key: 'visits',    fmt: fmtNum, color: '#3266ad', sub: 'Selected period' },
  { label: 'Conversions',    key: 'conv',       fmt: v => v?.toLocaleString(), color: '#27ae60', sub: 'Completed purchases' },
  { label: 'Conv Rate',      key: 'rate',       fmt: v => v + '%', color: '#e8913a', sub: 'vs 2% industry avg' },
  { label: 'Revenue (USD)',  key: 'rev',        fmt: fmtUSD, color: '#8e44ad', sub: 'USD normalised' },
  { label: 'Avg Order',      key: 'aov',        fmt: fmtUSD, color: '#16a085', sub: 'Per conversion' },
  { label: 'Avg Session',    key: 'sess',       fmt: v => v + 'm', color: '#d35400', sub: 'Minutes' },
];

export default function OverviewPage() {
  const { dateRange } = useApp();
  const [drillKpiKey, setDrillKpiKey] = useState(null);
  const drillKpi = drillKpiKey ? KPI_CARDS.find(k => k.key === drillKpiKey) : null;
  const overviewSummary = getOverviewSummary();
  const periodLabel = formatDateRangeLabel(dateRange.from, dateRange.to);

  const trendData = (SAMPLE_DATA.kpi || []).map(r => ({
    date: r.date.slice(5),
    visits: r.visits,
    conv_rate: r.conv_rate,
    revenue: r.revenue,
  }));

  return (
    <>
      <div className={`overview-shell${drillKpiKey ? ' overview-shell--dimmed' : ''}`}>
        {/* KPI Cards */}
        <div className="metric-grid">
          {KPI_CARDS.map(k => (
            <button
              type="button"
              key={k.key}
              className={`metric-card metric-card--clickable${drillKpiKey === k.key ? ' metric-card--active' : ''}`}
              style={{ '--accent-color': k.color }}
              onClick={() => setDrillKpiKey(k.key)}
              aria-haspopup="dialog"
              aria-expanded={drillKpiKey === k.key}
            >
              <div className="metric-label">{k.label}</div>
              <div className="metric-value">{k.fmt(overviewSummary[k.key])}</div>
              <div className="metric-sub">{k.key === 'visits' ? periodLabel : k.sub}</div>
              <div className="metric-drill-hint">
                Explore by dimension <ChevronRight size={12} />
              </div>
            </button>
          ))}
        </div>

        {/* Insights */}
        <InsightsPanel insights={buildOverviewInsights(overviewSummary, SAMPLE_DATA)} />

        {/* Trend Charts */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Weekly visits &amp; conversion rate</span>
            <InfoHint className="info-hint--sm" title="Weekly visits & conversion rate">
              <p>Each point is one period in the selected date range. <strong>Bars</strong> = visit volume (left axis); <strong>orange line</strong> = conversion rate % (right axis).</p>
              <p>Watch for periods where visits spike but the line dips — a sign of lower-quality traffic.</p>
            </InfoHint>
            <DownloadCsvButton filename="overview-weekly-visits-conv-rate" columns={TREND_CSV_COLUMNS} rows={trendData} />
          </div>
          <div className="info-banner" style={{ marginBottom: 16 }}>
            <strong>How to read:</strong> Bars = visit volume (left axis). Orange line = conversion rate % (right axis).
            Look for weeks where visits spike but conv rate drops — signals traffic quality issues.
          </div>
          <KPITrendChart data={trendData} />
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Weekly revenue (USD)</span>
            <InfoHint className="info-hint--sm" title="Weekly revenue (USD)">
              <p>USD-normalised revenue over time — local currencies converted using the FX rates in Settings.</p>
              <p>The shaded area tracks the revenue trend across the selected period.</p>
            </InfoHint>
            <DownloadCsvButton filename="overview-weekly-revenue" columns={TREND_CSV_COLUMNS} rows={trendData} />
          </div>
          <RevenueChart data={trendData} />
        </div>
      </div>

      {drillKpi && (
        <MetricDrilldownModal
          kpi={drillKpi}
          totalValue={overviewSummary[drillKpi.key]}
          onClose={() => setDrillKpiKey(null)}
        />
      )}
    </>
  );
}
