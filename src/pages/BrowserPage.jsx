import React, { useState, useCallback } from 'react';
import { SAMPLE_DATA, fmtNum, fmtPct, getOverviewSummary } from '../utils/helpers';
import { SUMMARY_KPIS } from '../utils/analysisPageKpis';
import { HBarChart } from '../components/Charts';
import InfoHint from '../components/InfoHint';
import InsightsPanel from '../components/InsightsPanel';
import ClickableMetricCard from '../components/ClickableMetricCard';
import AnalysisPageFrame from '../components/AnalysisPageFrame';
import DownloadCsvButton from '../components/DownloadCsvButton';
import { useAnalysisDrill } from '../hooks/useAnalysisDrill';
import { buildSegmentInsights } from '../utils/insights';

const SOURCE = 'browser';

const DEVICE_CSV_COLUMNS = [
  { key: 'dim', header: 'Device manufacturer' },
  { key: 'visits', header: 'Visits' },
  { key: 'conv', header: 'Conversions' },
  { key: 'rate', header: 'Conv rate %' },
  { key: 'rev', header: 'Revenue (USD)' },
];

export default function BrowserPage() {
  const data = SAMPLE_DATA.browser;
  const byVisits = [...data].sort((a, b) => b.visits - a.visits);
  const byRate = [...data].sort((a, b) => b.rate - a.rate);
  const summary = getOverviewSummary();
  const { drill: segmentDrill, openDrill, closeDrill } = useAnalysisDrill(SOURCE);
  const [kpiDrill, setKpiDrill] = useState(null);
  const drill = segmentDrill ?? kpiDrill;
  const closeAll = useCallback(() => { closeDrill(); setKpiDrill(null); }, [closeDrill]);

  return (
    <AnalysisPageFrame drill={drill} onCloseDrill={closeAll}>
      <div className="page-toolbar">
        <InfoHint title="How to read">
          <p>Shows which <strong>device manufacturer</strong> visitors use when browsing Samsung products — Samsung, Apple, and other brands.</p>
          <p>Compare conversion across device types to see whether competitor-device users convert differently from Samsung-device users. Click any chart or row to drill into market and channel drivers.</p>
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
            onClick={() => setKpiDrill({ kpiCard: k, totalValue: summary[k.key] })}
          />
        ))}
      </div>

      <InsightsPanel insights={buildSegmentInsights(data, { noun: 'device brand', nounPlural: 'device brands' })} />

      <div className="card">
        <div className="card-header">
          <span className="card-title">Visits by device manufacturer</span>
          <InfoHint className="info-hint--sm" title="Visits by device manufacturer">
            <p>Visit volume per device brand, ranked highest first.</p>
            <p>Reveals how much traffic arrives on Samsung vs competitor devices. <strong>Click a bar</strong> to drill in.</p>
          </InfoHint>
          <DownloadCsvButton filename="competitor-device-visits" columns={DEVICE_CSV_COLUMNS} rows={byVisits} />
        </div>
        <HBarChart data={byVisits} xKey="visits" yKey="dim" formatX={fmtNum} onBarClick={dim => openDrill(dim, 'visits')} />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Conversion rate by device manufacturer</span>
          <InfoHint className="info-hint--sm" title="Conversion rate by device manufacturer">
            <p><strong>Conv rate</strong> = conversions ÷ visits per device brand, ranked highest first.</p>
            <p>Bar colour: <strong style={{ color: 'var(--green)' }}>green ≥0.3%</strong>, blue ≥0.15%, <strong style={{ color: 'var(--red)' }}>red below</strong>. <strong>Click</strong> to drill in.</p>
          </InfoHint>
          <DownloadCsvButton filename="competitor-device-conv-rate" columns={DEVICE_CSV_COLUMNS} rows={byRate} />
        </div>
        <HBarChart
          data={byRate}
          xKey="rate"
          yKey="dim"
          formatX={v => v + '%'}
          colorFn={d => (d.rate >= 0.3 ? '#27ae60' : d.rate >= 0.15 ? '#3266ad' : '#dc2626')}
          onBarClick={dim => openDrill(dim, 'rate')}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Device manufacturer performance table</span>
          <InfoHint className="info-hint--sm" title="Device manufacturer performance table">
            <p>Visits, conversions, conv rate and revenue per device brand, sorted by visits (highest first).</p>
            <p><strong>Click a row</strong> to drill into the markets and channels behind it.</p>
          </InfoHint>
          <DownloadCsvButton filename="competitor-device-performance" columns={DEVICE_CSV_COLUMNS} rows={byVisits} />
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Device manufacturer</th><th className="num">Visits</th><th className="num">Conv</th><th className="num">Rate</th><th className="num">Revenue</th></tr>
          </thead>
          <tbody>
            {byVisits.map(r => (
              <tr key={r.dim} className="data-table-row--clickable" onClick={() => openDrill(r.dim, 'rate')}>
                <td>{r.dim}</td>
                <td className="num">{fmtNum(r.visits)}</td>
                <td className="num">{r.conv.toLocaleString()}</td>
                <td className="num">{fmtPct(r.rate)}</td>
                <td className="num">{fmtNum(r.rev)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AnalysisPageFrame>
  );
}
