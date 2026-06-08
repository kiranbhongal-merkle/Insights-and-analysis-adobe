import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function ClickableMetricCard({
  label,
  value,
  sub,
  color = '#3266ad',
  onClick,
  active = false,
}) {
  return (
    <button
      type="button"
      className={`metric-card metric-card--clickable${active ? ' metric-card--active' : ''}`}
      style={{ '--accent-color': color }}
      onClick={onClick}
    >
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
      <div className="metric-drill-hint">
        Explore drivers <ChevronRight size={12} />
      </div>
    </button>
  );
}
