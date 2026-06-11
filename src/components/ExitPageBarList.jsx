import React from 'react';

function ExitPathLabel({ label }) {
  const text = String(label ?? '');
  const parts = text.split(':').map(s => s.trim()).filter(Boolean);

  if (parts.length <= 1) {
    return <span className="exit-bar-label">{text}</span>;
  }

  return (
    <span className="exit-bar-label exit-bar-label--path">
      <span className="exit-path-market">{parts[0]}</span>
      {parts.slice(1).map((seg, i) => (
        <React.Fragment key={`${seg}-${i}`}>
          <span className="exit-path-sep" aria-hidden="true">›</span>
          <span className="exit-path-seg">{seg}</span>
        </React.Fragment>
      ))}
    </span>
  );
}

/**
 * Ranked horizontal bar list for exit pages — HTML layout so long paths wrap cleanly.
 */
export default function ExitPageBarList({
  rows,
  valueKey,
  labelKey = 'label',
  formatValue,
  colorFn,
  maxValue,
  valueColumnLabel = 'Value',
  showThreshold60 = false,
  onRowClick,
}) {
  const max = maxValue ?? Math.max(...rows.map(r => Number(r[valueKey]) || 0), 1);

  return (
    <div className="exit-bar-list">
      <div className="exit-bar-list-header" aria-hidden="true">
        <span className="exit-bar-rank" />
        <span>Page path</span>
        <span />
        <span>{valueColumnLabel}</span>
      </div>
      <div role="list">
        {rows.map((row, index) => {
          const val = Number(row[valueKey]) || 0;
          const pct = max > 0 ? Math.max((val / max) * 100, val > 0 ? 1.5 : 0) : 0;
          const label = row[labelKey];
          const color = colorFn?.(row) ?? '#3266ad';

          return (
            <button
              key={label}
              type="button"
              className="exit-bar-row"
              role="listitem"
              onClick={() => onRowClick?.(label, row)}
              title={onRowClick ? `Drill into ${label}` : label}
            >
              <span className="exit-bar-rank">{index + 1}</span>
              <ExitPathLabel label={label} />
              <span
                className={`exit-bar-track${showThreshold60 ? ' exit-bar-track--rate' : ''}`}
                aria-hidden="true"
              >
                <span
                  className="exit-bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                />
              </span>
              <span className="exit-bar-value">{formatValue(val, row)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
