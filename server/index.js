// ============================================================
// Express server
// ------------------------------------------------------------
// Serves the built React app and a JSON API that queries BigQuery
// server-side. Access control is handled at the infrastructure
// layer (Cloud Run ingress / VPC / IAM) — no in-app login.
// ============================================================

const path = require('path');
const express = require('express');

const { getRows, config } = require('./bigquery');

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/api/dashboard', async (req, res) => {
  try {
    const { from, to } = req.query;
    const rows = await getRows({ from, to });
    res.json({ rows, source: config });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('BigQuery query failed:', err);
    res.status(500).json({ error: 'Query failed' });
  }
});

const buildDir = path.join(__dirname, '..', 'build');
app.use(express.static(buildDir));
app.get(/.*/, (_req, res) => res.sendFile(path.join(buildDir, 'index.html')));

const port = process.env.PORT || 8080;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on :${port} (BigQuery ${config.PROJECT}.${config.DATASET}.${config.TABLE})`);
});
