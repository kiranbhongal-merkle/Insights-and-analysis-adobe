import React, { useState, useCallback } from 'react';
import { SAMPLE_DATA, fmtNum, fmtUSD, getOverviewSummary } from '../utils/helpers';
import { SUMMARY_KPIS } from '../utils/analysisPageKpis';
import { DonutChart, VBarChart } from '../components/Charts';
import InfoHint from '../components/InfoHint';
import InsightsPanel from '../components/InsightsPanel';
import ClickableMetricCard from '../components/ClickableMetricCard';
import AnalysisPageFrame from '../components/AnalysisPageFrame';
import DownloadCsvButton from '../components/DownloadCsvButton';
import { useAnalysisDrill } from '../hooks/useAnalysisDrill';
import { buildSegmentInsights } from '../utils/insights';

const SOURCE = 'usertype';

const USERTYPE_CSV_COLUMNS = [
  { key: 'dim', header: 'User type' },
  { key: 'visits', header: 'Visits' },
  { key: 'conv', header: 'Conversions' },
  { key: 'rate', header: 'Conv rate %' },
  { key: 'rev', header: 'Revenue (USD)' },
  { key: 'sess', header: 'Avg session (min)' },
];

export default function UserTypePage() {
  const data = SAMPLE_DATA.usertype;
  const summary = getOverviewSummary();
  const { drill: segmentDrill, openDrill, closeDrill } = useAnalysisDrill(SOURCE);
  const [kpiDrill, setKpiDrill] = useState(null);
  const drill = segmentDrill ?? kpiDrill;
  const closeAll = useCallback(() => { closeDrill(); setKpiDrill(null); }, [closeDrill]);

  return (
    <AnalysisPageFrame drill={drill} onCloseDrill={closeAll}>
      <div className="page-toolbar">
        <InfoHint title="How to read">
          <p><strong>New</strong> = first-ever visit. <strong>Returning</strong> = subsequent visits.</p>
          <p>Returning users convert about 4× more and drive most revenue — click segments to see which channels and markets to target for new-user nurture.</p>
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
        {data.map(u => (
          <ClickableMetricCard
            key={u.dim}
            label={`${u.dim} users`}
            value={fmtNum(u.visits)}
            sub={`${u.conv.toLocaleString()} conv · ${u.rate}% · ${u.sess}m avg`}
            color={u.dim === 'Returning' ? '#3266ad' : '#e8913a'}
            onClick={() => openDrill(u.dim, 'rev')}
          />
        ))}
      </div>

      <InsightsPanel insights={buildSegmentInsights(data, { noun: 'group', nounPlural: 'groups' })} />

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Conversion rate comparison</span>
            <InfoHint className="info-hint--sm" title="Conversion rate comparison">
              <p><strong>Conv rate</strong> = conversions ÷ visits for New vs Returning users.</p>
              <p>The gap quantifies how much more loyal users convert — the case for first-purchase nurture. <strong>Click a bar</strong> to drill in.</p>
            </InfoHint>
            <DownloadCsvButton filename="usertype-conv-rate" columns={USERTYPE_CSV_COLUMNS} rows={data} />
          </div>
          <VBarChart
            data={data}
            bars={[{ key: 'rate', label: 'Conv Rate %', color: '#3266ad' }]}
            height={200}
            onBarClick={dim => openDrill(dim, 'rate')}
          />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Revenue split (USD)</span>
            <InfoHint className="info-hint--sm" title="Revenue split (USD)">
              <p>Each slice = that group's share of total USD revenue.</p>
              <p>Shows how dependent revenue is on returning vs new users.</p>
            </InfoHint>
            <DownloadCsvButton filename="usertype-revenue-split" columns={USERTYPE_CSV_COLUMNS} rows={data} />
          </div>
          <DonutChart data={data} nameKey="dim" valueKey="rev" />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">User type performance table</span>
          <InfoHint className="info-hint--sm" title="User type performance table">
            <p>Visits, conversions, conv rate, USD revenue and average session length per group.</p>
            <p><strong>Click a row</strong> to drill into the channels and markets behind it.</p>
          </InfoHint>
          <DownloadCsvButton filename="usertype-performance" columns={USERTYPE_CSV_COLUMNS} rows={data} />
        </div>
        <table className="data-table">
          <thead>
            <tr><th>User type</th><th className="num">Visits</th><th className="num">Conv</th><th className="num">Rate</th><th className="num">Revenue</th><th className="num">Avg session</th></tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.dim} className="data-table-row--clickable" onClick={() => openDrill(r.dim, 'visits')}>
                <td>{r.dim}</td>
                <td className="num">{fmtNum(r.visits)}</td>
                <td className="num">{r.conv.toLocaleString()}</td>
                <td className="num">{r.rate}%</td>
                <td className="num">{fmtUSD(r.rev)}</td>
                <td className="num">{r.sess}m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AnalysisPageFrame>
  );
}
