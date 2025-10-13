# QR Code SaaS Platform

A modern microservices-based QR code generation and analytics platform built with Node.js, TypeScript, and Docker.

## 🏗️ Architecture

This platform follows a microservices architecture with clean code principles and SOLID design patterns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │────│   API Gateway    │────│   Load Balancer │
│   (React/Next)  │    │   (Port 3000)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
        │ User Service │ │QR Service │ │Analytics    │
        │ (Port 3001)  │ │(Port 3002)│ │Service      │
        └──────────────┘ └───────────┘ │(Port 3003)  │
                                       └─────────────┘
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
        │ File Service │ │Notification│ │   Shared    │
        │ (Port 3004)  │ │Service     │ │  Library    │
        └──────────────┘ │(Port 3005) │ └─────────────┘
                         └────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
            ┌───────▼──┐ ┌─────▼─────┐ ┌──▼──┐
            │PostgreSQL│ │   Redis   │ │Files│
            │          │ │   Cache   │ │     │
            └──────────┘ └───────────┘ └─────┘
```

## 🚀 Services

### API Gateway (Port 3000)
- **Purpose**: Entry point for all client requests
- **Features**: Authentication, rate limiting, request routing, load balancing
- **Technology**: Express.js, JWT, Redis

### User Service (Port 3001)
- **Purpose**: User management, authentication, and authorization
- **Features**: Registration, login, profile management, subscription handling
- **Technology**: Express.js, PostgreSQL, bcrypt, JWT

### QR Service (Port 3002)
- **Purpose**: QR code generation, management, and redirect handling
- **Features**: Dynamic QR generation, custom designs, validity controls, redirect tracking
- **Technology**: Express.js, QR code libraries, image processing

### Analytics Service (Port 3003)
- **Purpose**: Tracking, analytics, and reporting
- **Features**: Scan tracking, dashboard analytics, export capabilities
- **Technology**: Express.js, PostgreSQL, data aggregation

### File Service (Port 3004)
- **Purpose**: File upload, storage, and management
- **Features**: Image uploads for logos, file optimization, CDN integration
- **Technology**: Express.js, Multer, file system/cloud storage

### Notification Service (Port 3005)
- **Purpose**: Email notifications and communication
- **Features**: Welcome emails, password resets, analytics reports
- **Technology**: Express.js, Nodemailer, email templates

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Containerization**: Docker & Docker Compose
- **Authentication**: JWT
- **Testing**: Jest
- **Linting**: ESLint + Prettier

## 📦 Project Structure

```
qr-saas-platform/
├── .github/
│   └── copilot-instructions.md
├── services/
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── middleware/
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── user-service/
│   ├── qr-service/
│   ├── analytics-service/
│   ├── file-service/
│   └── notification-service/
├── shared/
│   ├── src/
│   │   ├── types/
│   │   ├── interfaces/
│   │   └── utils/
│   └── package.json
├── database/
│   └── init.sql
├── docker-compose.yml
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd qr-saas-platform
```

### 2. Install Dependencies
```bash
npm run setup
```

### 3. Environment Setup
Create `.env` files in each service directory:

```bash
# services/api-gateway/.env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secure-jwt-secret-key
REDIS_URL=redis://redis:6379

# services/user-service/.env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://qr_user:qr_password@postgres:5432/qr_saas
JWT_SECRET=your-super-secure-jwt-secret-key
REDIS_URL=redis://redis:6379

# Add similar .env files for other services
```

### 4. Start with Docker
```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### 5. Development Mode
```bash
# Start all services in development mode
npm run dev

# Or start individual services
npm run dev:gateway
npm run dev:user
npm run dev:qr
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests for specific service
cd services/user-service && npm test
```

## 🔧 Development

### Code Quality
- **ESLint**: Configured for TypeScript
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **No Comments Policy**: Code should be self-documenting

### SOLID Principles Implementation
- **Single Responsibility**: Each service has one clear purpose
- **Open/Closed**: Interfaces allow for extension without modification
- **Liskov Substitution**: Proper interface inheritance
- **Interface Segregation**: Specific interfaces for different concerns
- **Dependency Inversion**: Dependency injection throughout

### API Endpoints

#### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

#### QR Codes
```
GET    /api/qr
POST   /api/qr
GET    /api/qr/:id
PUT    /api/qr/:id
DELETE /api/qr/:id
GET    /r/:shortId  (Public redirect)
```

#### Analytics
```
GET /api/analytics/qr/:id
GET /api/analytics/user
GET /api/analytics/export
```

#### File Management
```
POST   /api/files/upload
GET    /api/files/:id
DELETE /api/files/:id
```

## 🐳 Docker Commands

```bash
# Build and start all services
docker-compose up --build

# Scale specific service
docker-compose up --scale qr-service=3

# View service logs
docker-compose logs -f api-gateway

# Execute commands in container
docker-compose exec user-service npm test

# Clean up
docker-compose down -v
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevent API abuse
- **CORS**: Configured for security
- **Helmet**: Security headers
- **Input Validation**: Request validation middleware
- **Password Hashing**: bcrypt for secure passwords
- **SQL Injection Protection**: Parameterized queries

## 📊 Monitoring & Logging

- **Winston**: Structured logging
- **Health Checks**: `/health` endpoints for each service
- **Error Tracking**: Centralized error handling
- **Performance Monitoring**: Response time tracking

## 🚀 Deployment

### Production Environment
```bash
# Production build
npm run build

# Production docker
docker-compose -f docker-compose.prod.yml up
```

### Environment Variables (Production)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://host:port
JWT_SECRET=your-production-secret
SMTP_HOST=smtp.provider.com
SMTP_USER=your-email
SMTP_PASS=your-password
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- Follow TypeScript strict mode
- Use meaningful variable names
- Implement proper error handling
- Write unit tests for new features
- Follow existing project structure

## 📈 Roadmap

### Phase 1 (MVP) - Completed ✅
- [x] Basic project structure
- [x] Docker environment
- [x] Core services scaffold
- [x] Database schema
- [x] API Gateway setup

### Phase 2 (Development)
- [ ] User authentication implementation
- [ ] QR code generation service
- [ ] Basic analytics tracking
- [ ] File upload handling
- [ ] Email notifications

### Phase 3 (Enhancement)
- [ ] Advanced QR customization
- [ ] Real-time analytics
- [ ] Subscription management
- [ ] Performance optimization
- [ ] Security hardening

## 🆘 Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check running services
docker ps
lsof -i :3000

# Stop conflicting services
docker-compose down
```

**Database connection issues:**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up postgres
```

**Build failures:**
```bash
# Clean build
npm run clean
npm run build

# Rebuild containers
docker-compose build --no-cache
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Backend Development**: Node.js, TypeScript, PostgreSQL
- **DevOps**: Docker, CI/CD, Monitoring  
- **Frontend**: React, Next.js (Future)
- **QA**: Testing, Performance, Security

---

**Built with ❤️ using Node.js, TypeScript, and Docker**