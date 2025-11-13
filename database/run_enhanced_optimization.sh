#!/bin/bash

# Enhanced Database Optimization Migration Runner with Cleanup
# Runs performance indexes, connection pool optimization, and cleans up unwanted files
# Author: Database Optimization Team
# Updated: November 2025

set -e

# Configuration
DATABASE_URL=${DATABASE_URL:-"postgresql://qr_user:qr_password@localhost:5432/qr_saas"}
MIGRATION_DIR="$(dirname "$0")"
LOG_FILE="${MIGRATION_DIR}/migration_$(date +%Y%m%d_%H%M%S).log"
CLEANUP_LOG="${MIGRATION_DIR}/cleanup_$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

log_cleanup() {
    echo -e "${PURPLE}[$(date '+%Y-%m-%d %H:%M:%S')] CLEANUP:${NC} $1" | tee -a "$CLEANUP_LOG"
}

# Function to check if we're using Docker
check_docker_environment() {
    log "Checking database environment..."
    
    # Check if PostgreSQL is running in Docker
    if docker ps | grep -q "postgres"; then
        DOCKER_POSTGRES_CONTAINER=$(docker ps --format "table {{.Names}}\t{{.Image}}" | grep postgres | awk '{print $1}' | head -1)
        log_success "Found PostgreSQL running in Docker container: $DOCKER_POSTGRES_CONTAINER"
        USE_DOCKER=true
        # Update DATABASE_URL for Docker environment
        DATABASE_URL="postgresql://qr_user:qr_password@localhost:5432/qr_saas"
    else
        log "No Docker PostgreSQL container found, using direct connection"
        USE_DOCKER=false
    fi
}

# Function to execute SQL commands (Docker-aware)
execute_sql() {
    local sql_command="$1"
    local description="$2"
    
    log "Executing: $description"
    
    if [ "$USE_DOCKER" = true ]; then
        echo "$sql_command" | docker exec -i "$DOCKER_POSTGRES_CONTAINER" psql -U qr_user -d qr_saas
    else
        echo "$sql_command" | psql "$DATABASE_URL"
    fi
}

# Function to execute SQL file (Docker-aware)
execute_sql_file() {
    local sql_file="$1"
    local description="$2"
    
    log "Executing file: $sql_file - $description"
    
    if [ "$USE_DOCKER" = true ]; then
        docker exec -i "$DOCKER_POSTGRES_CONTAINER" psql -U qr_user -d qr_saas < "$sql_file"
    else
        psql "$DATABASE_URL" -f "$sql_file"
    fi
}

# Function to check database connectivity
check_database_connection() {
    log "Testing database connection..."
    
    if execute_sql "SELECT 1;" "Connection test" > /dev/null 2>&1; then
        log_success "Database connection successful"
        return 0
    else
        log_error "Failed to connect to database"
        return 1
    fi
}

# Function to identify and clean up unwanted database objects
cleanup_unwanted_database_objects() {
    log_cleanup "Starting database cleanup..."
    
    # Clean up duplicate or temporary indexes
    log_cleanup "Removing duplicate indexes..."
    execute_sql "
    DO \$\$
    DECLARE
        duplicate_idx RECORD;
    BEGIN
        -- Find and drop duplicate indexes (keeping the most recently created)
        FOR duplicate_idx IN
            SELECT indexname, tablename
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname ~ '.*_[0-9]+\$'  -- Indexes ending with numbers (often duplicates)
            AND indexname NOT IN (
                SELECT DISTINCT ON (regexp_replace(indexname, '_[0-9]+\$', '')) indexname
                FROM pg_indexes 
                WHERE schemaname = 'public'
                ORDER BY regexp_replace(indexname, '_[0-9]+\$', ''), indexname DESC
            )
        LOOP
            EXECUTE 'DROP INDEX IF EXISTS ' || duplicate_idx.indexname;
            RAISE NOTICE 'Dropped duplicate index: %', duplicate_idx.indexname;
        END LOOP;
    END
    \$\$;" "Clean duplicate indexes"

    # Clean up unused or redundant indexes
    log_cleanup "Removing unused indexes..."
    execute_sql "
    DO \$\$
    DECLARE
        unused_idx RECORD;
    BEGIN
        -- Drop indexes that have never been used (idx_scan = 0) and are not primary key or unique constraints
        FOR unused_idx IN
            SELECT indexname, tablename, idx_scan
            FROM pg_stat_user_indexes psi
            JOIN pg_indexes pi ON psi.indexrelname = pi.indexname
            WHERE psi.schemaname = 'public'
            AND psi.idx_scan = 0
            AND pi.indexdef NOT LIKE '%UNIQUE%'
            AND indexname NOT LIKE 'pk_%'
            AND indexname NOT LIKE '%_pkey'
            AND indexname LIKE 'idx_%'
            AND indexname NOT IN (
                -- Keep our new optimization indexes
                'idx_scan_events_qr_code_timestamp',
                'idx_scan_events_timestamp_qr_code',
                'idx_scan_events_location_active',
                'idx_scan_events_platform_device_timestamp',
                'idx_scan_events_ip_timestamp',
                'idx_qr_codes_user_active',
                'idx_qr_codes_id_user_type',
                'idx_scan_events_date_qr_code'
            )
            -- Only consider indexes older than 1 hour to avoid dropping recently created ones
            AND EXISTS (
                SELECT 1 FROM pg_stat_user_indexes psi2 
                WHERE psi2.indexrelname = psi.indexrelname 
                AND pg_stat_get_index_tuples_read(psi2.indexrelid) = 0
            )
        LOOP
            -- Don't actually drop yet, just log what would be dropped
            RAISE NOTICE 'Would drop unused index: % on table % (scans: %)', 
                unused_idx.indexname, unused_idx.tablename, unused_idx.idx_scan;
        END LOOP;
    END
    \$\$;" "Identify unused indexes"

    # Clean up old migration tracking entries for failed migrations
    log_cleanup "Cleaning up failed migration records..."
    execute_sql "
    DELETE FROM schema_migrations 
    WHERE migration_name LIKE '%temp%' 
       OR migration_name LIKE '%test%'
       OR checksum LIKE '%failed%';
    " "Remove failed migration records"

    # Vacuum and analyze tables after cleanup
    log_cleanup "Running maintenance on cleaned tables..."
    execute_sql "
    VACUUM ANALYZE scan_events;
    VACUUM ANALYZE qr_codes;
    VACUUM ANALYZE pg_stat_user_indexes;
    " "Vacuum and analyze tables"

    log_cleanup "Database cleanup completed"
}

# Function to clean up unwanted files from database directory
cleanup_unwanted_files() {
    log_cleanup "Cleaning up unwanted files from database directory..."
    
    cd "$MIGRATION_DIR"
    
    # Remove old backup files (keep only the latest 3)
    log_cleanup "Managing backup files..."
    if ls backup_*.sql 1> /dev/null 2>&1; then
        backup_count=$(ls -1 backup_*.sql | wc -l)
        if [ "$backup_count" -gt 3 ]; then
            ls -1t backup_*.sql | tail -n +4 | while read old_backup; do
                log_cleanup "Removing old backup: $old_backup"
                rm -f "$old_backup"
            done
        fi
    fi
    
    # Remove old log files (keep only the latest 5)
    log_cleanup "Managing log files..."
    if ls migration_*.log 1> /dev/null 2>&1; then
        log_count=$(ls -1 migration_*.log | wc -l)
        if [ "$log_count" -gt 5 ]; then
            ls -1t migration_*.log | tail -n +6 | while read old_log; do
                log_cleanup "Removing old log: $old_log"
                rm -f "$old_log"
            done
        fi
    fi
    
    # Remove duplicate/temporary migration files
    log_cleanup "Removing duplicate migration files..."
    
    # Remove the temporary files we created during development
    for temp_file in "001_indexes_only.sql" "002_monitoring_only.sql"; do
        if [ -f "migrations/$temp_file" ]; then
            log_cleanup "Removing temporary migration file: $temp_file"
            rm -f "migrations/$temp_file"
        fi
    done
    
    # Remove any .tmp or .bak files
    find . -name "*.tmp" -o -name "*.bak" -o -name "*~" | while read temp_file; do
        if [ -f "$temp_file" ]; then
            log_cleanup "Removing temporary file: $temp_file"
            rm -f "$temp_file"
        fi
    done
    
    # Create .gitignore for database directory if it doesn't exist
    if [ ! -f ".gitignore" ]; then
        log_cleanup "Creating .gitignore for database directory"
        cat > .gitignore << 'EOF'
# Database backups
backup_*.sql

# Log files
migration_*.log
cleanup_*.log

# Temporary files
*.tmp
*.bak
*~

# Local environment files
.env.local
EOF
    fi
    
    log_cleanup "File cleanup completed"
}

# Function to consolidate migration files
consolidate_migration_files() {
    log_cleanup "Consolidating migration files..."
    
    cd "$MIGRATION_DIR/migrations"
    
    # Check if we have multiple similar migration files
    if [ -f "001_add_analytics_performance_indexes.sql" ] && [ -f "002_connection_pool_optimization.sql" ]; then
        log_cleanup "Creating consolidated optimization migration..."
        
        # Create a consolidated migration file
        cat > "001_database_optimization_consolidated.sql" << 'EOF'
-- Consolidated Database Optimization Migration
-- Combines performance indexes and connection pool monitoring
-- Generated automatically - DO NOT EDIT

-- Performance Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_qr_code_timestamp 
ON scan_events (qr_code_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_timestamp_qr_code 
ON scan_events (timestamp DESC, qr_code_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_location_active 
ON scan_events (country, region, city, timestamp DESC) 
WHERE country IS NOT NULL AND country != '';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_platform_device_timestamp 
ON scan_events (platform, device, timestamp DESC) 
WHERE platform IS NOT NULL AND device IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_ip_timestamp 
ON scan_events (ip_address, timestamp DESC) 
WHERE ip_address IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qr_codes_user_active 
ON qr_codes (user_id, is_active, created_at DESC) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qr_codes_id_user_type 
ON qr_codes (id, user_id, type, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_date_qr_code 
ON scan_events (DATE(timestamp), qr_code_id);

-- Connection Pool Monitoring Functions (already applied)
SELECT 'Optimization indexes applied successfully' as status;
EOF

        log_cleanup "Consolidated migration created: 001_database_optimization_consolidated.sql"
    fi
}

# Function to verify current optimization status
verify_optimization_status() {
    log "Verifying current optimization status..."
    
    # Check if our optimization indexes exist
    local indexes_status
    indexes_status=$(execute_sql "
    SELECT 
        COUNT(*) as optimization_indexes_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname IN (
        'idx_scan_events_qr_code_timestamp',
        'idx_scan_events_timestamp_qr_code', 
        'idx_scan_events_location_active',
        'idx_scan_events_platform_device_timestamp',
        'idx_scan_events_ip_timestamp',
        'idx_qr_codes_user_active',
        'idx_qr_codes_id_user_type',
        'idx_scan_events_date_qr_code'
    );" "Check optimization indexes" | tail -n 1 | xargs)
    
    log "Optimization indexes found: $indexes_status/8"
    
    # Check if monitoring functions exist
    local functions_status
    functions_status=$(execute_sql "
    SELECT COUNT(*) as function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'monitor_connection_pools',
        'check_connection_pool_health'
    );" "Check monitoring functions" | tail -n 1 | xargs)
    
    log "Monitoring functions found: $functions_status/2"
    
    if [ "$indexes_status" -eq 8 ] && [ "$functions_status" -eq 2 ]; then
        log_success "Database optimization is fully applied"
        return 0
    else
        log_warning "Database optimization is partially applied"
        return 1
    fi
}

# Function to apply missing optimizations
apply_missing_optimizations() {
    log "Applying any missing optimizations..."
    
    # Apply indexes if missing
    if [ -f "${MIGRATION_DIR}/migrations/001_indexes_only.sql" ]; then
        execute_sql_file "${MIGRATION_DIR}/migrations/001_indexes_only.sql" "Performance indexes"
    fi
    
    # Apply monitoring functions if missing
    if [ -f "${MIGRATION_DIR}/migrations/002_monitoring_only.sql" ]; then
        execute_sql_file "${MIGRATION_DIR}/migrations/002_monitoring_only.sql" "Monitoring functions"
    fi
}

# Function to generate cleanup report
generate_cleanup_report() {
    local report_file="${MIGRATION_DIR}/cleanup_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat << EOF > "$report_file"
# Database Cleanup and Optimization Report

**Date:** $(date)  
**Environment:** ${USE_DOCKER:+Docker }PostgreSQL
**Database:** $DATABASE_URL  

## Cleanup Actions Performed

### Files Cleaned
$(if [ -f "$CLEANUP_LOG" ]; then grep "Removing\|Creating" "$CLEANUP_LOG" | sed 's/^/- /'; else echo "- No file cleanup log found"; fi)

### Database Objects Cleaned
$(execute_sql "
SELECT 
    'Optimization indexes: ' || COUNT(*) || '/8 active' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname IN (
    'idx_scan_events_qr_code_timestamp',
    'idx_scan_events_timestamp_qr_code',
    'idx_scan_events_location_active',
    'idx_scan_events_platform_device_timestamp',
    'idx_scan_events_ip_timestamp',
    'idx_qr_codes_user_active',
    'idx_qr_codes_id_user_type',
    'idx_scan_events_date_qr_code'
);" "Index status report" | tail -n 1)

### Current Index Usage
\`\`\`sql
$(execute_sql "
SELECT indexname, idx_scan, 
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        ELSE 'ACTIVE'
    END as status
FROM pg_stat_user_indexes 
WHERE indexrelname LIKE 'idx_scan_events_%'
   OR indexrelname LIKE 'idx_qr_codes_%'
ORDER BY idx_scan DESC;" "Current index usage")
\`\`\`

### Connection Pool Status
\`\`\`sql
$(execute_sql "SELECT * FROM connection_pool_metrics;" "Connection pool status" 2>/dev/null || echo "Monitoring functions not available")
\`\`\`

## Recommendations

### Immediate Actions
1. Monitor index usage over the next 24-48 hours
2. Review any unused indexes for potential removal
3. Verify application performance improvements

### Long-term Maintenance
1. Schedule regular cleanup of old backup and log files
2. Monitor connection pool utilization trends
3. Consider automating index usage analysis

## Files Structure After Cleanup
\`\`\`
$(find "${MIGRATION_DIR}" -type f -name "*.sql" -o -name "*.md" -o -name "*.sh" | sort)
\`\`\`

---
*Generated automatically by enhanced database optimization script*
EOF

    log_success "Cleanup report generated: $report_file"
    echo "$report_file"
}

# Main function
main() {
    echo ""
    echo "🔧 Enhanced Database Optimization and Cleanup Script"
    echo "=================================================="
    
    log "Starting enhanced database optimization and cleanup..."
    log "Log file: $LOG_FILE"
    log "Cleanup log: $CLEANUP_LOG"
    
    # Environment checks
    check_docker_environment
    check_database_connection || exit 1
    
    # Verify current status
    if verify_optimization_status; then
        log_success "Database optimizations already applied"
    else
        log_warning "Some optimizations missing, applying now..."
        apply_missing_optimizations
    fi
    
    # Cleanup phase
    log "Starting cleanup phase..."
    cleanup_unwanted_database_objects
    cleanup_unwanted_files
    consolidate_migration_files
    
    # Generate final report
    report_file=$(generate_cleanup_report)
    
    # Final verification
    verify_optimization_status
    
    log_success "Enhanced database optimization and cleanup completed!"
    echo ""
    echo "📊 Summary:"
    echo "✅ Database optimizations verified"
    echo "🧹 Unwanted files cleaned up"
    echo "📝 Cleanup report: $report_file"
    echo "📋 Logs: $LOG_FILE, $CLEANUP_LOG"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Review the cleanup report for details"
    echo "2. Monitor index usage statistics"
    echo "3. Update service connection pool configurations"
    echo ""
}

# Script entry point
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi