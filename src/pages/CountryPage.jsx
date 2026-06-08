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

const SOURCE = 'country';

const COUNTRY_CSV_COLUMNS = [
  { key: 'dim', header: 'Country' },
  { key: 'visits', header: 'Visits' },
  { key: 'conv', header: 'Conversions' },
  { key: 'rate', header: 'Conv rate %' },
  { key: 'rev', header: 'Revenue (USD)' },
];

export default function CountryPage() {
  const data = SAMPLE_DATA.country;
  const summary = getOverviewSummary();
  const { drill: segmentDrill, openDrill, closeDrill } = useAnalysisDrill(SOURCE);
  const [kpiDrill, setKpiDrill] = useState(null);
  const drill = segmentDrill ?? kpiDrill;
  const closeAll = useCallback(() => { closeDrill(); setKpiDrill(null); }, [closeDrill]);

  return (
    <AnalysisPageFrame drill={drill} onCloseDrill={closeAll}>
      <div className="page-toolbar">
        <InfoHint title="How to read">
          <p>ISO 3-letter country codes. Revenue in USD.</p>
          <p>High visits + low conv rate often means checkout or localisation friction — click any market to drill into channels and devices.</p>
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

      <InsightsPanel insights={buildSegmentInsights(data, { noun: 'market', nounPlural: 'markets' })} />

      <div className="card">
        <div className="card-header">
          <span className="card-title">Revenue by country (USD)</span>
          <InfoHint className="info-hint--sm" title="Revenue by country (USD)">
            <p>Total USD-normalised revenue per market, ranked highest first (bar length = revenue).</p>
            <p>Local currencies are converted to USD using the FX rates in Settings. <strong>Click a bar</strong> to break the market down by channel, device and more.</p>
          </InfoHint>
          <DownloadCsvButton filename="country-revenue" columns={COUNTRY_CSV_COLUMNS} rows={data} />
        </div>
        <HBarChart data={data} xKey="rev" yKey="dim" formatX={fmtUSD} onBarClick={dim => openDrill(dim, 'rev')} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Conversion rate by country</span>
            <InfoHint className="info-hint--sm" title="Conversion rate by country">
              <p><strong>Conv rate</strong> = conversions ÷ visits, per market.</p>
              <p>High visits with a low bar here points to checkout or localisation friction. <strong>Click a bar</strong> to see the drivers.</p>
            </InfoHint>
            <DownloadCsvButton filename="country-conv-rate" columns={COUNTRY_CSV_COLUMNS} rows={data} />
          </div>
          <VBarChart
            data={data}
            bars={[{ key: 'rate', label: 'Conv Rate %', color: '#3266ad' }]}
            height={220}
            onBarClick={dim => openDrill(dim, 'rate')}
          />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Visits by country</span>
            <InfoHint className="info-hint--sm" title="Visits by country">
              <p>Total visit volume per market — shows where your audience is concentrated.</p>
              <p>Compare against the conversion-rate chart to spot high-traffic, low-yield markets. <strong>Click a bar</strong> to drill in.</p>
            </InfoHint>
            <DownloadCsvButton filename="country-visits" columns={COUNTRY_CSV_COLUMNS} rows={data} />
          </div>
          <VBarChart
            data={data}
            bars={[{ key: 'visits', label: 'Visits', color: '#e8913a' }]}
            height={220}
            onBarClick={dim => openDrill(dim, 'visits')}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Country performance table</span>
          <InfoHint className="info-hint--sm" title="Country performance table">
            <p>Visits, conversions, conv rate and USD revenue per market.</p>
            <p>Rate badge: <strong>green ≥0.3%</strong>, blue ≥0.15%, amber below. <strong>Click a row</strong> to drill into its drivers.</p>
          </InfoHint>
          <DownloadCsvButton filename="country-performance" columns={COUNTRY_CSV_COLUMNS} rows={data} />
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Country</th><th className="num">Visits</th><th className="num">Conv</th><th className="num">Rate</th><th className="num">Revenue</th></tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.dim} className="data-table-row--clickable" onClick={() => openDrill(r.dim, 'rate')}>
                <td>{r.dim}</td>
                <td className="num">{fmtNum(r.visits)}</td>
                <td className="num">{r.conv.toLocaleString()}</td>
                <td className="num"><span className={`badge badge-${r.rate >= 0.3 ? 'green' : r.rate >= 0.15 ? 'blue' : 'amber'}`}>{fmtPct(r.rate)}</span></td>
                <td className="num">{fmtUSD(r.rev)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AnalysisPageFrame>
  );
}
