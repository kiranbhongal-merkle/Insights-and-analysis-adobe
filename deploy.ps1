# Deploy analytics-webapp to Cloud Run (Windows PowerShell)
# Requires: gcloud CLI, IAM roles listed in DEPLOY.md

param(
  [string]$ProjectId = "vdc200006-mena-eng-dev",
  [string]$Region = "us-central1",
  [ValidateSet("internal", "all")]
  [string]$Ingress = "internal"
)

$ErrorActionPreference = "Stop"

Write-Host "Setting project: $ProjectId" -ForegroundColor Cyan
gcloud config set project $ProjectId

Write-Host "`nDeploying via Cloud Build (cloudbuild.yaml)..." -ForegroundColor Cyan
gcloud builds submit --config cloudbuild.yaml `
  --substitutions="_INGRESS=$Ingress"

if ($LASTEXITCODE -ne 0) {
  Write-Host "`nCloud Build failed. Trying direct Cloud Run deploy from source..." -ForegroundColor Yellow
  gcloud run deploy analytics-webapp `
    --source . `
    --region $Region `
    --platform managed `
    --service-account "analytics-webapp@${ProjectId}.iam.gserviceaccount.com" `
    --ingress $Ingress `
    --no-allow-unauthenticated `
    --set-env-vars "BQ_PROJECT=$ProjectId,BQ_DATASET=RHQ_INSIGHTS,BQ_TABLE=User_Journey_Analysis_Adobe,BQ_LOCATION=US" `
    --quiet
}

Write-Host "`nService URL:" -ForegroundColor Green
gcloud run services describe analytics-webapp --region $Region --format="value(status.url)"

Write-Host "`nTip: internal ingress requires VPN. To test locally:" -ForegroundColor Yellow
Write-Host "  gcloud run services proxy analytics-webapp --region $Region --port 8080"
