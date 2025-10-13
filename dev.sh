#!/bin/bash

# QR SaaS Platform Development Script
# This script helps manage the Docker-based development environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to build all services
build_services() {
    print_status "Building all services..."
    docker-compose build --no-cache
    print_success "All services built successfully"
}

# Function to start only databases
start_databases() {
    print_status "Starting databases only..."
    docker-compose -f docker-compose.db-only.yml up -d
    print_success "Databases started successfully"
}

# Function to start all services
start_all() {
    print_status "Starting all services..."
    docker-compose up -d
    print_success "All services started successfully"
}

# Function to show service status
show_status() {
    print_status "Service Status:"
    docker-compose ps
}

# Function to show logs
show_logs() {
    if [[ -z "$1" ]]; then
        print_status "Showing logs for all services..."
        docker-compose logs -f
    else
        print_status "Showing logs for $1..."
        docker-compose logs -f "$1"
    fi
}

# Function to stop all services
stop_all() {
    print_status "Stopping all services..."
    docker-compose down
    docker-compose -f docker-compose.db-only.yml down 2>/dev/null || true
    print_success "All services stopped"
}

# Function to clean up everything
cleanup() {
    print_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up..."
        docker-compose down -v --rmi all
        docker-compose -f docker-compose.db-only.yml down -v --rmi all 2>/dev/null || true
        docker system prune -f
        print_success "Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    # Add test commands here when implemented
    print_warning "Tests not implemented yet"
}

# Function to show help
show_help() {
    echo "QR SaaS Platform Development Helper"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build      Build all services"
    echo "  db         Start databases only"
    echo "  start      Start all services"
    echo "  status     Show service status"
    echo "  logs       Show logs for all services"
    echo "  logs SERVICE  Show logs for specific service"
    echo "  stop       Stop all services"
    echo "  cleanup    Remove all containers, volumes, and images"
    echo "  test       Run tests"
    echo "  help       Show this help message"
    echo ""
    echo "Services: api-gateway, user-service, qr-service, analytics-service, file-service, notification-service"
}

# Main script logic
case "${1:-help}" in
    build)
        check_docker
        build_services
        ;;
    db)
        check_docker
        start_databases
        ;;
    start)
        check_docker
        start_all
        ;;
    status)
        check_docker
        show_status
        ;;
    logs)
        check_docker
        show_logs "$2"
        ;;
    stop)
        check_docker
        stop_all
        ;;
    cleanup)
        check_docker
        cleanup
        ;;
    test)
        check_docker
        run_tests
        ;;
    help|*)
        show_help
        ;;
esac