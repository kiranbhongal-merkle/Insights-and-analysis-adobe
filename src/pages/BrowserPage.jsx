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

const BROWSER_CSV_COLUMNS = [
  { key: 'dim', header: 'Browser' },
  { key: 'visits', header: 'Visits' },
  { key: 'conv', header: 'Conversions' },
  { key: 'rate', header: 'Conv rate %' },
  { key: 'rev', header: 'Revenue (USD)' },
];

export default function BrowserPage() {
  const data = SAMPLE_DATA.browser;
  const summary = getOverviewSummary();
  const { drill: segmentDrill, openDrill, closeDrill } = useAnalysisDrill(SOURCE);
  const [kpiDrill, setKpiDrill] = useState(null);
  const drill = segmentDrill ?? kpiDrill;
  const closeAll = useCallback(() => { closeDrill(); setKpiDrill(null); }, [closeDrill]);

  return (
    <AnalysisPageFrame drill={drill} onCloseDrill={closeAll}>
      <div className="page-toolbar">
        <InfoHint title="How to read">
          <p>Compare conversion rate across browser versions.</p>
          <p>A browser well below the 0.17% baseline may have a checkout rendering or compatibility issue — click to see market and channel drivers.</p>
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

      <InsightsPanel insights={buildSegmentInsights(data, { noun: 'browser', nounPlural: 'browsers' })} />

      <div className="card">
        <div className="card-header">
          <span className="card-title">Conversion rate by browser</span>
          <InfoHint className="info-hint--sm" title="Conversion rate by browser">
            <p><strong>Conv rate</strong> = conversions ÷ visits per browser version.</p>
            <p>Bar colour: <strong style={{ color: 'var(--green)' }}>green ≥0.3%</strong>, blue ≥0.15%, <strong style={{ color: 'var(--red)' }}>red below</strong>. A red bar on a high-traffic browser often means a checkout rendering bug. <strong>Click</strong> to drill in.</p>
          </InfoHint>
          <DownloadCsvButton filename="browser-conv-rate" columns={BROWSER_CSV_COLUMNS} rows={data} />
        </div>
        <HBarChart
          data={data}
          xKey="rate"
          yKey="dim"
          formatX={v => v + '%'}
          colorFn={d => (d.rate >= 0.3 ? '#27ae60' : d.rate >= 0.15 ? '#3266ad' : '#dc2626')}
          onBarClick={dim => openDrill(dim, 'rate')}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Visits by browser</span>
          <InfoHint className="info-hint--sm" title="Visits by browser">
            <p>Visit volume per browser version, ranked highest first.</p>
            <p>Use it to weigh how much a low-converting browser actually matters. <strong>Click a bar</strong> to drill in.</p>
          </InfoHint>
          <DownloadCsvButton filename="browser-visits" columns={BROWSER_CSV_COLUMNS} rows={data} />
        </div>
        <HBarChart data={data} xKey="visits" yKey="dim" formatX={fmtNum} onBarClick={dim => openDrill(dim, 'visits')} />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Browser performance table</span>
          <InfoHint className="info-hint--sm" title="Browser performance table">
            <p>Visits, conversions, conv rate and revenue per browser version.</p>
            <p><strong>Click a row</strong> to drill into the markets and channels behind it.</p>
          </InfoHint>
          <DownloadCsvButton filename="browser-performance" columns={BROWSER_CSV_COLUMNS} rows={data} />
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Browser</th><th className="num">Visits</th><th className="num">Conv</th><th className="num">Rate</th><th className="num">Revenue</th></tr>
          </thead>
          <tbody>
            {data.map(r => (
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
