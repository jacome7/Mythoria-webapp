#!/bin/bash
# Deployment script for Mythoria webapp to Google Cloud Run

set -e  # Exit on any error

echo "🚀 Starting Mythoria deployment process..."

# Configuration
PROJECT_ID="oceanic-beach-460916-n5"
SERVICE_NAME="mythoria-webapp"
REGION="europe-west9"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "Not authenticated with gcloud. Please run 'gcloud auth login'"
        exit 1
    fi
    
    # Check if correct project is set
    CURRENT_PROJECT=$(gcloud config get-value project)
    if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
        log_warning "Current project is $CURRENT_PROJECT, switching to $PROJECT_ID"
        gcloud config set project $PROJECT_ID
    fi
    
    log_success "Prerequisites check passed"
}

# Build and test
build_application() {
    log_info "Building application..."
    
    # Install dependencies
    npm ci
    
    # Run linting
    log_info "Running linter..."
    npm run lint
    
    # Run tests (if available)
    if npm run | grep -q "test"; then
        log_info "Running tests..."
        npm run test
    fi
    
    # Build application
    log_info "Building production bundle..."
    npm run build
    
    log_success "Application built successfully"
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
    log_info "Deploying to Cloud Run..."
    
    # Option 1: Build and submit using Cloud Build with env vars file
    log_info "Using Cloud Build for deployment..."
    if [[ "$SERVICE_NAME" != "mythoria-webapp" ]]; then
        # For staging or custom service names, pass substitutions
        gcloud builds submit --config cloudbuild.yaml --substitutions "_SERVICE_NAME=${SERVICE_NAME},_REGION=${REGION}"
    else
        # For production, use defaults
        gcloud builds submit --config cloudbuild.yaml
    fi
    
    log_success "Deployment completed successfully"
}

# Alternative: Direct deployment using gcloud run deploy
deploy_direct() {
    log_info "Building Docker image locally..."
    
    # Build the image
    docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME} .
    
    # Push the image
    log_info "Pushing image to Container Registry..."
    docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}
    
    # Deploy with environment variables from .env.production.yaml
    log_info "Deploying to Cloud Run with environment variables..."
    gcloud run deploy ${SERVICE_NAME} \
        --image gcr.io/${PROJECT_ID}/${SERVICE_NAME} \
        --region ${REGION} \
        --platform managed \
        --allow-unauthenticated \
        --port 3000 \
        --memory 1Gi \
        --cpu 1 \
        --max-instances 10 \
        --min-instances 0 \
        --env-vars-file .env.production.yaml
    
    log_success "Direct deployment completed successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --format="value(status.url)")
    
    # Test health endpoint
    if curl -sf "${SERVICE_URL}/api/health" > /dev/null; then
        log_success "Health check passed: ${SERVICE_URL}/api/health"
    else
        log_error "Health check failed"
        exit 1
    fi
    
    # Show service info
    log_info "Service information:"
    gcloud run services describe $SERVICE_NAME --region=$REGION \
        --format="table(metadata.name,status.url,status.traffic[0].percent)"
}

# Main deployment process
main() {
    echo "================================="
    echo "   Mythoria Deployment Script   "
    echo "================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    build_application
    echo ""
    
    deploy_to_cloud_run
    echo ""
    
    verify_deployment
    echo ""
    
    log_success "🎉 Deployment completed successfully!"
    echo ""
    echo "Service URL: https://mythoria.pt"
    echo "Admin URL: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --no-build     Skip build step (deploy existing build)"
        echo "  --staging      Deploy to staging environment"
        echo "  --direct       Use direct gcloud deployment instead of Cloud Build"
        echo ""
        exit 0
        ;;
    --no-build)
        echo "Skipping build step..."
        check_prerequisites
        deploy_to_cloud_run
        verify_deployment
        ;;
    --staging)
        echo "Deploying to staging environment..."
        SERVICE_NAME="mythoria-webapp-staging"
        main
        ;;
    --direct)
        echo "Using direct deployment method..."
        check_prerequisites
        build_application
        deploy_direct
        verify_deployment
        ;;
    *)
        main
        ;;
esac
