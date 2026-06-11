import React, { useState, useCallback } from 'react';
import { SAMPLE_DATA, fmtNum, getOverviewSummary } from '../utils/helpers';
import { SUMMARY_KPIS } from '../utils/analysisPageKpis';
import { DonutChart, VBarChart, spreadPercentDomain } from '../components/Charts';
import InfoHint from '../components/InfoHint';
import InsightsPanel from '../components/InsightsPanel';
import ClickableMetricCard from '../components/ClickableMetricCard';
import AnalysisPageFrame from '../components/AnalysisPageFrame';
import DownloadCsvButton from '../components/DownloadCsvButton';
import { useAnalysisDrill } from '../hooks/useAnalysisDrill';
import { buildDeviceInsights } from '../utils/insights';

const SOURCE = 'device';

const abandonFmt = v => `${parseFloat(v).toFixed(2)}%`;

const DEVICE_CSV_COLUMNS = [
  { key: 'dim', header: 'Device' },
  { key: 'visits', header: 'Visits' },
  { key: 'purch', header: 'Purchases' },
  { key: 'rate', header: 'Conv %' },
  { key: 'abandon', header: 'Abandon %' },
];

export default function DevicePage() {
  const data = SAMPLE_DATA.device;
  const summary = getOverviewSummary();
  const { drill: segmentDrill, openDrill, closeDrill } = useAnalysisDrill(SOURCE);
  const [kpiDrill, setKpiDrill] = useState(null);
  const drill = segmentDrill
    ? { ...segmentDrill, color: SUMMARY_KPIS.find(k => k.key === segmentDrill.metricKey)?.color }
    : kpiDrill;
  const closeAll = useCallback(() => { closeDrill(); setKpiDrill(null); }, [closeDrill]);

  return (
    <AnalysisPageFrame drill={drill} onCloseDrill={closeAll}>
      <div className="page-toolbar">
        <InfoHint title="How to read">
          <p>Tablet converts at roughly half the desktop rate (0.07% vs 0.17%).</p>
          <p>High abandonment on smaller screens often signals checkout UX friction — click any metric to see contributing channels and markets.</p>
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

      <div className="metric-grid">
        {data.map(d => (
          <ClickableMetricCard
            key={d.dim}
            label={d.dim}
            value={fmtNum(d.visits)}
            sub={`${d.purch.toLocaleString()} purchases · ${d.rate}% conv`}
            color={d.dim === 'Desktop' ? '#3266ad' : '#e8913a'}
            onClick={() => openDrill(d.dim, 'visits')}
          />
        ))}
      </div>

      <InsightsPanel insights={buildDeviceInsights(data)} />

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Abandonment rate by device</span>
            <InfoHint className="info-hint--sm" title="Abandonment rate by device">
              <p><strong>Abandonment %</strong> = share of visits that don't end in a purchase (100% − conversion rate).</p>
              <p>A taller bar means more lost sessions on that device — often a checkout UX signal. <strong>Click a bar</strong> to attribute the loss to channels and markets.</p>
            </InfoHint>
            <span className="card-badge card-badge--hint">Click a bar</span>
            <DownloadCsvButton filename="device-abandonment" columns={DEVICE_CSV_COLUMNS} rows={data} />
          </div>
          <VBarChart
            data={data}
            bars={[{ key: 'abandon', label: 'Abandonment %', color: '#e05050' }]}
            height={200}
            yTickFormatter={abandonFmt}
            yDomain={spreadPercentDomain(data, 'abandon')}
            onBarClick={dim => openDrill(dim, 'abandon')}
          />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Conversion rate share</span>
            <InfoHint className="info-hint--sm" title="Conversion rate share">
              <p>Each slice = that device's share of total <strong>purchases</strong>.</p>
              <p>Hover a slice to see the purchase count behind it.</p>
            </InfoHint>
            <DownloadCsvButton filename="device-purchase-share" columns={DEVICE_CSV_COLUMNS} rows={data} />
          </div>
          <DonutChart data={data} nameKey="dim" valueKey="purch" />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Device comparison</span>
          <InfoHint className="info-hint--sm" title="Device comparison">
            <p>Visits, purchases, conversion % and abandonment % for each device.</p>
            <p><strong>Click a row</strong> to drill into the channels, markets and browsers behind that device.</p>
          </InfoHint>
          <DownloadCsvButton filename="device-comparison" columns={DEVICE_CSV_COLUMNS} rows={data} />
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Device</th><th className="num">Visits</th><th className="num">Purchases</th><th className="num">Conv %</th><th className="num">Abandon %</th></tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.dim} className="data-table-row--clickable" onClick={() => openDrill(r.dim, 'rate')}>
                <td>{r.dim}</td>
                <td className="num">{fmtNum(r.visits)}</td>
                <td className="num">{r.purch.toLocaleString()}</td>
                <td className="num">{r.rate}%</td>
                <td className="num">{abandonFmt(r.abandon)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AnalysisPageFrame>
  );
}
