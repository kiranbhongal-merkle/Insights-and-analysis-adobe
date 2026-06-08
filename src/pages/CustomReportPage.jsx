import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { SAMPLE_DATA, fmtNum, fmtUSD, fmtPct, CHART_COLORS } from '../utils/helpers';
import InfoHint from '../components/InfoHint';
import DownloadCsvButton from '../components/DownloadCsvButton';
import { ANALYSIS_METRIC_LABELS, ANALYSES } from '../config/bigquery';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie
} from 'recharts';

const ALL_METRICS = [
  { key: 'metric_1', label: 'Primary Count (visits/visitors/exits)' },
  { key: 'metric_2', label: 'Secondary Count (conversions/prev step)' },
  { key: 'metric_3', label: 'Rate % (conv rate / drop-off / exit rate)' },
  { key: 'metric_4', label: 'Revenue (USD)' },
  { key: 'metric_5', label: 'AOV / Sub-Rate (USD or %)' },
  { key: 'metric_6', label: 'Avg Session Duration (mins)' },
];

const ALL_DIMS = [
  { key: 'dimension', label: 'Segment / Channel / Page / Country' },
  { key: 'date',      label: 'Date' },
  { key: 'analysis',  label: 'Analysis Type' },
];

const CHART_TYPES = ['bar', 'horizontal_bar', 'line', 'pie'];

const FILTER_OPS = ['=', '!=', 'LIKE', 'NOT LIKE', '>', '<', '>=', '<='];

const DEFAULT_REPORTS = [
  {
    id: 'r1', name: 'Revenue by Channel', saved: true,
    analysis: 'A2_CHANNEL_CONVERSION', metrics: ['metric_4', 'metric_3'],
    dimension: 'dimension', chartType: 'horizontal_bar',
    filters: [], dateFrom: '2026-01-01', dateTo: '2026-04-30',
  },
  {
    id: 'r2', name: 'Funnel Drop-off Overview', saved: true,
    analysis: 'A1_FUNNEL_DROPOFF', metrics: ['metric_1', 'metric_3'],
    dimension: 'dimension', chartType: 'bar',
    filters: [], dateFrom: '2026-01-01', dateTo: '2026-04-30',
  },
  {
    id: 'r3', name: 'Country Conversion Rate', saved: true,
    analysis: 'A6_COUNTRY', metrics: ['metric_3', 'metric_1'],
    dimension: 'dimension', chartType: 'horizontal_bar',
    filters: [], dateFrom: '2026-01-01', dateTo: '2026-04-30',
  },
];

function getSampleForAnalysis(analysis) {
  const map = {
    A2_CHANNEL_CONVERSION: SAMPLE_DATA.channel.map(d => ({ dimension: d.dim, metric_1: d.visits, metric_2: d.conv, metric_3: d.rate, metric_4: d.rev, metric_5: d.rev / (d.conv || 1), metric_6: 4.2 })),
    A1_FUNNEL_DROPOFF:     SAMPLE_DATA.funnel.map(d => ({ dimension: d.step, metric_1: d.visitors, metric_2: d.visitors * 0.9, metric_3: d.dropoff || 0, metric_4: 0, metric_5: 0, metric_6: 0 })),
    A3_PAGE_EXIT:          SAMPLE_DATA.exits.map(d => ({ dimension: d.label, metric_1: d.exits, metric_2: d.pv, metric_3: d.rate, metric_4: 0, metric_5: 0, metric_6: 0 })),
    A4_DEVICE_ABANDONMENT: SAMPLE_DATA.device.map(d => ({ dimension: d.dim, metric_1: d.visits, metric_2: d.purch, metric_3: d.rate, metric_4: d.abandon, metric_5: 0, metric_6: 0 })),
    A5_KPI_SUMMARY:        SAMPLE_DATA.kpi.map(d => ({ dimension: d.date, metric_1: d.visits, metric_2: d.conversions, metric_3: d.conv_rate, metric_4: d.revenue, metric_5: d.aov, metric_6: d.avg_session })),
    A6_COUNTRY:            SAMPLE_DATA.country.map(d => ({ dimension: d.dim, metric_1: d.visits, metric_2: d.conv, metric_3: d.rate, metric_4: d.rev, metric_5: 3.2, metric_6: 0 })),
    A7_USER_TYPE:          SAMPLE_DATA.usertype.map(d => ({ dimension: d.dim, metric_1: d.visits, metric_2: d.conv, metric_3: d.rate, metric_4: d.rev, metric_5: d.rev / (d.conv || 1), metric_6: d.sess })),
    A8_BROWSER:            SAMPLE_DATA.browser.map(d => ({ dimension: d.dim, metric_1: d.visits, metric_2: d.conv, metric_3: d.rate, metric_4: d.rev, metric_5: 3.0, metric_6: 0 })),
    A9_LAST_TOUCH_CHANNEL: SAMPLE_DATA.lasttouch.map(d => ({ dimension: d.dim, metric_1: d.visits, metric_2: d.conv, metric_3: d.rate, metric_4: d.rev, metric_5: d.rev / (d.conv || 1), metric_6: 0 })),
  };
  return map[analysis] || SAMPLE_DATA.channel.map(d => ({ dimension: d.dim, metric_1: d.visits, metric_3: d.rate, metric_4: d.rev }));
}

function formatMetricValue(key, value) {
  if (value == null) return '—';
  if (key === 'metric_3') return fmtPct(value);
  if (key === 'metric_4' || key === 'metric_5') return fmtUSD(value);
  if (key === 'metric_6') return value.toFixed(1) + 'm';
  return fmtNum(value);
}

function ReportChart({ report, data }) {
  const primaryMetric = report.metrics[0];
  const TIP = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 };

  if (report.chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} dataKey={primaryMetric} nameKey="dimension" cx="50%" cy="50%"
            innerRadius="40%" outerRadius="70%"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={TIP} formatter={v => formatMetricValue(primaryMetric, v)} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (report.chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="dimension" tick={{ fontSize: 10, fill: 'var(--text2)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text2)' }} />
          <Tooltip contentStyle={TIP} />
          {report.metrics.map((m, i) => (
            <Line key={m} dataKey={m} stroke={CHART_COLORS[i]} strokeWidth={2} dot={false}
              name={ANALYSIS_METRIC_LABELS[report.analysis]?.[m] || m} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (report.chartType === 'horizontal_bar') {
    const h = Math.max(280, data.length * 36 + 60);
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text2)' }}
            tickFormatter={v => formatMetricValue(primaryMetric, v)} />
          <YAxis type="category" dataKey="dimension" width={150} tick={{ fontSize: 11, fill: 'var(--text2)' }} />
          <Tooltip contentStyle={TIP} formatter={v => formatMetricValue(primaryMetric, v)} />
          <Bar dataKey={primaryMetric} radius={[0, 3, 3, 0]}
            name={ANALYSIS_METRIC_LABELS[report.analysis]?.[primaryMetric] || primaryMetric}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.8} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // default: vertical bar
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="dimension" tick={{ fontSize: 10, fill: 'var(--text2)' }} angle={-20} textAnchor="end" />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text2)' }} tickFormatter={v => formatMetricValue(primaryMetric, v)} />
        <Tooltip contentStyle={TIP} formatter={v => formatMetricValue(primaryMetric, v)} />
        {report.metrics.map((m, i) => (
          <Bar key={m} dataKey={m} fill={CHART_COLORS[i]} radius={[3,3,0,0]} fillOpacity={0.8}
            name={ANALYSIS_METRIC_LABELS[report.analysis]?.[m] || m} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function ReportCard({ report, onEdit, onDelete, onDuplicate }) {
  const [expanded, setExpanded] = useState(true);
  const data = getSampleForAnalysis(report.analysis);

  const csvColumns = [
    { key: 'dimension', header: 'Dimension' },
    ...report.metrics.map(m => ({
      key: m,
      header: ANALYSIS_METRIC_LABELS[report.analysis]?.[m] || m,
    })),
  ];

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="card-title">{report.name}</span>
          <span className="card-badge">{ANALYSES[report.analysis]?.label}</span>
          {report.saved && <span className="card-badge" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>saved</span>}
          <InfoHint className="info-hint--sm" title={report.name}>
            <p>A custom report: the chart plots your selected <strong>metrics</strong> across the chosen <strong>dimension</strong>, for the date range and filters you set.</p>
            <p>Use <strong>Edit</strong> to change metrics, dimension, chart type, filters or dates; <strong>Duplicate</strong> to branch a variant.</p>
          </InfoHint>
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <DownloadCsvButton
            className="csv-dl-btn--inline"
            filename={`custom-report-${report.name}`}
            columns={csvColumns}
            rows={data}
          />
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(report)}>Edit</button>
          <button className="btn btn-secondary btn-sm" onClick={() => onDuplicate(report)}>Duplicate</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(report.id)}><Trash2 size={13} /></button>
        </div>
      </div>

      {expanded && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Metrics: {report.metrics.map(m => ANALYSIS_METRIC_LABELS[report.analysis]?.[m] || m).join(', ')}</span>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Chart: {report.chartType}</span>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{report.dateFrom} → {report.dateTo}</span>
          </div>
          <ReportChart report={report} data={data} />
          <div style={{ marginTop: 14, overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dimension</th>
                  {report.metrics.map(m => (
                    <th key={m} className="num">{ANALYSIS_METRIC_LABELS[report.analysis]?.[m] || m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 8).map((row, i) => (
                  <tr key={i}>
                    <td>{row.dimension}</td>
                    {report.metrics.map(m => (
                      <td key={m} className="num">{formatMetricValue(m, row[m])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ReportEditor({ report, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...report });

  const toggleMetric = (key) => {
    setDraft(d => ({
      ...d,
      metrics: d.metrics.includes(key)
        ? d.metrics.filter(m => m !== key)
        : [...d.metrics, key]
    }));
  };

  const addFilter = () => {
    setDraft(d => ({ ...d, filters: [...d.filters, { field: 'dimension', op: 'LIKE', value: '' }] }));
  };
  const removeFilter = (i) => {
    setDraft(d => ({ ...d, filters: d.filters.filter((_, idx) => idx !== i) }));
  };
  const updateFilter = (i, key, val) => {
    setDraft(d => ({
      ...d,
      filters: d.filters.map((f, idx) => idx === i ? { ...f, [key]: val } : f)
    }));
  };

  return (
    <div className="report-builder">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
          {report.id.startsWith('new') ? 'New Report' : 'Edit Report'}
        </h3>
        <button className="icon-btn" onClick={onCancel}><X size={16} /></button>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="form-field">
          <label>Report name</label>
          <input type="text" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
        </div>
        <div className="form-field">
          <label>Analysis (data source)</label>
          <select value={draft.analysis} onChange={e => setDraft(d => ({ ...d, analysis: e.target.value, metrics: ['metric_1'] }))}>
            {Object.entries(ANALYSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="builder-section">
        <div className="builder-section-title">Metrics (select 1–4)</div>
        <div className="chip-grid">
          {ALL_METRICS.map(m => {
            const label = ANALYSIS_METRIC_LABELS[draft.analysis]?.[m.key];
            if (!label) return null;
            const active = draft.metrics.includes(m.key);
            return (
              <div key={m.key} className={`chip ${active ? 'active' : ''}`} onClick={() => toggleMetric(m.key)}>
                {active && '✓ '}{label}
              </div>
            );
          })}
        </div>
      </div>

      <div className="builder-section">
        <div className="builder-section-title">Chart type</div>
        <div className="chip-grid">
          {CHART_TYPES.map(t => (
            <div key={t} className={`chip ${draft.chartType === t ? 'active' : ''}`}
              onClick={() => setDraft(d => ({ ...d, chartType: t }))}>
              {t.replace('_', ' ')}
            </div>
          ))}
        </div>
      </div>

      <div className="builder-section">
        <div className="builder-section-title">Date range</div>
        <div className="form-row">
          <div className="form-field"><label>From</label><input type="date" value={draft.dateFrom} onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))} /></div>
          <div className="form-field"><label>To</label><input type="date" value={draft.dateTo} onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))} /></div>
        </div>
      </div>

      <div className="builder-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="builder-section-title" style={{ marginBottom: 0 }}>Filters</div>
          <button className="btn btn-secondary btn-sm" onClick={addFilter}><Plus size={13} /> Add filter</button>
        </div>
        {draft.filters.map((f, i) => (
          <div key={i} className="filter-row">
            <select value={f.field} onChange={e => updateFilter(i, 'field', e.target.value)}>
              {ALL_DIMS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            <select value={f.op} onChange={e => updateFilter(i, 'op', e.target.value)}>
              {FILTER_OPS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            <input type="text" value={f.value} placeholder="value…" onChange={e => updateFilter(i, 'value', e.target.value)} style={{ flex: 1 }} />
            <button className="btn btn-danger btn-sm" onClick={() => removeFilter(i)}><Trash2 size={13} /></button>
          </div>
        ))}
        {draft.filters.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>No filters — showing all data.</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave({ ...draft, saved: true })}>
          <Save size={14} /> Save report
        </button>
      </div>
    </div>
  );
}

export default function CustomReportPage() {
  const [reports, setReports] = useState(DEFAULT_REPORTS);
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const handleSave = useCallback((updated) => {
    setReports(rs => rs.some(r => r.id === updated.id)
      ? rs.map(r => r.id === updated.id ? updated : r)
      : [...rs, updated]
    );
    setEditing(null);
    setShowNew(false);
  }, []);

  const handleDelete = useCallback((id) => {
    if (window.confirm('Delete this report?')) {
      setReports(rs => rs.filter(r => r.id !== id));
    }
  }, []);

  const handleDuplicate = useCallback((report) => {
    const copy = { ...report, id: 'r' + Date.now(), name: report.name + ' (copy)', saved: false };
    setReports(rs => [...rs, copy]);
  }, []);

  const newBlank = () => ({
    id: 'new_' + Date.now(), name: 'Untitled Report', saved: false,
    analysis: 'A2_CHANNEL_CONVERSION', metrics: ['metric_4', 'metric_3'],
    dimension: 'dimension', chartType: 'horizontal_bar',
    filters: [], dateFrom: '2026-01-01', dateTo: '2026-04-30',
  });

  if (editing) {
    return <ReportEditor report={editing} onSave={handleSave} onCancel={() => setEditing(null)} />;
  }
  if (showNew) {
    return <ReportEditor report={newBlank()} onSave={handleSave} onCancel={() => setShowNew(false)} />;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="info-banner" style={{ marginBottom: 0 }}>
            <strong>Custom Reports</strong> — build, edit, and save any combination of metrics, dimensions, chart types, and filters.
            Each report runs against your BigQuery data when connected.
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 16, flexShrink: 0 }} onClick={() => setShowNew(true)}>
          <Plus size={14} /> New report
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {reports.map(r => (
          <ReportCard
            key={r.id} report={r}
            onEdit={setEditing}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        ))}
        {reports.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 12 }}>No reports yet.</div>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={14} /> Create your first report</button>
          </div>
        )}
      </div>
    </>
  );
}
