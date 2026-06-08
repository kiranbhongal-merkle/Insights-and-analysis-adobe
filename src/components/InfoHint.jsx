import React from 'react';
import { Info } from 'lucide-react';

/** “How to read” copy shown on hover/focus of the (i) control. */
export default function InfoHint({ title = 'How to read', children, className = '' }) {
  return (
    <div className={`info-hint ${className}`.trim()}>
      <button
        type="button"
        className="info-hint-btn"
        aria-label={title}
        aria-describedby={title.replace(/\s+/g, '-').toLowerCase()}
      >
        <Info size={15} strokeWidth={2.25} />
      </button>
      <div
        className="info-hint-popover"
        id={title.replace(/\s+/g, '-').toLowerCase()}
        role="tooltip"
      >
        <div className="info-hint-popover-title">{title}</div>
        <div className="info-hint-popover-body">{children}</div>
      </div>
    </div>
  );
}
