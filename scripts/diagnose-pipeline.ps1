# Quick Diagnosis Script for Pub/Sub → Story Generation Workflow
# This script checks the health of your entire pipeline

param(
    [string]$ProjectId = "oceanic-beach-460916-n5",
    [string]$Region = "europe-west9",
    [string]$TopicName = "mythoria-story-requests",
    [string]$WorkflowName = "mythoria-story-generation",
    [string]$ServiceName = "story-generation-workflow"
)

Write-Host "-� Mythoria Story Generation Pipeline Diagnosis" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Yellow

# Set project
gcloud config set project $ProjectId | Out-Null

# 1. Check Pub/Sub Topic
Write-Host "`n1. Checking Pub/Sub Topic..." -ForegroundColor Cyan
try {
    $topicExists = gcloud pubsub topics describe $TopicName --format="value(name)" 2>$null
    if ($topicExists) {
        Write-Host "   [OK] Topic '$TopicName' exists" -ForegroundColor Green
        
        # Check subscriptions
        $subscriptions = gcloud pubsub subscriptions list --format="value(name)" | Where-Object { $_ -like "*$TopicName*" -or $_ -like "*story*" }
        if ($subscriptions) {
            Write-Host "   [OK] Found subscriptions:" -ForegroundColor Green
            foreach ($sub in $subscriptions) {
                Write-Host "      - $sub" -ForegroundColor Gray
            }
        } else {
            Write-Host "   [ERR]  No subscriptions found for topic" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   [ERR] Topic '$TopicName' not found" -ForegroundColor Red
    }
} catch {
    Write-Host "   [ERR] Error checking topic: $_" -ForegroundColor Red
}

# 2. Check Cloud Workflows
Write-Host "`n2. Checking Cloud Workflows..." -ForegroundColor Cyan
try {
    $workflowExists = gcloud workflows describe $WorkflowName --location=$Region --format="value(name)" 2>$null
    if ($workflowExists) {
        Write-Host "   [OK] Workflow '$WorkflowName' exists" -ForegroundColor Green
        
        # Check workflow state
        $workflowState = gcloud workflows describe $WorkflowName --location=$Region --format="value(state)" 2>$null
        Write-Host "   -> Workflow state: $workflowState" -ForegroundColor Gray
        
        # Check recent executions
        Write-Host "   -> Checking recent executions..." -ForegroundColor Gray
        $executions = gcloud workflows executions list $WorkflowName --location=$Region --limit=5 --format="table(name,state,startTime)" 2>$null
        if ($executions -and $executions.Count -gt 1) {
            Write-Host "   [OK] Recent executions found:" -ForegroundColor Green
            $executions | Select-Object -Skip 1 | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
        } else {
            Write-Host "   ->  No recent executions found" -ForegroundColor Yellow
        }
        
        # Check for ngrok URL issue
        Write-Host "   -> Checking for configuration issues..." -ForegroundColor Gray
        $workflowContent = gcloud workflows describe $WorkflowName --location=$Region --format="value(sourceContents)" 2>$null
        if ($workflowContent -and $workflowContent -like "*ngrok*") {
            Write-Host "   [ERR] CRITICAL: Workflow contains ngrok URL - this won't work in production!" -ForegroundColor Red
            Write-Host "      Found: ngrok URL in workflow definition" -ForegroundColor Red
            Write-Host "      Fix: Update baseUrl to use Cloud Run service URL" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "   [ERR] Workflow '$WorkflowName' not found in region '$Region'" -ForegroundColor Red
    }
} catch {
    Write-Host "   [ERR] Error checking workflow: $_" -ForegroundColor Red
}

# 3. Check Cloud Run Service
Write-Host "`n3. Checking Cloud Run Service..." -ForegroundColor Cyan
try {
    $serviceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)" 2>$null
    if ($serviceUrl) {
        Write-Host "   [OK] Service '$ServiceName' is deployed" -ForegroundColor Green
        Write-Host "   🌐 Service URL: $serviceUrl" -ForegroundColor Gray
        
        # Check service status
        $serviceStatus = gcloud run services describe $ServiceName --region=$Region --format="value(status.conditions[0].status)" 2>$null
        if ($serviceStatus -eq "True") {
            Write-Host "   [OK] Service is ready and healthy" -ForegroundColor Green
        } else {
            Write-Host "   ->  Service status: $serviceStatus" -ForegroundColor Yellow
        }
        
        # Check traffic allocation
        $traffic = gcloud run services describe $ServiceName --region=$Region --format="value(status.traffic[0].percent)" 2>$null
        Write-Host "   -> Traffic allocation: $traffic%" -ForegroundColor Gray
        
        # Test service accessibility (basic)
        Write-Host "   ->� Testing service accessibility..." -ForegroundColor Gray
        try {
            $token = gcloud auth print-identity-token 2>$null
            if ($token) {
                # Try to access health endpoint or root
                $response = Invoke-WebRequest -Uri "$serviceUrl/" -Headers @{"Authorization" = "Bearer $token"} -TimeoutSec 10 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-Host "   [OK] Service is accessible" -ForegroundColor Green
                } else {
                    Write-Host "   ->  Service returned status: $($response.StatusCode)" -ForegroundColor Yellow
                }
            } else {
                Write-Host "   ->  Could not get auth token for service test" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ->  Could not test service accessibility: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "   [ERR] Service '$ServiceName' not found in region '$Region'" -ForegroundColor Red
    }
} catch {
    Write-Host "   [ERR] Error checking service: $_" -ForegroundColor Red
}

# 4. Check IAM and Permissions
Write-Host "`n4. Checking IAM and Permissions..." -ForegroundColor Cyan
try {
    # Check if workflow service account exists
    $workflowSA = "wf-story-gen-sa@$ProjectId.iam.gserviceaccount.com"
    $saExists = gcloud iam service-accounts describe $workflowSA --format="value(email)" 2>$null
    if ($saExists) {
        Write-Host "   [OK] Workflow service account exists: $workflowSA" -ForegroundColor Green
    } else {
        Write-Host "   ->  Workflow service account not found: $workflowSA" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ->  Could not check IAM permissions" -ForegroundColor Yellow
}

# 5. Check Recent Logs
Write-Host "`n5. Checking Recent Logs..." -ForegroundColor Cyan
try {
    Write-Host "   -> Recent workflow logs..." -ForegroundColor Gray
    $workflowLogs = gcloud logs read "resource.type=workflows.googleapis.com/Workflow" --limit=3 --format="value(timestamp,severity,jsonPayload.message)" 2>$null
    if ($workflowLogs) {
        $workflowLogs | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
    } else {
        Write-Host "      No recent workflow logs found" -ForegroundColor Gray
    }
    
    Write-Host "   -> Recent service logs..." -ForegroundColor Gray
    $serviceLogs = gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=$ServiceName" --limit=3 --format="value(timestamp,severity,textPayload)" 2>$null
    if ($serviceLogs) {
        $serviceLogs | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
    } else {
        Write-Host "      No recent service logs found" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ->  Could not fetch recent logs" -ForegroundColor Yellow
}

# Summary and Recommendations
Write-Host "DIAGNOSIS SUMMARY & RECOMMENDATIONS" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Yellow

Write-Host "`n-> Next Steps:" -ForegroundColor Cyan
Write-Host "1. If you see 'ngrok URL' error above:" -ForegroundColor White
Write-Host "   - Update workflows/story-generation.yaml to use correct Cloud Run URL" -ForegroundColor Gray
Write-Host "   - Redeploy the workflow" -ForegroundColor Gray

Write-Host "`n2. If no recent executions:" -ForegroundColor White
Write-Host "   - Run: .\test-pubsub-message.ps1" -ForegroundColor Gray
Write-Host "   - Check if executions appear in workflow list" -ForegroundColor Gray

Write-Host "`n3. If service is not accessible:" -ForegroundColor White
Write-Host "   - Check Cloud Run service logs for errors" -ForegroundColor Gray
Write-Host "   - Verify database connectivity" -ForegroundColor Gray

Write-Host "`n4. For detailed debugging:" -ForegroundColor White
Write-Host "   - See DEBUG-PUBSUB-WORKFLOW.md for step-by-step guide" -ForegroundColor Gray

Write-Host " Run this script again after making fixes to verify resolution" -ForegroundColor Green
