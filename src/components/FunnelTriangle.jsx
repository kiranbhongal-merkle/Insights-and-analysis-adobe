import React from 'react';
import { ChevronRight } from 'lucide-react';
import { fmtNum, dropoffColor } from '../utils/helpers';

/**
 * Fixed funnel width ratios from 100% at the top down to minPct at the last step.
 * e.g. 5 steps → 100%, 80%, 60%, 40%, 20%; more/fewer steps scale evenly in between.
 */
export function funnelWidthRatios(count, { topPct = 100, minPct = 20, tipPct = 10 } = {}) {
  if (count <= 0) return [];
  if (count === 1) return [topPct, tipPct];
  const stepWidths = Array.from({ length: count }, (_, i) =>
    topPct - (i * (topPct - minPct)) / (count - 1),
  );
  return [...stepWidths, tipPct];
}

/**
 * Inverted-triangle funnel — each step is a trapezoid with fixed descending width ratios.
 * Session counts are shown as labels; shape uses illustrative 100→80→60→… proportions.
 */
export default function FunnelTriangle({ steps, colors, activeStep, onStepClick }) {
  const widthPoints = funnelWidthRatios(steps.length);

  return (
    <div className="funnel-pyramid" role="list" aria-label="Conversion funnel">
      {steps.map((step, i) => {
        const topPct = widthPoints[i];
        const bottomPct = widthPoints[i + 1];
        const topInset = (100 - topPct) / 2;
        const bottomInset = (100 - bottomPct) / 2;
        const hasDrop = step.dropoff != null;
        const isActive = activeStep === step.step;

        return (
          <div
            key={step.step}
            className={`funnel-pyramid-row${hasDrop ? ' funnel-pyramid-row--drillable' : ''}${isActive ? ' funnel-pyramid-row--active' : ''}`}
            role="listitem"
          >
            <button
              type="button"
              className="funnel-pyramid-segment-btn"
              disabled={!hasDrop}
              onClick={() => hasDrop && onStepClick?.(step)}
              aria-label={hasDrop ? `Explore drop-off at ${step.step}` : `${step.step}, ${fmtNum(step.visitors)} sessions`}
            >
              <div
                className="funnel-pyramid-segment"
                style={{
                  clipPath: `polygon(${topInset}% 0%, ${100 - topInset}% 0%, ${100 - bottomInset}% 100%, ${bottomInset}% 100%)`,
                  background: colors[i % colors.length],
                }}
              >
                <div className="funnel-pyramid-inner">
                  <span className="funnel-pyramid-step">{step.step}</span>
                  <span className="funnel-pyramid-visitors">{fmtNum(step.visitors)} sessions</span>
                </div>
              </div>
            </button>
            <div className="funnel-pyramid-meta">
              {hasDrop ? (
                <button
                  type="button"
                  className="funnel-drop-btn"
                  style={{ color: dropoffColor(step.dropoff) }}
                  onClick={() => onStepClick?.(step)}
                >
                  ▼{step.dropoff}%
                  <ChevronRight size={12} className="funnel-drop-chevron" />
                </button>
              ) : (
                <span className="funnel-pyramid-drop-empty">Entry</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
