#!/bin/bash
# Environment setup script for Mythoria development

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Check if required tools are installed
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("Node.js")
    else
        local node_version=$(node --version | sed 's/v//')
        local required_version="18.0.0"
        if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
            log_warning "Node.js version $node_version found, but version 18+ is recommended"
        else
            log_success "Node.js version $node_version ✓"
        fi
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    else
        log_success "npm $(npm --version) ✓"
    fi
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        missing_tools+=("PostgreSQL")
    else
        log_success "PostgreSQL ✓"
    fi
    
    # Check gcloud (optional for local dev)
    if ! command -v gcloud &> /dev/null; then
        log_warning "gcloud CLI not found (optional for local development)"
    else
        log_success "gcloud CLI ✓"
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Please install the missing tools and run this script again."
        echo ""
        echo "Installation guides:"
        echo "- Node.js: https://nodejs.org/"
        echo "- PostgreSQL: https://www.postgresql.org/download/"
        echo "- gcloud CLI: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

# Setup environment file
setup_env_file() {
    log_info "Setting up environment file..."
    
    if [ -f ".env.local" ]; then
        log_warning ".env.local already exists"
        read -p "Do you want to overwrite it? (y/N): " overwrite
        if [[ ! $overwrite =~ ^[Yy]$ ]]; then
            log_info "Skipping .env.local setup"
            return
        fi
    fi
    
    if [ ! -f ".env.example" ]; then
        log_error ".env.example not found"
        return 1
    fi
    
    cp .env.example .env.local
    log_success "Created .env.local from .env.example"
    
    log_warning "Please edit .env.local and configure:"
    echo "  - Database connection details"
    echo "  - Clerk authentication keys"
    echo "  - Other environment-specific settings"
}

# Install dependencies
install_dependencies() {
    log_info "Installing npm dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "Dependencies installed"
}

# Setup database
setup_database() {
    log_info "Setting up database..."
    
    # Check if .env.local exists and has database config
    if [ ! -f ".env.local" ]; then
        log_error ".env.local not found. Please run environment setup first."
        return 1
    fi
    
    # Source environment variables
    set -a
    source .env.local
    set +a
    
    # Check if database connection works
    log_info "Testing database connection..."
    
    if node test-connection.js; then
        log_success "Database connection successful"
        
        # Run database setup
        log_info "Running database migrations..."
        npm run db:migrate
        
        log_info "Seeding database..."
        npm run db:seed
        
        log_success "Database setup completed"
    else
        log_error "Database connection failed"
        echo ""
        echo "Please check your database configuration in .env.local:"
        echo "- DB_HOST"
        echo "- DB_PORT"
        echo "- DB_NAME"
        echo "- DB_USER"
        echo "- DB_PASSWORD"
        echo ""
        echo "Make sure PostgreSQL is running and the database exists."
        return 1
    fi
}

# Generate development certificates (if needed)
setup_dev_certificates() {
    log_info "Setting up development certificates..."
    
    # This is optional for local development
    # You can add mkcert setup here if needed for HTTPS in development
    
    log_info "Development certificates setup skipped (HTTP is fine for local dev)"
}

# Run initial build
initial_build() {
    log_info "Running initial build..."
    
    npm run build
    
    log_success "Initial build completed"
}

# Print setup summary
print_summary() {
    echo ""
    echo "================================="
    echo "   Setup Completed Successfully! "
    echo "================================="
    echo ""
    log_success "Your Mythoria development environment is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Review and update .env.local with your specific configuration"
    echo "2. Start the development server: npm run dev"
    echo "3. Open http://localhost:3000 in your browser"
    echo ""
    echo "Useful commands:"
    echo "- npm run dev          # Start development server"
    echo "- npm run db:studio    # Open database studio"
    echo "- npm run lint         # Run linter"
    echo "- npm run build        # Build for production"
    echo ""
    echo "Documentation:"
    echo "- Development guide: docs/development/setup.md"
    echo "- API documentation: docs/api/README.md"
    echo "- Architecture: docs/architecture/overview.md"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Mythoria Environment Setup Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h           Show this help message"
        echo "  --skip-deps         Skip dependency installation"
        echo "  --skip-db           Skip database setup"
        echo "  --skip-build        Skip initial build"
        echo ""
        echo "This script will:"
        echo "1. Check prerequisites"
        echo "2. Set up environment file (.env.local)"
        echo "3. Install dependencies"
        echo "4. Set up database"
        echo "5. Run initial build"
        echo ""
        exit 0
        ;;
esac

# Main setup process
main() {
    echo "================================="
    echo "   Mythoria Environment Setup   "
    echo "================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    setup_env_file
    echo ""
    
    if [[ "$*" != *"--skip-deps"* ]]; then
        install_dependencies
        echo ""
    fi
    
    if [[ "$*" != *"--skip-db"* ]]; then
        setup_database
        echo ""
    fi
    
    setup_dev_certificates
    echo ""
    
    if [[ "$*" != *"--skip-build"* ]]; then
        initial_build
        echo ""
    fi
    
    print_summary
}

main "$@"
