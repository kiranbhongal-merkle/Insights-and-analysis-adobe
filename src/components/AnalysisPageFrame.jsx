import React from 'react';
import AnalysisDrilldownModal from './AnalysisDrilldownModal';
import MetricDrilldownModal from './MetricDrilldownModal';

const KPI_MODAL_COLORS = {
  visits: '#3266ad',
  conv: '#27ae60',
  rate: '#e8913a',
  rev: '#8e44ad',
  aov: '#16a085',
  sess: '#d35400',
  exits: '#dc2626',
  exit_rate: '#d97706',
  abandon: '#e05050',
};

/**
 * Wraps an analysis page: dims background when drill open; renders segment or KPI modal.
 * drill: null | { segment, metricKey, sourceId } | { kpiKey, kpiCard, totalValue } (overview-style)
 */
export default function AnalysisPageFrame({ drill, onCloseDrill, children }) {
  const isKpiDrill = drill?.kpiCard != null;
  const isSegmentDrill = drill?.segment != null && drill?.sourceId != null;

  return (
    <>
      <div className={`page-shell${drill ? ' page-shell--dimmed' : ''}`}>
        {children}
      </div>
      {isSegmentDrill && (
        <AnalysisDrilldownModal
          sourceId={drill.sourceId}
          segmentName={drill.segment}
          metricKey={drill.metricKey}
          color={drill.color ?? KPI_MODAL_COLORS[drill.metricKey] ?? '#3266ad'}
          onClose={onCloseDrill}
        />
      )}
      {isKpiDrill && (
        <MetricDrilldownModal
          kpi={drill.kpiCard}
          totalValue={drill.totalValue}
          onClose={onCloseDrill}
        />
      )}
    </>
  );
}
