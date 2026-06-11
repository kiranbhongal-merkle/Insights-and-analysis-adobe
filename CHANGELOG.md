# Changelog

All notable changes pushed to GCP are recorded here. Keep this file in
sync with each Cloud Run deploy. The git commit SHA in each entry maps
1:1 to the Cloud Run revision and the Artifact Registry image tag, so any
entry can be rolled back (see `DEPLOY.md`).

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **GCP hosting + live BigQuery data.** Express server (`server/`) serves the
  React build and exposes `GET /api/dashboard` with parameterized BigQuery
  queries (no tokens in the browser).
- **Containerization & CI/CD.** `Dockerfile`, `.dockerignore`, and
  `cloudbuild.yaml` build immutable images tagged with the git SHA, push to
  Artifact Registry, and deploy Cloud Run revisions.
- **Docs.** `DEPLOY.md` (setup, deploy, rollback), `.env.example`.

### Changed
- **BigQuery table aligned** to `vdc200006-mena-eng-dev.RHQ_INSIGHTS.User_Journey_Analysis_Adobe` across server, client config, Cloud Build env vars, and docs.
- **Removed Firebase Authentication.** The app has no login screen; access is
  restricted at the Cloud Run ingress level (internal/VPN by default).
- Live rows and the demo CSV share the same aggregation pipeline
  (`buildDemoDataFromRows`).

### Notes
- The BigQuery table/view must expose the columns listed in
  `server/bigquery.js` (same schema as the demo CSV). Add a column there +
  in BigQuery to surface new fields.

<!--
Template for each deploy:

## [YYYY-MM-DD] <short title> — revision <SHORT_SHA>
### Added / Changed / Fixed
- ...
-->
