# QR Code SaaS Platform - Development Instructions

This workspace contains a Node.js TypeScript microservices architecture for a QR code generation SaaS platform.

## Architecture
- Clean architecture with SOLID principles
- Microservices: API Gateway, User Management, QR Generation, Analytics, File Storage, Notifications
- Docker containerization for development and deployment
- TypeScript for type safety and better developer experience

## Development Guidelines
- Follow SOLID principles and clean code practices
- No comments in production code (self-documenting code)
- Use dependency injection and interfaces
- Implement proper error handling and logging
- Write unit tests for all services

## Services Structure
- `api-gateway/` - Central API gateway with routing and authentication
- `user-service/` - User management and authentication
- `qr-service/` - QR code generation and management
- `analytics-service/` - Analytics and tracking
- `file-service/` - File upload and storage management
- `notification-service/` - Email and notification handling
- `shared/` - Common interfaces, types, and utilities

## Development Commands
- `npm run dev` - Start all services in development mode
- `npm run build` - Build all services
- `npm run test` - Run all tests
- `docker-compose up` - Start all services with Docker