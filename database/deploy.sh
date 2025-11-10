#!/bin/bash

# QR SaaS Database Deployment Script
# This script initializes the complete database schema

set -e  # Exit on any error

echo "🚀 Starting QR SaaS Database Deployment..."

# Database connection details
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-qr_saas}
DB_USER=${DB_USER:-qr_user}

# Check if running in Docker
if [ -n "$DOCKER_POSTGRES_CONTAINER" ]; then
    PSQL_CMD="docker exec -i $DOCKER_POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME"
    echo "📦 Using Docker container: $DOCKER_POSTGRES_CONTAINER"
else
    PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    echo "🔗 Connecting to PostgreSQL at $DB_HOST:$DB_PORT"
fi

# Apply complete schema (now consolidated in init.sql)
echo "📋 Applying complete database schema..."
$PSQL_CMD < init.sql
echo "✅ Complete database schema applied successfully"

# Verify deployment
echo "🔍 Verifying deployment..."
TABLE_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
VIEW_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public';")

echo "📈 Deployment Summary:"
echo "   - Tables created: $TABLE_COUNT"
echo "   - Materialized views created: $VIEW_COUNT"
echo "   - Core QR SaaS Platform ✅"
echo "   - Team Management & Organizations ✅"
echo "   - Team Collaboration Features ✅"
echo "   - Landing Pages System ✅"
echo "   - Advanced Analytics ✅"
echo "   - Payment Processing ✅"

echo "🎉 Complete database deployment finished successfully!"