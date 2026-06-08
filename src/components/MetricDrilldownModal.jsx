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
  buildDrilldownData,
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

export default function MetricDrilldownModal({ kpi, totalValue, onClose }) {
  const config = KPI_DRILL_CONFIG[kpi.key];
  const defaultDimension = config?.defaultDimension ?? 'channel';

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
    availableDimensions: config?.dimensions ?? [],
    defaultDimension,
    resetKey: kpi.key,
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
    () => buildDrilldownData(kpi.key, dimensionId, path),
    [kpi.key, dimensionId, path],
  );

  const chartData = useMemo(
    () => rows.map(r => ({ dim: r.dimension, value: r.primary })),
    [rows],
  );

  const totals = useMemo(() => aggregateDrillRows(rows), [rows]);
  const primaryTotal = useMemo(() => getDrillPrimaryTotal(rows, kpi.key), [rows, kpi.key]);

  const dimLabel = DRILL_DIMENSION_META[dimensionId]?.label ?? dimensionId;
  const pathSummary = getDrillPathSummary(path);

  const handleRowDrill = (rowDim) => {
    if (!canDrillDeeper) return;
    pushSegment(rowDim);
  };

  const showVisits = kpi.key !== 'visits';
  const showConv = !['conv', 'visits'].includes(kpi.key);
  const showRate = kpi.key !== 'rate';
  const showRev = !['rev', 'aov'].includes(kpi.key);
  const showAov = kpi.key !== 'aov';
  const showSess = kpi.key !== 'sess';
  const showContrib = path.length > 0;

  if (!config) return null;

  const chipDimensions = nextDimensions.length ? nextDimensions : [dimensionId];

  const csvColumns = [
    { key: 'dimension', header: dimLabel },
    { key: 'primary', header: config.primaryLabel },
    ...(showContrib ? [{ key: 'contribPct', header: '% share', format: v => (v == null ? '' : v.toFixed(2)) }] : []),
    ...(showVisits ? [{ key: 'visits', header: 'Visits' }] : []),
    ...(showConv ? [{ key: 'conv', header: 'Conversions' }] : []),
    ...(showRate ? [{ key: 'rate', header: 'Conv rate %' }] : []),
    ...(showRev ? [{ key: 'rev', header: 'Revenue (USD)' }] : []),
    ...(showAov ? [{ key: 'aov', header: 'AOV (USD)' }] : []),
    ...(showSess ? [{ key: 'sess', header: 'Avg session (min)' }] : []),
  ];
  const pathSuffix = path.map(p => `${p.dimensionId}-${p.segmentName}`).join('_');
  const csvFilename = slugify(`drilldown-${kpi.key}-by-${dimensionId}${pathSuffix ? `-${pathSuffix}` : ''}`);

  return (
  <>
    <div className="drill-overlay" onClick={onClose} aria-hidden="true" />
    <div
      className="drill-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drill-modal-title"
      onClick={e => e.stopPropagation()}
    >
      <div className="drill-modal-header">
        <div>
          <div className="drill-modal-eyebrow">Metric drill-down</div>
          <h2 id="drill-modal-title" className="drill-modal-title">{kpi.label}</h2>
          <div className="drill-modal-total" style={{ color: kpi.color }}>
            {kpi.fmt(path.length ? (primaryTotal ?? totalValue) : totalValue)}
            <span className="drill-modal-total-sub">
              {pathSummary
                ? `filtered by ${pathSummary.lastDimension}: ${pathSummary.lastSegment}`
                : kpi.sub}
            </span>
          </div>
        </div>
        <button type="button" className="icon-btn drill-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <DrillPathBar
        rootLabel={kpi.label}
        path={path}
        onNavigate={truncatePath}
        onClear={clearPath}
      />

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
              <p>Shows how <strong>{config.primaryLabel}</strong> splits across {dimLabel}.</p>
              <p>Once you drill in, the breakdown is <strong>distributed from the parent segment</strong> so the bars add back up to its total — the “Total” badge always reconciles.</p>
              <p>Use the chips above to change dimension, or <strong>click a bar</strong> to go one level deeper.</p>
            </InfoHint>
            <span className="card-badge card-badge--total">
              Total {primaryTotal != null ? config.formatPrimary(primaryTotal) : '—'} · {rows.length} segments
            </span>
            <DownloadCsvButton filename={csvFilename} columns={csvColumns} rows={rows} />
          </div>
          {rows.length > 0 ? (
            <HBarChart
              key={`kpi-drill-${dimensionId}-${path.length}`}
              data={chartData}
              xKey="value"
              yKey="dim"
              formatX={config.formatPrimary}
              colorFn={() => kpi.color}
              height={Math.min(420, rows.length * 40 + 80)}
              onBarClick={canDrillDeeper ? handleRowDrill : undefined}
            />
          ) : (
            <p className="drill-empty">No data for this dimension.</p>
          )}
        </div>

        <div className="card drill-table-card">
          <div className="card-header" style={{ marginBottom: 8 }}>
            <span className="card-title">Detail table</span>
            <InfoHint className="info-hint--sm" title="Detail table">
              <p>Each row is one segment with its primary metric plus supporting figures (visits, conversions, revenue…).</p>
              <p><strong>% share</strong> = the segment's contribution to the parent. The bold <strong>Total</strong> row reconciles to the parent — rates and AOV are recomputed from the totals, not summed.</p>
            </InfoHint>
          </div>
          <div className="drill-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{dimLabel}</th>
                  <th className="num">{config.primaryLabel}</th>
                  {showContrib && <th className="num">% share</th>}
                  {showVisits && <th className="num">Visits</th>}
                  {showConv && <th className="num">Conversions</th>}
                  {showRate && <th className="num">Conv rate</th>}
                  {showRev && <th className="num">Revenue</th>}
                  {showAov && <th className="num">AOV</th>}
                  {showSess && <th className="num">Avg session</th>}
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
                    {showContrib && <td className="num">{r.contribPct?.toFixed(1) ?? '—'}%</td>}
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
                    {showAov && <td className="num">{r.aov != null ? fmtUSD(r.aov) : '—'}</td>}
                    {showSess && <td className="num">{r.sess != null ? `${parseFloat(r.sess).toFixed(2)}m` : '—'}</td>}
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="data-table-total">
                    <td>Total</td>
                    <td className="num">{primaryTotal != null ? config.formatPrimary(primaryTotal) : '—'}</td>
                    {showContrib && <td className="num">100%</td>}
                    {showVisits && <td className="num">{fmtNum(totals.visits)}</td>}
                    {showConv && <td className="num">{totals.conv.toLocaleString()}</td>}
                    {showRate && <td className="num">{totals.rate != null ? fmtPct(totals.rate) : '—'}</td>}
                    {showRev && <td className="num">{fmtUSD(totals.rev)}</td>}
                    {showAov && <td className="num">{totals.aov != null ? fmtUSD(totals.aov) : '—'}</td>}
                    {showSess && <td className="num">{totals.sess != null ? `${totals.sess.toFixed(2)}m` : '—'}</td>}
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
