import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { HBarChart } from './Charts';
import InfoHint from './InfoHint';
import DrillPathBar from './DrillPathBar';
import DownloadCsvButton from './DownloadCsvButton';
import { slugify } from '../utils/exportCsv';
import { useDrillPath } from '../hooks/useDrillPath';
import {
  KPI_DRILL_CONFIG,
  DRILL_DIMENSION_META,
  ANALYSIS_SOURCE_META,
  getDrillTargetsForSource,
  buildSegmentDrilldown,
  getSegmentDrillInsights,
  findSourceRow,
  getDrillPathSummary,
  aggregateDrillRows,
  getDrillPrimaryTotal,
  fmtNum,
  fmtUSD,
  fmtPct,
} from '../utils/helpers';

function rateBadgeClass(rate) {
  if (rate == null) return 'amber';
  if (rate >= 2) return 'green';
  if (rate >= 0.5) return 'blue';
  return 'amber';
}

export default function AnalysisDrilldownModal({
  sourceId,
  segmentName,
  metricKey,
  color = '#3266ad',
  onClose,
}) {
  const config = KPI_DRILL_CONFIG[metricKey];
  const targets = useMemo(() => getDrillTargetsForSource(sourceId), [sourceId]);
  const defaultDimension = targets[0] ?? config?.defaultDimension ?? 'channel';
  const resetKey = `${sourceId}|${segmentName}|${metricKey}`;

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
    availableDimensions: targets,
    defaultDimension,
    resetKey,
  });

  const sourceRow = findSourceRow(sourceId, segmentName);
  const meta = ANALYSIS_SOURCE_META[sourceId];

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
    () => buildSegmentDrilldown(sourceId, segmentName, dimensionId, metricKey, path),
    [sourceId, segmentName, dimensionId, metricKey, path],
  );

  const chartData = useMemo(
    () => rows.map(r => ({ dim: r.dimension, value: r.primary })),
    [rows],
  );

  const totals = useMemo(() => aggregateDrillRows(rows), [rows]);
  const primaryTotal = useMemo(() => getDrillPrimaryTotal(rows, metricKey), [rows, metricKey]);

  const dimLabel = DRILL_DIMENSION_META[dimensionId]?.label ?? dimensionId;
  const pathSummary = getDrillPathSummary(path);
  const insights = useMemo(
    () => getSegmentDrillInsights(sourceId, segmentName, metricKey, rows, dimLabel),
    [sourceId, segmentName, metricKey, rows, dimLabel],
  );

  const totalVal = sourceRow ? config?.primaryField(sourceRow) : null;

  const handleRowDrill = (rowDim) => {
    if (!canDrillDeeper) return;
    pushSegment(rowDim);
  };

  if (!config) return null;

  const showVisits = !['visits', 'exits'].includes(metricKey);
  const showConv = !['conv', 'visits', 'exits'].includes(metricKey);
  const showRate = metricKey !== 'rate' && metricKey !== 'exit_rate';
  const showRev = !['rev', 'aov'].includes(metricKey);
  const chipDimensions = nextDimensions.length ? nextDimensions : [dimensionId];

  const csvColumns = [
    { key: 'dimension', header: dimLabel },
    { key: 'primary', header: config.primaryLabel },
    { key: 'contribPct', header: '% of segment', format: v => (v == null ? '' : v.toFixed(2)) },
    ...(showVisits ? [{ key: 'visits', header: 'Visits' }] : []),
    ...(showConv ? [{ key: 'conv', header: 'Conversions' }] : []),
    ...(showRate ? [{ key: 'rate', header: 'Conv rate %' }] : []),
    ...(showRev ? [{ key: 'rev', header: 'Revenue (USD)' }] : []),
  ];
  const pathSuffix = path.map(p => `${p.dimensionId}-${p.segmentName}`).join('_');
  const csvFilename = slugify(`${sourceId}-${segmentName}-${metricKey}-by-${dimensionId}${pathSuffix ? `-${pathSuffix}` : ''}`);

  return (
  <>
    <div className="drill-overlay" onClick={onClose} aria-hidden="true" />
    <div
      className="drill-modal drill-modal--wide"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-drill-title"
      onClick={e => e.stopPropagation()}
    >
      <div className="drill-modal-header">
        <div>
          <div className="drill-modal-eyebrow">{meta?.title ?? 'Segment'} drill-down</div>
          <h2 id="analysis-drill-title" className="drill-modal-title">{segmentName}</h2>
          <div className="drill-modal-total" style={{ color }}>
            {(() => {
              const shown = path.length ? (primaryTotal ?? totalVal) : totalVal;
              return shown != null ? config.formatPrimary(shown) : '—';
            })()}
            <span className="drill-modal-total-sub">
              {config.primaryLabel}
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
        rootLabel={segmentName}
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
                  insight
                </span>
              </div>
              <div className="insight-body">{ins.body}</div>
            </div>
          ))}
        </div>
      )}

      <div className="builder-section" style={{ marginBottom: 16 }}>
        <div className="builder-section-title">
          Break down by
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
            <span className="card-title">{config.primaryLabel} by {dimLabel}</span>
            <InfoHint className="info-hint--sm" title={`${config.primaryLabel} by ${dimLabel}`}>
              <p>Takes the segment you clicked ({segmentName}) and splits its <strong>{config.primaryLabel}</strong> across {dimLabel}.</p>
              <p>Values are <strong>distributed from that segment's total</strong>, so the bars reconcile back to it (shown in the “Total” badge).</p>
              <p><strong>Click a bar</strong> to drill another level deeper.</p>
            </InfoHint>
            <span className="card-badge card-badge--total">
              Total {primaryTotal != null ? config.formatPrimary(primaryTotal) : '—'} · {rows.length} segments
            </span>
            <DownloadCsvButton filename={csvFilename} columns={csvColumns} rows={rows} />
          </div>
          {rows.length > 0 ? (
            <HBarChart
              key={`segment-drill-${dimensionId}-${path.length}`}
              data={chartData}
              xKey="value"
              yKey="dim"
              formatX={config.formatPrimary}
              colorFn={() => color}
              height={Math.min(380, rows.length * 40 + 80)}
              onBarClick={canDrillDeeper ? handleRowDrill : undefined}
            />
          ) : (
            <p className="drill-empty">No breakdown available.</p>
          )}
        </div>

        <div className="card drill-table-card">
          <div className="card-header" style={{ marginBottom: 8 }}>
            <span className="card-title">Detail table</span>
            <InfoHint className="info-hint--sm" title="Detail table">
              <p>Each row is one {dimLabel} slice within {segmentName}, with its share of the segment plus supporting metrics.</p>
              <p>The bold <strong>Total</strong> row reconciles to the segment; rates are recomputed from the totals, not summed.</p>
            </InfoHint>
          </div>
          <div className="drill-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{dimLabel}</th>
                  <th className="num">{config.primaryLabel}</th>
                  <th className="num">% of segment</th>
                  {showVisits && <th className="num">Visits</th>}
                  {showConv && <th className="num">Conversions</th>}
                  {showRate && <th className="num">Conv rate</th>}
                  {showRev && <th className="num">Revenue</th>}
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
                    <td className="num" style={{ fontWeight: 600 }}>{config.formatPrimary(r.primary)}</td>
                    <td className="num">{r.contribPct.toFixed(1)}%</td>
                    {showVisits && <td className="num">{r.visits != null ? fmtNum(r.visits) : '—'}</td>}
                    {showConv && <td className="num">{r.conv != null ? r.conv.toLocaleString() : '—'}</td>}
                    {showRate && (
                      <td className="num">
                        {r.rate != null ? (
                          <span className={`badge badge-${rateBadgeClass(r.rate)}`}>{fmtPct(r.rate)}</span>
                        ) : '—'}
                      </td>
                    )}
                    {showRev && <td className="num">{r.rev != null ? fmtUSD(r.rev) : '—'}</td>}
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="data-table-total">
                    <td>Total</td>
                    <td className="num">{primaryTotal != null ? config.formatPrimary(primaryTotal) : '—'}</td>
                    <td className="num">100%</td>
                    {showVisits && <td className="num">{fmtNum(totals.visits)}</td>}
                    {showConv && <td className="num">{totals.conv.toLocaleString()}</td>}
                    {showRate && <td className="num">{totals.rate != null ? fmtPct(totals.rate) : '—'}</td>}
                    {showRev && <td className="num">{fmtUSD(totals.rev)}</td>}
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
