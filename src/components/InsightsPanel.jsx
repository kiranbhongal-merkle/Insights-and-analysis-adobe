import React from 'react';
import InfoHint from './InfoHint';

const TONE_CLASS = {
  green: 'tag-green',
  red: 'tag-red',
  amber: 'tag-amber',
  blue: 'tag-blue',
};

/**
 * Renders a row of data-driven insight cards.
 * `insights` is an array of { tone, tag, title, body }.
 * Pass `title` to show a small section heading with an info hint.
 */
export default function InsightsPanel({ insights, title = 'Key insights' }) {
  if (!insights || !insights.length) return null;

  return (
    <div className="insights-section">
      <div className="insights-heading">
        <span className="insights-heading-title">{title}</span>
        <InfoHint className="info-hint--sm" title="Key insights">
          <p>Automatically generated from the data currently in view.</p>
          <p>They <strong>recalculate whenever you change the date range</strong> or any filter, so the takeaways always match what's on screen.</p>
        </InfoHint>
      </div>
      <div className="insight-row">
        {insights.map((it, i) => (
          <div className="insight-card" key={i}>
            <div className="insight-title">
              {it.title}
              {it.tag && <span className={`tag ${TONE_CLASS[it.tone] || 'tag-blue'}`}>{it.tag}</span>}
            </div>
            <div className="insight-body">{it.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
