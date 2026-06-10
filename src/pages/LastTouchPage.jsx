import React, { useState, useCallback } from 'react';
import { SAMPLE_DATA, fmtNum, fmtUSD, fmtPct, getOverviewSummary } from '../utils/helpers';
import { SUMMARY_KPIS } from '../utils/analysisPageKpis';
import { HBarChart, VBarChart } from '../components/Charts';
import InfoHint from '../components/InfoHint';
import InsightsPanel from '../components/InsightsPanel';
import ClickableMetricCard from '../components/ClickableMetricCard';
import AnalysisPageFrame from '../components/AnalysisPageFrame';
import DownloadCsvButton from '../components/DownloadCsvButton';
import { useAnalysisDrill } from '../hooks/useAnalysisDrill';
import { buildSegmentInsights } from '../utils/insights';

const SOURCE = 'lasttouch';

const LASTTOUCH_CSV_COLUMNS = [
  { key: 'dim', header: 'Channel' },
  { key: 'visits', header: 'Visits' },
  { key: 'conv', header: 'Conversions' },
  { key: 'rate', header: 'Conv rate %' },
  { key: 'rev', header: 'Revenue (USD)' },
];

export default function LastTouchPage() {
  const data = SAMPLE_DATA.lasttouch;
  const byRev = [...data].sort((a, b) => b.rev - a.rev);
  const byVisits = [...data].sort((a, b) => b.visits - a.visits);
  const byRate = [...data].sort((a, b) => b.rate - a.rate);
  const byEfficiency = [...data]
    .map(d => ({
      ...d,
      efficiency: parseFloat(((d.conv / d.visits) * 10000).toFixed(1)),
    }))
    .sort((a, b) => b.efficiency - a.efficiency);
  const summary = getOverviewSummary();
  const { drill: segmentDrill, openDrill, closeDrill } = useAnalysisDrill(SOURCE);
  const [kpiDrill, setKpiDrill] = useState(null);

  const drill = segmentDrill
    ? { ...segmentDrill, color: SUMMARY_KPIS.find(k => k.key === segmentDrill.metricKey)?.color }
    : kpiDrill;

  const closeAll = useCallback(() => {
    closeDrill();
    setKpiDrill(null);
  }, [closeDrill]);

  const openSegment = (segment, metricKey) => openDrill(segment, metricKey);
  const openKpi = kpi => setKpiDrill({
    kpiCard: { label: kpi.label, key: kpi.key, fmt: kpi.fmt, color: kpi.color, sub: kpi.sub },
    totalValue: summary[kpi.key],
  });

  return (
    <AnalysisPageFrame drill={drill} onCloseDrill={closeAll}>
      <div className="page-toolbar">
        <InfoHint title="How to read">
          <p><strong>Last-touch</strong> credits the final channel before purchase.</p>
          <p><strong>Session Refresh</strong> = already on-site buyers. Compare vs first-touch to see assist vs close roles.</p>
          <p>Click any <strong>scorecard</strong>, <strong>chart bar</strong>, or <strong>table row</strong> to drill into drivers by country, device, entry channel, and more.</p>
        </InfoHint>
      </div>

      <div className="metric-grid">
        {SUMMARY_KPIS.map(k => (
          <ClickableMetricCard
            key={k.key}
            label={k.label}
            value={k.fmt(summary[k.key])}
            sub={k.sub}
            color={k.color}
            active={kpiDrill?.kpiCard?.key === k.key}
            onClick={() => openKpi(k)}
          />
        ))}
      </div>

      <InsightsPanel insights={buildSegmentInsights(data, { noun: 'channel', nounPlural: 'channels' })} />

      <div className="card">
        <div className="card-header">
          <span className="card-title">Revenue by last-touch channel (USD)</span>
          <InfoHint className="info-hint--sm" title="Revenue by last-touch channel (USD)">
            <p><strong>Last-touch</strong> credits the final channel before purchase. Bar = USD revenue closed by that channel.</p>
            <p><strong>Click a bar</strong> to break revenue down by country, device and entry channel.</p>
          </InfoHint>
          <DownloadCsvButton filename="lasttouch-revenue" columns={LASTTOUCH_CSV_COLUMNS} rows={byRev} />
        </div>
        <HBarChart
          data={byRev}
          xKey="rev"
          yKey="dim"
          formatX={fmtUSD}
          onBarClick={dim => openSegment(dim, 'rev')}
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Conversion rate by channel</span>
            <InfoHint className="info-hint--sm" title="Conversion rate by channel">
              <p><strong>Conv rate</strong> = conversions ÷ visits for each last-touch channel — its closing efficiency.</p>
              <p>Colour: <strong style={{ color: 'var(--green)' }}>green ≥0.3%</strong>, blue ≥0.1%, <strong style={{ color: 'var(--red)' }}>red below</strong>. <strong>Click</strong> to drill in.</p>
            </InfoHint>
            <DownloadCsvButton filename="lasttouch-conv-rate" columns={LASTTOUCH_CSV_COLUMNS} rows={byRate} />
          </div>
          <HBarChart
            data={byRate}
            xKey="rate"
            yKey="dim"
            formatX={v => v + '%'}
            colorFn={d => (d.rate >= 0.3 ? '#27ae60' : d.rate >= 0.1 ? '#3266ad' : '#dc2626')}
            onBarClick={dim => openSegment(dim, 'rate')}
          />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Revenue share by channel</span>
            <InfoHint className="info-hint--sm" title="Revenue share by channel">
              <p>Channels ranked by USD revenue (highest first).</p>
              <p>Shows how closing revenue is distributed across last-touch channels. <strong>Click a bar</strong> to drill in.</p>
            </InfoHint>
            <DownloadCsvButton filename="lasttouch-revenue-share" columns={LASTTOUCH_CSV_COLUMNS} rows={byRev} />
          </div>
          <HBarChart
            data={byRev}
            xKey="rev"
            yKey="dim"
            formatX={fmtUSD}
            onBarClick={dim => openSegment(dim, 'rev')}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Visits vs conversions by last-touch channel</span>
          <InfoHint className="info-hint--sm" title="Visits vs conversions by last-touch channel">
            <p>Paired bars: <strong>blue</strong> = visits, <strong>orange</strong> = conversions, per channel.</p>
            <p>A tall blue bar with a tiny orange one = lots of traffic that rarely closes. <strong>Click a bar</strong> to drill in.</p>
          </InfoHint>
          <DownloadCsvButton filename="lasttouch-visits-vs-conversions" columns={LASTTOUCH_CSV_COLUMNS} rows={byVisits} />
        </div>
        <VBarChart
          data={byVisits}
          bars={[
            { key: 'visits', label: 'Visits', color: '#3266ad' },
            { key: 'conv', label: 'Conversions', color: '#e8913a' },
          ]}
          height={280}
          onBarClick={dim => openSegment(dim, 'visits')}
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Visit volume ranking</span>
            <InfoHint className="info-hint--sm" title="Visit volume ranking">
              <p>Channels ranked by visit volume (highest first).</p>
              <p>Quick read on which channels send the most last-touch traffic. <strong>Click a bar</strong> to drill in.</p>
            </InfoHint>
            <DownloadCsvButton
              filename="lasttouch-visit-ranking"
              columns={LASTTOUCH_CSV_COLUMNS}
              rows={byVisits}
            />
          </div>
          <HBarChart
            data={byVisits}
            xKey="visits"
            yKey="dim"
            formatX={fmtNum}
            onBarClick={dim => openSegment(dim, 'visits')}
          />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Efficiency index (conv ÷ visits × 10k)</span>
            <InfoHint className="info-hint--sm" title="Efficiency index">
              <p><strong>Efficiency</strong> = (conversions ÷ visits) × 10,000 — conv rate rescaled so small rates are easy to compare.</p>
              <p>Higher = more conversions per unit of traffic. <strong>Click a bar</strong> to drill in.</p>
            </InfoHint>
            <DownloadCsvButton
              filename="lasttouch-efficiency-index"
              columns={[...LASTTOUCH_CSV_COLUMNS, { key: 'efficiency', header: 'Efficiency (conv/visits x10k)' }]}
              rows={byEfficiency}
            />
          </div>
          <HBarChart
            data={byEfficiency}
            xKey="efficiency"
            yKey="dim"
            formatX={v => v}
            colorFn={d => (d.rate >= 0.3 ? '#27ae60' : d.rate >= 0.15 ? '#3266ad' : '#d97706')}
            onBarClick={dim => openSegment(dim, 'rate')}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Last-touch channel performance table</span>
          <InfoHint className="info-hint--sm" title="Last-touch channel performance table">
            <p>Visits, conversions, conv rate and USD revenue per last-touch channel.</p>
            <p>Rate badge: <strong>green ≥0.3%</strong>, blue ≥0.15%, amber below. <strong>Click a row</strong> to drill into its drivers.</p>
          </InfoHint>
          <DownloadCsvButton filename="lasttouch-performance" columns={LASTTOUCH_CSV_COLUMNS} rows={byRev} />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Channel</th>
              <th className="num">Visits</th>
              <th className="num">Conversions</th>
              <th className="num">Conv rate</th>
              <th className="num">Revenue USD</th>
            </tr>
          </thead>
          <tbody>
            {byRev.map(r => (
              <tr
                key={r.dim}
                className="data-table-row--clickable"
                onClick={() => openSegment(r.dim, 'rev')}
              >
                <td>{r.dim}</td>
                <td className="num">{fmtNum(r.visits)}</td>
                <td className="num">{r.conv.toLocaleString()}</td>
                <td className="num">
                  <span className={`badge badge-${r.rate >= 0.3 ? 'green' : r.rate >= 0.15 ? 'blue' : 'amber'}`}>
                    {fmtPct(r.rate)}
                  </span>
                </td>
                <td className="num">{fmtUSD(r.rev)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AnalysisPageFrame>
  );
}
