# Step-by-Step Pub/Sub to Story-Generation-Workflow Debugging Guide

## Overview
This guide helps you identify where the problem is in your Pub/Sub message → Story Generation Workflow pipeline.

## Architecture Flow
```
WebApp → Pub/Sub Topic → Cloud Workflows → Cloud Run Service
```

## Step-by-Step Debugging Process

### Step 1: Verify Pub/Sub Message Publishing
**Goal**: Confirm messages are being published to the topic

```powershell
# Run your test script
.\scripts\test-pubsub-message.ps1

# Check if topic exists and messages are being published
gcloud pubsub topics list | findstr mythoria-story-requests

# Check topic details
gcloud pubsub topics describe mythoria-story-requests

# Check if there are any subscriptions
gcloud pubsub subscriptions list | findstr mythoria
```

**Expected Result**: Topic exists and message is published successfully

**If this fails**: 
- Check if you're authenticated: `gcloud auth list`
- Check if project is set: `gcloud config get-value project`
- Verify topic permissions: `gcloud pubsub topics get-iam-policy mythoria-story-requests`

### Step 2: Verify Cloud Workflows Trigger
**Goal**: Confirm Cloud Workflows is triggered by Pub/Sub messages

```powershell
# List all workflows
gcloud workflows list --location=europe-west9

# Check if mythoria-story-generation workflow exists
gcloud workflows describe mythoria-story-generation --location=europe-west9

# Check workflow executions (recent activity)
gcloud workflows executions list mythoria-story-generation --location=europe-west9 --limit=10

# Get detailed execution logs for latest execution
# Replace EXECUTION_ID with actual ID from above command
gcloud workflows executions describe EXECUTION_ID --workflow=mythoria-story-generation --location=europe-west9
```

**Expected Result**: 
- Workflow exists and is deployed
- New executions appear after publishing messages
- Executions show proper status (ACTIVE, SUCCEEDED, or FAILED)

**If this fails**:
- Workflow might not exist or not be deployed
- Pub/Sub trigger might not be configured
- Check workflow deployment in Cloud Console

### Step 3: Check Pub/Sub Subscription and Trigger Configuration
**Goal**: Verify the connection between Pub/Sub and Cloud Workflows

```powershell
# Check if there's a subscription for the workflow
gcloud pubsub subscriptions list

# Check workflow trigger configuration
gcloud workflows describe mythoria-story-generation --location=europe-west9 --format="yaml" | findstr -i "trigger\|pubsub"
```

**Expected Result**: 
- A subscription should exist that connects the topic to the workflow
- Workflow should have Pub/Sub trigger configuration

**If this fails**:
- The Pub/Sub trigger for the workflow wasn't configured during deployment
- Need to redeploy the workflow with proper trigger configuration

### Step 4: Check Cloud Run Service Status
**Goal**: Verify the Story Generation Workflow service is running and accessible

```powershell
# Check if Cloud Run service is deployed and running
gcloud run services list --region=europe-west9 | findstr story-generation-workflow

# Get service details
gcloud run services describe story-generation-workflow --region=europe-west9

# Check recent logs from the service
gcloud logs read "resource.type=cloud_run_revision" --filter="resource.labels.service_name=story-generation-workflow" --limit=50 --format="table(timestamp,severity,textPayload)"

# Test if service is accessible (health check)
# Note: The baseUrl in your workflow is using ngrok, which might be the issue!
curl -X GET "https://story-generation-workflow-803421888801.europe-west9.run.app/health" -H "Authorization: Bearer $(gcloud auth print-identity-token)"
```

**Expected Result**: 
- Service is deployed and running
- Health check returns 200 OK
- Recent logs show service activity

**⚠️ CRITICAL ISSUE DETECTED**: Your workflow YAML shows:
```yaml
baseUrl: "https://097a-2001-818-de82-dd00-d993-94dc-2153-facd.ngrok-free.app"
```
This is an ngrok URL which is likely not accessible from Cloud Workflows!

### Step 5: Fix the Base URL Issue
**Goal**: Update the workflow to use the correct Cloud Run service URL

The workflow should use:
```yaml
baseUrl: "https://story-generation-workflow-803421888801.europe-west9.run.app"
```

Check your deployed workflow:
```powershell
# Download current workflow definition
gcloud workflows describe mythoria-story-generation --location=europe-west9 --format="export" > current-workflow.yaml

# Check what baseUrl is configured
findstr "baseUrl" current-workflow.yaml
```

### Step 6: Check Database Connectivity
**Goal**: Verify the workflow service can connect to the database

```powershell
# Check if database is accessible from Cloud Run
gcloud run services describe story-generation-workflow --region=europe-west9 --format="yaml" | findstr -i "vpc\|database"

# Check database connection logs
gcloud logs read "resource.type=cloud_run_revision" --filter="resource.labels.service_name=story-generation-workflow AND textPayload:database" --limit=20
```

### Step 7: End-to-End Test with Debugging
**Goal**: Run a complete test with maximum logging

```powershell
# Enable debug logging (if your service supports it)
# Update Cloud Run service with LOG_LEVEL=debug
gcloud run services update story-generation-workflow --region=europe-west9 --set-env-vars="LOG_LEVEL=debug"

# Run your test script
.\scripts\test-pubsub-message.ps1

# Monitor logs in real-time
gcloud logs tail "resource.type=cloud_run_revision" --filter="resource.labels.service_name=story-generation-workflow"

# Also monitor workflow execution logs
gcloud logs tail "resource.type=workflows.googleapis.com/Workflow"
```

## Most Likely Issues Based on Your Setup

### 1. 🚨 **NGrok URL in Workflow** (CRITICAL)
Your workflow is trying to call an ngrok URL which won't work in production.

**Fix**: Update the workflow YAML to use the proper Cloud Run URL and redeploy.

### 2. **Workflow Not Deployed with Pub/Sub Trigger**
The workflow might exist but not have the Pub/Sub trigger configured.

**Fix**: Redeploy the workflow ensuring the Pub/Sub trigger is properly configured.

### 3. **Service Authentication Issues**
Cloud Workflows might not have permission to call your Cloud Run service.

**Fix**: Ensure the workflow service account has Cloud Run Invoker permissions.

### 4. **Database Connection Issues**
The Cloud Run service might not be able to connect to your PostgreSQL database.

**Fix**: Check VPC connector configuration and database firewall rules.

## Quick Diagnosis Commands

Run these commands to get a quick overview:

```powershell
# Quick status check
Write-Host "=== Quick Diagnosis ===" -ForegroundColor Yellow

# 1. Check Pub/Sub topic
Write-Host "1. Pub/Sub Topic:" -ForegroundColor Cyan
gcloud pubsub topics describe mythoria-story-requests --format="value(name)" 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "   ✅ Topic exists" -ForegroundColor Green } else { Write-Host "   ❌ Topic missing" -ForegroundColor Red }

# 2. Check Cloud Workflows
Write-Host "2. Cloud Workflows:" -ForegroundColor Cyan
gcloud workflows describe mythoria-story-generation --location=europe-west9 --format="value(name)" 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "   ✅ Workflow exists" -ForegroundColor Green } else { Write-Host "   ❌ Workflow missing" -ForegroundColor Red }

# 3. Check Cloud Run service
Write-Host "3. Cloud Run Service:" -ForegroundColor Cyan
gcloud run services describe story-generation-workflow --region=europe-west9 --format="value(status.url)" 2>$null
if ($LASTEXITCODE -eq 0) { Write-Host "   ✅ Service deployed" -ForegroundColor Green } else { Write-Host "   ❌ Service missing" -ForegroundColor Red }

# 4. Check recent workflow executions
Write-Host "4. Recent Workflow Executions:" -ForegroundColor Cyan
$executions = gcloud workflows executions list mythoria-story-generation --location=europe-west9 --limit=5 --format="value(name)" 2>$null
if ($executions) { 
    Write-Host "   ✅ Recent executions found:" -ForegroundColor Green
    $executions | ForEach-Object { Write-Host "      - $_" -ForegroundColor Gray }
} else { 
    Write-Host "   ❌ No recent executions" -ForegroundColor Red 
}

Write-Host "=== End Diagnosis ===" -ForegroundColor Yellow
```

## Next Steps

1. **Run the Quick Diagnosis commands above**
2. **Fix the NGrok URL issue first** (most likely cause)
3. **Follow the step-by-step debugging process**
4. **Check the specific error messages in logs**

Would you like me to help you fix any specific issues found during this debugging process?
