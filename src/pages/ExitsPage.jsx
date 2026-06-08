import React, { useState, useCallback } from 'react';
import { SAMPLE_DATA, fmtNum } from '../utils/helpers';
import { HBarChart } from '../components/Charts';
import InfoHint from '../components/InfoHint';
import InsightsPanel from '../components/InsightsPanel';
import ClickableMetricCard from '../components/ClickableMetricCard';
import AnalysisPageFrame from '../components/AnalysisPageFrame';
import DownloadCsvButton from '../components/DownloadCsvButton';
import { useAnalysisDrill } from '../hooks/useAnalysisDrill';
import { buildExitsInsights } from '../utils/insights';

const SOURCE = 'exits';

const EXITS_CSV_COLUMNS = [
  { key: 'label', header: 'Page' },
  { key: 'exits', header: 'Exits' },
  { key: 'pv', header: 'Pageviews' },
  { key: 'rate', header: 'Exit rate %' },
];

const EXIT_KPIS = [
  { label: 'Total exits', key: 'exits', fmt: fmtNum, color: '#dc2626', sub: 'All top pages' },
  { label: 'Pageviews', key: 'pv', fmt: fmtNum, color: '#3266ad', sub: 'Associated PVs' },
  { label: 'Avg exit rate', key: 'rate', fmt: v => `${v}%`, color: '#d97706', sub: 'Weighted avg' },
];

export default function ExitsPage() {
  const data = SAMPLE_DATA.exits;
  const sorted = [...data].sort((a, b) => b.rate - a.rate);
  const summary = {
    exits: data.reduce((s, r) => s + r.exits, 0),
    pv: data.reduce((s, r) => s + r.pv, 0),
    rate: parseFloat(((data.reduce((s, r) => s + r.exits, 0) / data.reduce((s, r) => s + r.pv, 0)) * 100).toFixed(1)),
  };
  const { drill: segmentDrill, openDrill, closeDrill } = useAnalysisDrill(SOURCE);
  const [kpiDrill, setKpiDrill] = useState(null);
  const drill = segmentDrill ?? kpiDrill;
  const closeAll = useCallback(() => { closeDrill(); setKpiDrill(null); }, [closeDrill]);

  const openKpi = k => {
    if (k.key === 'exits') setKpiDrill({ kpiCard: { ...k, key: 'exits' }, totalValue: summary.exits });
    else if (k.key === 'rate') setKpiDrill({ kpiCard: { ...k, key: 'exit_rate' }, totalValue: summary.rate });
    else setKpiDrill({ kpiCard: { ...k, key: 'visits' }, totalValue: summary.pv });
  };

  return (
    <AnalysisPageFrame drill={drill} onCloseDrill={closeAll}>
      <div className="page-toolbar">
        <InfoHint title="How to read">
          <p>Top chart = exit volume. Bottom = exit rate % (exits ÷ pageviews).</p>
          <p><strong style={{ color: 'var(--red)' }}>Red ≥60%</strong> marks critical leakage. Click any page or bar to see which channels and markets drive exits.</p>
        </InfoHint>
      </div>

      <div className="metric-grid">
        {EXIT_KPIS.map(k => (
          <ClickableMetricCard
            key={k.key}
            label={k.label}
            value={k.fmt(summary[k.key])}
            sub={k.sub}
            color={k.color}
            onClick={() => openKpi(k)}
          />
        ))}
      </div>

      <InsightsPanel insights={buildExitsInsights(data)} />

      <div className="card">
        <div className="card-header">
          <span className="card-title">Top exit pages — total exits</span>
          <InfoHint className="info-hint--sm" title="Top exit pages — total exits">
            <p><strong>Exits</strong> = number of sessions whose last page was this one. Bar length = exit volume.</p>
            <p>High volume here means many journeys end on this page. <strong>Click a bar</strong> to see which channels and markets drive those exits.</p>
          </InfoHint>
          <DownloadCsvButton filename="exits-total" columns={EXITS_CSV_COLUMNS} rows={data} />
        </div>
        <HBarChart
          data={data}
          xKey="exits"
          yKey="label"
          formatX={fmtNum}
          onBarClick={label => openDrill(label, 'exits')}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Exit rate % by page</span>
          <InfoHint className="info-hint--sm" title="Exit rate % by page">
            <p><strong>Exit rate</strong> = exits ÷ pageviews for that page.</p>
            <p>Colour: <strong style={{ color: 'var(--red)' }}>red ≥60%</strong> (critical leakage), amber ≥40%, blue below. <strong>Click a bar</strong> to attribute exits to drivers.</p>
          </InfoHint>
          <DownloadCsvButton filename="exits-rate-by-page" columns={EXITS_CSV_COLUMNS} rows={sorted} />
        </div>
        <HBarChart
          data={sorted}
          xKey="rate"
          yKey="label"
          formatX={v => v + '%'}
          colorFn={d => (d.rate >= 60 ? '#dc2626' : d.rate >= 40 ? '#d97706' : '#3266ad')}
          onBarClick={label => openDrill(label, 'exit_rate')}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Exit page detail</span>
          <InfoHint className="info-hint--sm" title="Exit page detail">
            <p>Exits, pageviews and exit rate per page, sorted by exit rate.</p>
            <p>Rate badge: <strong>red ≥60%</strong>, amber ≥40%, green below. <strong>Click a row</strong> to drill into the drivers.</p>
          </InfoHint>
          <DownloadCsvButton filename="exits-detail" columns={EXITS_CSV_COLUMNS} rows={sorted} />
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Page</th><th className="num">Exits</th><th className="num">Pageviews</th><th className="num">Exit rate</th></tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.label} className="data-table-row--clickable" onClick={() => openDrill(r.label, 'exit_rate')}>
                <td>{r.label}</td>
                <td className="num">{fmtNum(r.exits)}</td>
                <td className="num">{fmtNum(r.pv)}</td>
                <td className="num">
                  <span className={`badge badge-${r.rate >= 60 ? 'red' : r.rate >= 40 ? 'amber' : 'green'}`}>
                    {r.rate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AnalysisPageFrame>
  );
}
