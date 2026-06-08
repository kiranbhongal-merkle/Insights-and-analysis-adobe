import React from 'react';
import { ChevronRight } from 'lucide-react';
import { DRILL_DIMENSION_META } from '../utils/helpers';

export default function DrillPathBar({ rootLabel, path, onNavigate, onClear }) {
  if (!path?.length) return null;

  return (
    <div className="drill-path-bar">
      <span className="drill-path-label">Drill path</span>
      <button type="button" className="drill-path-crumb drill-path-crumb--root" onClick={onClear}>
        {rootLabel}
      </button>
      {path.map((step, i) => (
        <React.Fragment key={`${step.dimensionId}-${step.segmentName}-${i}`}>
          <ChevronRight size={12} className="drill-path-sep" aria-hidden />
          <button
            type="button"
            className={`drill-path-crumb${i === path.length - 1 ? ' drill-path-crumb--active' : ''}`}
            onClick={() => onNavigate(i + 1)}
          >
            <span className="drill-path-crumb-dim">{DRILL_DIMENSION_META[step.dimensionId]?.label ?? step.dimensionId}</span>
            <span className="drill-path-crumb-val">{step.segmentName}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
