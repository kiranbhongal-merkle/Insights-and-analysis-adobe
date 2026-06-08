import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { HBarChart } from './Charts';
import InfoHint from './InfoHint';
import DrillPathBar from './DrillPathBar';
import DownloadCsvButton from './DownloadCsvButton';
import { slugify } from '../utils/exportCsv';
import { useDrillPath } from '../hooks/useDrillPath';
import {
  DRILL_DIMENSION_META,
  FUNNEL_DRILL_DIMENSIONS,
  buildFunnelDropoffData,
  getFunnelDropoffInsights,
  getFunnelLostSessions,
  getEffectiveFunnel,
  getDrillPathSummary,
  fmtNum,
  fmtPct,
  dropoffColor,
} from '../utils/helpers';

export default function FunnelDrilldownModal({ stepName, onClose }) {
  const step = getEffectiveFunnel().find(f => f.step === stepName);

  const {
    path,
    dimensionId,
    setDimensionId,
    nextDimensions,
    pushSegment,
    truncatePath,
    clearPath,
    canDrillDeeper,
  } = useDrillPath({
    availableDimensions: FUNNEL_DRILL_DIMENSIONS,
    defaultDimension: 'channel',
    resetKey: stepName,
  });

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const rows = useMemo(
    () => buildFunnelDropoffData(stepName, dimensionId, path),
    [stepName, dimensionId, path],
  );

  const chartData = useMemo(
    () => rows.map(r => ({ dim: r.dimension, value: r.lostSessions })),
    [rows],
  );

  const totals = useMemo(() => {
    let lostSessions = 0;
    let visits = 0;
    let rateWeighted = 0;
    let rateVisits = 0;
    for (const r of rows) {
      lostSessions += Number(r.lostSessions) || 0;
      if (r.visits != null) visits += Number(r.visits) || 0;
      if (r.rate != null && r.visits) {
        rateWeighted += (Number(r.rate) || 0) * (Number(r.visits) || 0);
        rateVisits += Number(r.visits) || 0;
      }
    }
    return {
      lostSessions,
      visits,
      rate: rateVisits > 0 ? parseFloat((rateWeighted / rateVisits).toFixed(2)) : null,
    };
  }, [rows]);

  const dimLabel = DRILL_DIMENSION_META[dimensionId]?.label ?? dimensionId;
  const pathSummary = getDrillPathSummary(path);
  const insights = useMemo(
    () => getFunnelDropoffInsights(stepName, rows, dimLabel),
    [stepName, rows, dimLabel],
  );

  const lostTotal = getFunnelLostSessions(stepName);
  const dropColor = dropoffColor(step?.dropoff ?? 0);

  const handleRowDrill = (rowDim) => {
    if (!canDrillDeeper) return;
    pushSegment(rowDim);
  };

  if (!step) return null;

  const chipDimensions = nextDimensions.length ? nextDimensions : [dimensionId];

  const csvColumns = [
    { key: 'dimension', header: dimLabel },
    { key: 'lostSessions', header: 'Lost sessions' },
    { key: 'contribPct', header: '% of step drop-off', format: v => (v == null ? '' : v.toFixed(2)) },
    { key: 'segDropoff', header: 'Seg. drop-off %', format: v => (v == null ? '' : v.toFixed(2)) },
    { key: 'visits', header: 'Visits' },
    { key: 'rate', header: 'Conv rate %' },
  ];
  const pathSuffix = path.map(p => `${p.dimensionId}-${p.segmentName}`).join('_');
  const csvFilename = slugify(`funnel-dropoff-${stepName}-by-${dimensionId}${pathSuffix ? `-${pathSuffix}` : ''}`);

  return (
  <>
    <div className="drill-overlay" onClick={onClose} aria-hidden="true" />
    <div
      className="drill-modal drill-modal--wide"
      role="dialog"
      aria-modal="true"
      aria-labelledby="funnel-drill-title"
      onClick={e => e.stopPropagation()}
    >
      <div className="drill-modal-header">
        <div>
          <div className="drill-modal-eyebrow">Funnel drop-off drill-down</div>
          <h2 id="funnel-drill-title" className="drill-modal-title">{stepName}</h2>
          <div className="drill-modal-total" style={{ color: dropColor }}>
            ▼{step.dropoff}%
            <span className="drill-modal-total-sub">
              {fmtNum(path.length ? totals.lostSessions : lostTotal)} estimated sessions lost
              {pathSummary
                ? ` · filtered by ${pathSummary.lastDimension}: ${pathSummary.lastSegment}`
                : ' · click a bar or row to drill deeper'}
            </span>
          </div>
        </div>
        <button type="button" className="icon-btn drill-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <DrillPathBar
        rootLabel={stepName}
        path={path}
        onNavigate={truncatePath}
        onClear={clearPath}
      />

      {insights.length > 0 && (
        <div className="drill-insights">
          {insights.map((ins, i) => (
            <div className="insight-card drill-insight-card" key={i}>
              <div className="insight-title">
                {ins.title}
                <span className={`tag tag-${ins.severity === 'red' ? 'red' : ins.severity === 'green' ? 'green' : 'amber'}`}>
                  {ins.severity === 'red' ? 'action' : ins.severity === 'green' ? 'ok' : 'watch'}
                </span>
              </div>
              <div className="insight-body">{ins.body}</div>
            </div>
          ))}
        </div>
      )}

      <div className="builder-section" style={{ marginBottom: 16 }}>
        <div className="builder-section-title">
          Which dimension caused the drop-off?
          {canDrillDeeper && <span className="card-badge card-badge--hint">click chart to go deeper</span>}
        </div>
        <div className="chip-grid">
          {chipDimensions.map(id => (
            <button
              key={id}
              type="button"
              className={`chip ${dimensionId === id ? 'active' : ''}`}
              onClick={() => setDimensionId(id)}
            >
              {DRILL_DIMENSION_META[id]?.label ?? id}
            </button>
          ))}
        </div>
      </div>

      <div className="drill-modal-body">
        <div className="card drill-chart-card">
          <div className="card-header" style={{ marginBottom: 8 }}>
            <span className="card-title">Lost sessions by {dimLabel}</span>
            <InfoHint className="info-hint--sm" title={`Lost sessions by ${dimLabel}`}>
              <p><strong>Lost sessions</strong> = the sessions that dropped off at {stepName}, attributed to each {dimLabel} segment.</p>
              <p>Bar colour reflects that segment's estimated drop-off severity. The attributed losses <strong>sum back to the step total</strong> (shown in the “Total” badge).</p>
              <p><strong>Click a bar</strong> to drill another level deeper.</p>
            </InfoHint>
            <span className="card-badge card-badge--total">
              Total {fmtNum(totals.lostSessions)} lost · {rows.length} segments
            </span>
            <DownloadCsvButton filename={csvFilename} columns={csvColumns} rows={rows} />
          </div>
          {rows.length > 0 ? (
            <HBarChart
              key={`funnel-drill-${dimensionId}-${path.length}`}
              data={chartData}
              xKey="value"
              yKey="dim"
              formatX={fmtNum}
              colorFn={d => dropoffColor(rows.find(r => r.dimension === d.dim)?.segDropoff ?? step.dropoff)}
              height={Math.min(400, rows.length * 40 + 80)}
              onBarClick={canDrillDeeper ? handleRowDrill : undefined}
            />
          ) : (
            <p className="drill-empty">No breakdown for this dimension.</p>
          )}
        </div>

        <div className="card drill-table-card">
          <div className="card-header" style={{ marginBottom: 8 }}>
            <span className="card-title">Attribution detail</span>
            <InfoHint className="info-hint--sm" title="Attribution detail">
              <p><strong>Lost sessions</strong> and <strong>% of step drop-off</strong> per segment, plus that segment's estimated drop-off rate, visits and conv rate.</p>
              <p>The bold <strong>Total</strong> row sums to the step's lost sessions; the drop-off shown is the overall step rate.</p>
            </InfoHint>
          </div>
          <div className="drill-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{dimLabel}</th>
                  <th className="num">Lost sessions</th>
                  <th className="num">% of step drop-off</th>
                  <th className="num">Seg. drop-off</th>
                  <th className="num">Visits</th>
                  <th className="num">Conv rate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr
                    key={r.dimension}
                    className={canDrillDeeper ? 'data-table-row--clickable' : undefined}
                    onClick={canDrillDeeper ? () => handleRowDrill(r.dimension) : undefined}
                    title={canDrillDeeper ? 'Click to drill deeper' : undefined}
                  >
                    <td>{r.dimension}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmtNum(r.lostSessions)}</td>
                    <td className="num">{r.contribPct.toFixed(1)}%</td>
                    <td className="num">
                      <span style={{ color: dropoffColor(r.segDropoff), fontWeight: 600 }}>
                        ▼{r.segDropoff.toFixed(1)}%
                      </span>
                    </td>
                    <td className="num">{r.visits != null ? fmtNum(r.visits) : '—'}</td>
                    <td className="num">
                      {r.rate != null ? fmtPct(r.rate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="data-table-total">
                    <td>Total</td>
                    <td className="num">{fmtNum(totals.lostSessions)}</td>
                    <td className="num">100%</td>
                    <td className="num">
                      <span style={{ color: dropColor, fontWeight: 600 }}>▼{step.dropoff}%</span>
                    </td>
                    <td className="num">{fmtNum(totals.visits)}</td>
                    <td className="num">{totals.rate != null ? fmtPct(totals.rate) : '—'}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  </>
  );
}
