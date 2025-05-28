#!/bin/bash
# Database backup script for Mythoria

set -e

# Configuration
PROJECT_ID="oceanic-beach-460916-n5"
INSTANCE_NAME="mythoria-db"
DATABASE_NAME="mythoria_db"
BACKUP_BUCKET="mythoria-backups"  # You may need to create this bucket
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="mythoria_backup_${TIMESTAMP}"

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

# Create on-demand backup
create_backup() {
    log_info "Creating database backup: $BACKUP_NAME"
    
    gcloud sql backups create \
        --instance=$INSTANCE_NAME \
        --description="Manual backup created on $TIMESTAMP" \
        --project=$PROJECT_ID
    
    log_success "Backup created successfully"
}

# List recent backups
list_backups() {
    log_info "Recent backups for $INSTANCE_NAME:"
    
    gcloud sql backups list \
        --instance=$INSTANCE_NAME \
        --project=$PROJECT_ID \
        --limit=10 \
        --format="table(id,startTime,status,type)"
}

# Export database to Cloud Storage (alternative backup method)
export_database() {
    log_info "Exporting database to Cloud Storage..."
    
    # Check if bucket exists, create if not
    if ! gsutil ls gs://$BACKUP_BUCKET &> /dev/null; then
        log_warning "Backup bucket doesn't exist. Creating gs://$BACKUP_BUCKET"
        gsutil mb gs://$BACKUP_BUCKET
    fi
    
    # Export database
    gcloud sql export sql $INSTANCE_NAME \
        gs://$BACKUP_BUCKET/${BACKUP_NAME}.sql \
        --database=$DATABASE_NAME \
        --project=$PROJECT_ID
    
    log_success "Database exported to gs://$BACKUP_BUCKET/${BACKUP_NAME}.sql"
}

# Restore from backup (use with extreme caution)
restore_backup() {
    local backup_id=$1
    
    if [ -z "$backup_id" ]; then
        log_error "Backup ID required for restore operation"
        echo "Usage: $0 restore <backup_id>"
        echo "Use '$0 list' to see available backups"
        exit 1
    fi
    
    log_warning "WARNING: This will restore the database to backup $backup_id"
    log_warning "This operation is DESTRUCTIVE and cannot be undone!"
    
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" = "yes" ]; then
        log_info "Restoring database from backup $backup_id..."
        
        gcloud sql backups restore $backup_id \
            --restore-instance=$INSTANCE_NAME \
            --project=$PROJECT_ID
        
        log_success "Database restored from backup $backup_id"
    else
        log_info "Restore operation cancelled"
    fi
}

# Main function
main() {
    case "${1:-}" in
        create|backup)
            create_backup
            ;;
        list)
            list_backups
            ;;
        export)
            export_database
            ;;
        restore)
            restore_backup "$2"
            ;;
        --help|-h)
            echo "Mythoria Database Backup Script"
            echo ""
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  create, backup    Create a new database backup"
            echo "  list             List recent backups"
            echo "  export           Export database to Cloud Storage"
            echo "  restore <id>     Restore from backup (DESTRUCTIVE)"
            echo "  --help, -h       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 create        # Create a new backup"
            echo "  $0 list          # List available backups"
            echo "  $0 restore 123   # Restore from backup with ID 123"
            echo ""
            ;;
        *)
            echo "Unknown command. Use --help for usage information."
            exit 1
            ;;
    esac
}

main "$@"
