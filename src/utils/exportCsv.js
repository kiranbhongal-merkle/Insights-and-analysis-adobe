// ============================================================
// CSV export helpers.
//
// Used for the per-chart "Download CSV" buttons and the
// drill-down modals. Columns are described as
//   [{ key, header, format? }]
// and rows are plain objects. Ratio/derived values can be
// pre-formatted via the optional `format` callback.
// ============================================================

/** Escape a single CSV field per RFC 4180. */
function escapeField(value) {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a CSV string from column defs + row objects. */
export function rowsToCsv(columns, rows) {
  const header = columns.map(c => escapeField(c.header ?? c.key)).join(',');
  const body = (rows || []).map(row =>
    columns
      .map(c => {
        const raw = typeof c.accessor === 'function' ? c.accessor(row) : row[c.key];
        const val = typeof c.format === 'function' ? c.format(raw, row) : raw;
        return escapeField(val);
      })
      .join(','),
  );
  return [header, ...body].join('\r\n');
}

/** Turn a label into a filesystem-safe slug. */
export function slugify(text) {
  return String(text || 'export')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'export';
}

/** Trigger a browser download for arbitrary text content. */
export function downloadTextFile(filename, content, mime = 'text/csv;charset=utf-8;') {
  // Prepend a BOM so Excel reads UTF-8 correctly.
  const blob = new Blob(['\uFEFF', content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Convenience: serialize rows and download as a .csv file. */
export function downloadCsv(filename, columns, rows) {
  const name = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  downloadTextFile(name, rowsToCsv(columns, rows));
}
