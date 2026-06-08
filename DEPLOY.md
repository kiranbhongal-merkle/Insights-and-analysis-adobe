# Deploying to GCP (Cloud Run + BigQuery, internal only)

The app has **no login screen**. Access is controlled at the infrastructure
layer — typically by restricting Cloud Run to your internal network (VPN/VPC).

```
Browser (on VPN) ──▶ Cloud Run (Express + React)
                         └─(service account)─▶ BigQuery
```

---

## 1. One-time setup

```bash
export PROJECT_ID=vdc200007-samsung-rhq-prod
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

Create a runtime service account and grant BigQuery read:

```bash
gcloud iam service-accounts create analytics-webapp \
  --display-name="Analytics WebApp runtime"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:analytics-webapp@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:analytics-webapp@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

---

## 2. Deploy (internal / VPN-only — recommended)

`cloudbuild.yaml` defaults to `--ingress=internal`, so the service is **not
reachable from the public internet**. Colleagues access it only when connected
to your corporate VPN or VPC.

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
