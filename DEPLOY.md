# Deploying to GCP (Cloud Run + BigQuery, internal only)

The app has **no login screen**. Access is controlled at the infrastructure
layer — typically by restricting Cloud Run to your internal network (VPN/VPC).

**BigQuery source table:**

`vdc200006-mena-eng-dev.RHQ_INSIGHTS.User_Journey_Analysis_Adobe`

```
Browser (on VPN) ──▶ Cloud Run (Express + React)
                         └─(service account)─▶ BigQuery
```

---

## 1. One-time setup

```bash
export PROJECT_ID=vdc200006-mena-eng-dev
export REGION=us-central1
gcloud config set project $PROJECT_ID
```

Enable APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  bigquery.googleapis.com
```

Create Artifact Registry:

```bash
gcloud artifacts repositories create webapp \
  --repository-format=docker --location=$REGION
```

Grant BigQuery read to the runtime / Cloud Build trigger service account:

```bash
# Service account (runtime + Cloud Build trigger):
# user-journey-analysis-adobe@vdc200006-mena-eng-dev.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:user-journey-analysis-adobe@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:user-journey-analysis-adobe@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

# If the table uses dataset-level ACLs, also grant on the dataset:
gcloud bigquery datasets add-iam-policy-binding RHQ_INSIGHTS \
  --project=$PROJECT_ID \
  --member="serviceAccount:user-journey-analysis-adobe@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"
```

### Cloud Run memory & row limit

The app returns row-level BigQuery data as JSON. Cloud Run caps HTTP responses
at **~32 MiB**, so `cloudbuild.yaml` deploys with **2 GiB memory** and
`BQ_ROW_LIMIT=10000`. If you see `Response size was too large` in logs, lower
the limit or narrow the date range in the UI.

To tune without a full redeploy:

```bash
gcloud run services update analytics-webapp --region $REGION \
  --memory=2Gi \
  --set-env-vars="BQ_PROJECT=$PROJECT_ID,BQ_DATASET=RHQ_INSIGHTS,BQ_TABLE=User_Journey_Analysis_Adobe,BQ_LOCATION=US,BQ_ROW_LIMIT=10000"
```

---

## 2. Deploy

`cloudbuild.yaml` defaults to `--ingress=all` for a public Cloud Run URL.
Set `_INGRESS: internal` in the file if your policy requires VPN/VPC-only access.

```bash
gcloud builds submit --config cloudbuild.yaml
```

After deploy, update `CHANGELOG.md` with the date, commit SHA, and a summary.

### Accessing an internal Cloud Run service

From a machine on the VPN/VPC, open the service URL shown in:

```bash
gcloud run services describe analytics-webapp --region $REGION --format='value(status.url)'
```

For local testing against a remote service:

```bash
gcloud run services proxy analytics-webapp --region $REGION --port 8080
# then open http://localhost:8080
```

### If you need a public URL instead

Re-deploy with public ingress (only if your security policy allows it):

```bash
gcloud run services update analytics-webapp \
  --region $REGION --ingress=all
```

For a public URL with Google-account gating (still no in-app login), add
[Cloud IAP](https://cloud.google.com/iap/docs/cloud-run-quickstart) in front
of the service.

---

## 3. Rollback

List revisions:

```bash
gcloud run revisions list --service analytics-webapp --region $REGION
```

Route traffic to a previous revision:

```bash
gcloud run services update-traffic analytics-webapp \
  --region $REGION --to-revisions <REVISION_NAME>=100
```

Each deploy creates an immutable Artifact Registry image tagged with the git
SHA, so you can always roll forward again the same way.

---

## 4. Updating / adding data fields

1. Add the column to your BigQuery table or view.
2. Add the column name to `COLUMNS` in `server/bigquery.js`.
3. If it should appear on a page, map it in `src/utils/loadDemoCsv.js`
   and the relevant page component.
4. Commit, deploy, note it in `CHANGELOG.md`.

---

## 5. Local development

```bash
# Terminal A — backend on :8080
npm run server

# Terminal B — React dev server on :3000 (proxies /api → :8080)
npm start
```

Without the backend running, the app falls back to the bundled demo CSV.

---

## 6. Windows (PowerShell)

Use `$env:VAR` instead of `export VAR`, and run commands on **one line** (or
use backtick `` ` `` for line breaks — not `\`).

```powershell
$env:PROJECT_ID = "vdc200006-mena-eng-dev"
$env:REGION = "us-central1"
gcloud config set project $env:PROJECT_ID

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com bigquery.googleapis.com

gcloud builds submit --config cloudbuild.yaml
```

Or run the helper script from the repo root:

```powershell
.\deploy.ps1
```

---

## 7. Required IAM (ask your GCP admin)

If deploy fails for `kiran.bhongal@merkle.com` (or your account), grant these
roles on project `vdc200006-mena-eng-dev`:

| Role | Why |
|------|-----|
| `roles/serviceusage.serviceUsageConsumer` | Use enabled APIs (`serviceusage.services.use`) |
| `roles/cloudbuild.builds.editor` | Submit Cloud Build jobs |
| `roles/storage.objectAdmin` on bucket `{PROJECT_ID}_cloudbuild` | Upload build source |
| `roles/run.admin` or `roles/run.developer` | Deploy Cloud Run services |
| `roles/artifactregistry.writer` | Push Docker images |
| `roles/iam.serviceAccountUser` on `user-journey-analysis-adobe@PROJECT.iam.gserviceaccount.com` | Deploy using the runtime SA (`iam.serviceaccounts.actAs`) |
| `roles/logging.logWriter` on `user-journey-analysis-adobe@...` | Required when trigger runs as this SA (`logging: CLOUD_LOGGING_ONLY`) |

**Already verified in this project:**

- Artifact Registry repo `webapp` exists (`us-central1`)
- Service account `user-journey-analysis-adobe@vdc200006-mena-eng-dev.iam.gserviceaccount.com` (runtime + trigger)
- `npm run build` succeeds locally (Dockerfile will build when Cloud Build runs)

**Errors seen when permissions are missing:**

```
forbidden from accessing the bucket [PROJECT_cloudbuild]
Permission 'iam.serviceaccounts.actAs' denied on service account user-journey-analysis-adobe@...
Permission denied to enable service [run.googleapis.com]
```

After your admin grants the roles above, re-run:

```powershell
gcloud builds submit --config cloudbuild.yaml
```
