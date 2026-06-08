import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { getEffectiveFunnel, fmtNum, dropoffColor } from '../utils/helpers';
import { VBarChart } from '../components/Charts';
import InfoHint from '../components/InfoHint';
import InsightsPanel from '../components/InsightsPanel';
import FunnelDrilldownModal from '../components/FunnelDrilldownModal';
import DownloadCsvButton from '../components/DownloadCsvButton';
import { buildFunnelInsights } from '../utils/insights';

const FUNNEL_COLORS = ['#3266ad', '#4a7fc4', '#5a9bcc', '#6ab5c0', '#7ac9a8', '#e05050'];

const FUNNEL_CSV_COLUMNS = [
  { key: 'step', header: 'Step' },
  { key: 'visitors', header: 'Sessions' },
  { key: 'dropoff', header: 'Drop-off %', format: v => (v == null ? '' : v) },
];

function openDrillStep(step, dropoff, setDrillStep) {
  if (dropoff == null) return;
  setDrillStep(step);
}

export default function FunnelPage() {
  const [drillStep, setDrillStep] = useState(null);
  const funnel = getEffectiveFunnel();
  const max = funnel[0]?.visitors ?? 0;
  const dropSteps = funnel.filter(f => f.dropoff != null);

  const dropChartData = dropSteps.map(d => ({ dim: d.step, pct: d.dropoff, step: d.step }));

  return (
    <>
      <div className={`page-shell${drillStep ? ' page-shell--dimmed' : ''}`}>
        <div className="page-toolbar">
          <InfoHint title="How to read">
            <p><strong>Bar width</strong> = relative session volume at each step.</p>
            <p><strong>Drop-off %</strong> = sessions lost between the previous step and this one.</p>
            <p><strong>Colour:</strong> red = critical (&gt;70%), amber = moderate (40–70%), green = acceptable (&lt;40%).</p>
            <p>Click a <strong>drop-off %</strong> or any <strong>red bar</strong> to see which channel, market, or device drove the loss.</p>
          </InfoHint>
        </div>

        <InsightsPanel insights={buildFunnelInsights(funnel)} />

        <div className="card">
          <div className="card-header">
            <span className="card-title">Funnel steps — total sessions</span>
            <InfoHint className="info-hint--sm" title="Funnel steps — total sessions">
              <p>Each row is a stage of the journey (Landing → Product → Add to Cart → Checkout → Purchase). <strong>Bar width</strong> = sessions reaching that step.</p>
              <p><strong>Drop-off %</strong> = sessions lost vs the previous step. Click any drop-off or red bar to see which segments caused the loss.</p>
            </InfoHint>
            <DownloadCsvButton filename="funnel-steps" columns={FUNNEL_CSV_COLUMNS} rows={funnel} />
          </div>
          {funnel.map((r, i) => {
            const pct = Math.max((r.visitors / max) * 100, 0.3).toFixed(1);
            const hasDrop = r.dropoff != null;
            const isActive = drillStep === r.step;

            return (
              <div
                className={`funnel-row${hasDrop ? ' funnel-row--drillable' : ''}${isActive ? ' funnel-row--active' : ''}`}
                key={r.step}
              >
                <div className="funnel-label">{r.step}</div>
                <button
                  type="button"
                  className="funnel-bar-btn"
                  disabled={!hasDrop}
                  onClick={() => openDrillStep(r.step, r.dropoff, setDrillStep)}
                  aria-label={hasDrop ? `Explore drop-off at ${r.step}` : undefined}
                >
                  <div className="funnel-bar-bg">
                    <div
                      className="funnel-bar-fill"
                      style={{ width: pct + '%', background: FUNNEL_COLORS[i] }}
                    >
                      {r.visitors > 200000 ? fmtNum(r.visitors) : ''}
                    </div>
                  </div>
                </button>
                <div className="funnel-count">{fmtNum(r.visitors)}</div>
                <div className="funnel-drop">
                  {r.dropoff == null ? (
                    <span style={{ color: 'var(--text3)' }}>—</span>
                  ) : (
                    <button
                      type="button"
                      className="funnel-drop-btn"
                      style={{ color: dropoffColor(r.dropoff) }}
                      onClick={() => openDrillStep(r.step, r.dropoff, setDrillStep)}
                    >
                      ▼{r.dropoff}%
                      <ChevronRight size={12} className="funnel-drop-chevron" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Drop-off % at each step</span>
              <InfoHint className="info-hint--sm" title="Drop-off % at each step">
                <p>The same drop-off percentages shown as bars — taller = more severe loss at that transition.</p>
                <p><strong>Click a bar</strong> to attribute the drop-off to channels, markets, devices and more.</p>
              </InfoHint>
              <DownloadCsvButton
                filename="funnel-dropoff-by-step"
                columns={[{ key: 'step', header: 'Step' }, { key: 'pct', header: 'Drop-off %' }]}
                rows={dropChartData}
              />
            </div>
            <VBarChart
              data={dropChartData}
              bars={[{ key: 'pct', label: 'Drop-off %', color: '#e05050' }]}
              xKey="dim"
              height={240}
              yTickFormatter={v => v + '%'}
              onBarClick={(step) => {
                const row = dropSteps.find(d => d.step === step);
                if (row) openDrillStep(row.step, row.dropoff, setDrillStep);
              }}
            />
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Step summary</span>
              <InfoHint className="info-hint--sm" title="Step summary">
                <p>Sessions and drop-off for each funnel step in a table.</p>
                <p>Drop-off badge: <strong>red &gt;70%</strong>, amber &gt;40%, green below. <strong>Click a row</strong> to drill into the loss.</p>
              </InfoHint>
              <DownloadCsvButton filename="funnel-step-summary" columns={FUNNEL_CSV_COLUMNS} rows={funnel} />
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th className="num">Sessions</th>
                  <th className="num">Drop-off</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map(r => (
                  <tr
                    key={r.step}
                    className={r.dropoff != null ? 'data-table-row--clickable' : ''}
                    onClick={() => openDrillStep(r.step, r.dropoff, setDrillStep)}
                  >
                    <td>{r.step}</td>
                    <td className="num">{fmtNum(r.visitors)}</td>
                    <td className="num">
                      {r.dropoff == null ? '—' : (
                        <button
                          type="button"
                          className="table-drop-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrillStep(r.step, r.dropoff, setDrillStep);
                          }}
                        >
                          <span className={`badge badge-${r.dropoff > 70 ? 'red' : r.dropoff > 40 ? 'amber' : 'green'}`}>
                            ▼{r.dropoff}%
                          </span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {drillStep && (
        <FunnelDrilldownModal
          stepName={drillStep}
          onClose={() => setDrillStep(null)}
        />
      )}
    </>
  );
}
