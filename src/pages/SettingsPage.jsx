import React, { useState } from 'react';
import { useApp } from '../App';
import { FX_RATES } from '../config/bigquery';
import { Save, RefreshCw, ExternalLink, Copy } from 'lucide-react';

const DEPLOY_STEPS = [
  { n: '01', title: 'Build the app', cmd: 'npm run build', desc: 'Creates optimised static files in /build' },
  { n: '02', title: 'Install gcloud CLI', cmd: 'curl https://sdk.cloud.google.com | bash', desc: 'Then: gcloud auth login' },
  { n: '03', title: 'Create App Engine app', cmd: 'gcloud app create --project=PROJECT_ID', desc: 'One-time setup per project' },
  { n: '04', title: 'Deploy to App Engine', cmd: 'gcloud app deploy', desc: 'Auto-scales, no server management' },
  { n: '05', title: 'Enable BigQuery API', cmd: 'gcloud services enable bigquery.googleapis.com --project=PROJECT_ID', desc: 'Required for data access' },
  { n: '06', title: 'Grant BQ access', cmd: 'gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:PROJECT@appspot.gserviceaccount.com" --role="roles/bigquery.dataViewer"', desc: 'Give App Engine SA read access to BigQuery' },
];

const APP_YAML = `runtime: nodejs18
env: standard

handlers:
  - url: /static
    static_dir: build/static

  - url: /(.*\\.(json|ico|js|css|png|jpg|svg))$
    static_files: build/\\1
    upload: build/.*\\.(json|ico|js|css|png|jpg|svg)$

  - url: /.*
    static_files: build/index.html
    upload: build/index.html

automatic_scaling:
  min_instances: 1
  max_instances: 10`;

export default function SettingsPage() {
  const { token, setToken, connected } = useApp();
  const [tokenInput, setTokenInput]   = useState('');
  const [fxRates, setFxRates]         = useState(
    Object.entries(FX_RATES).map(([k, v]) => ({ currency: k, ...v }))
  );
  const [saved, setSaved] = useState(false);

  const connect = () => {
    if (tokenInput.trim()) {
      setToken(tokenInput.trim());
      setTokenInput('');
    }
  };

  const disconnect = () => setToken(null);

  const updateRate = (i, field, val) => {
    setFxRates(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  };

  const saveFX = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const copy = (text) => navigator.clipboard.writeText(text).catch(() => {});

  return (
    <>
      {/* BigQuery Connection */}
      <div className="card">
        <div className="settings-section">
          <div className="settings-section-title">BigQuery Connection</div>
          <div className="setting-row">
            <div>
              <div className="setting-label">Connection status</div>
              <div className="setting-desc">
                {connected ? 'Connected to BigQuery with your access token.' : 'Using local demo data.'}
              </div>
            </div>
            <span className={`tag ${connected ? 'tag-green' : 'tag-amber'}`}>
              {connected ? '● Connected' : '○ Demo mode'}
            </span>
          </div>
          <div style={{ marginTop: 16 }}>
            {!connected ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                  Paste a Google OAuth2 access token to connect to BigQuery.
                  Get one via: <code style={{ fontSize: 11, background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>gcloud auth print-access-token</code>
                </div>
                <div className="form-row">
                  <input type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)}
                    placeholder="ya29.a0AfH6..." style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }} />
                  <button className="btn btn-primary" onClick={connect}>Connect</button>
                </div>
              </>
            ) : (
              <button className="btn btn-danger btn-sm" onClick={disconnect}>Disconnect</button>
            )}
          </div>
        </div>
      </div>

      {/* FX Rates Editor */}
      <div className="card">
        <div className="settings-section" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            <div className="settings-section-title" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>Currency → USD Exchange Rates</div>
            <button className="btn btn-primary btn-sm" onClick={saveFX}>
              <Save size={13} /> {saved ? 'Saved!' : 'Save rates'}
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>
            These rates normalise revenue to USD. Update them when exchange rates change.
            Changes here regenerate the SQL CASE statement automatically.
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Currency</th><th>Name</th><th>Operation</th><th className="num">Rate</th></tr>
            </thead>
            <tbody>
              {fxRates.map((r, i) => (
                <tr key={r.currency}>
                  <td><strong>{r.currency}</strong></td>
                  <td><input type="text" value={r.label} onChange={e => updateRate(i, 'label', e.target.value)}
                    style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 12, width: '100%' }} /></td>
                  <td>
                    <select value={r.op} onChange={e => updateRate(i, 'op', e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', background: 'var(--surface)', color: 'var(--text)', fontSize: 12 }}>
                      <option value="divide">÷ divide</option>
                      <option value="multiply">× multiply</option>
                      <option value="passthrough">= passthrough</option>
                    </select>
                  </td>
                  <td className="num">
                    <input type="number" value={r.rate} onChange={e => updateRate(i, 'rate', parseFloat(e.target.value))}
                      style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, textAlign: 'right', width: 100 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Auto-generated SQL */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Auto-generated SQL CASE (copy into your BigQuery query)
            </div>
            <pre className="sql-block">
{`CASE
${fxRates.map(r => {
  if (r.op === 'divide')      return `  WHEN currency = '${r.currency}' THEN SAFE_DIVIDE(hit_revenue, ${r.rate})`;
  if (r.op === 'multiply')    return `  WHEN currency = '${r.currency}' THEN hit_revenue * ${r.rate}`;
  return `  WHEN currency = '${r.currency}' THEN hit_revenue  -- passthrough`;
}).join('\n')}
  ELSE hit_revenue  -- unmapped currencies
END AS hit_revenue_usd`}
            </pre>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
              onClick={() => copy(fxRates.map(r => r.op === 'divide' ? `  WHEN currency = '${r.currency}' THEN SAFE_DIVIDE(hit_revenue, ${r.rate})` : r.op === 'multiply' ? `  WHEN currency = '${r.currency}' THEN hit_revenue * ${r.rate}` : `  WHEN currency = '${r.currency}' THEN hit_revenue`).join('\n'))}>
              <Copy size={13} /> Copy SQL
            </button>
          </div>
        </div>
      </div>

      {/* GCP Deployment Guide */}
      <div className="card">
        <div className="settings-section-title">Deploy to GCP — Step-by-step</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
          Deploy this webapp to Google App Engine for a permanent URL with automatic BigQuery auth via workload identity.
        </div>

        {/* app.yaml */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            1. Create app.yaml in your project root
          </div>
          <pre className="sql-block">{APP_YAML}</pre>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => copy(APP_YAML)}>
            <Copy size={13} /> Copy app.yaml
          </button>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DEPLOY_STEPS.map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 14, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--navy)', color: '#cadcfc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{s.n}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{s.title}</div>
                <code style={{ fontSize: 11, background: '#0d1117', color: '#e6edf3', padding: '4px 8px', borderRadius: 4, display: 'block', marginBottom: 4, fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre' }}>{s.cmd}</code>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.desc}</div>
              </div>
              <button className="icon-btn" style={{ height: 28, width: 28 }} onClick={() => copy(s.cmd)} title="Copy command">
                <Copy size={13} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: 14, background: '#dbeafe', borderRadius: 8, fontSize: 12, color: '#1e40af' }}>
          <strong>On GCP, OAuth tokens are not needed.</strong> The App Engine service account automatically
          authenticates with BigQuery. Just grant it <code>roles/bigquery.dataViewer</code> on your dataset.
        </div>
      </div>
    </>
  );
}
