import React from 'react';
import { Download } from 'lucide-react';
import { downloadCsv } from '../utils/exportCsv';

/**
 * Compact "Download CSV" button for chart/table card headers and drill modals.
 *
 * Props:
 *  - filename: base file name (without extension)
 *  - columns:  [{ key, header, format?, accessor? }]
 *  - rows:     array of row objects (or a () => rows builder for lazy export)
 *  - label:    optional visible text (defaults to "CSV")
 */
export default function DownloadCsvButton({ filename, columns, rows, label = 'CSV', className = '', title }) {
  const handleClick = (e) => {
    e.stopPropagation();
    const data = typeof rows === 'function' ? rows() : rows;
    if (!data || !data.length) return;
    downloadCsv(filename, columns, data);
  };

  return (
    <button
      type="button"
      className={`btn btn-secondary btn-sm csv-dl-btn ${className}`}
      onClick={handleClick}
      title={title || 'Download this chart\u2019s data as CSV'}
    >
      <Download size={13} />
      {label && <span>{label}</span>}
    </button>
  );
}
