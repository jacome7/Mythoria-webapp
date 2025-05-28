# Architecture Overview

Modern web application for interactive story sharing, built with cloud-native architecture on Google Cloud Platform.

## System Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Users     │────│Load Balancer│────│ Cloud Run   │
│             │    │(mythoria.pt)│    │(Container)  │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Clerk Auth   │────│PostgreSQL   │────│Cloud Build  │
│(External)   │    │(Cloud SQL)  │    │(CI/CD)      │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + DaisyUI
- **UI**: Custom React components

### Backend  
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **ORM**: Drizzle ORM
- **Language**: TypeScript

### Database
- **Engine**: PostgreSQL 17 (Cloud SQL)
- **Connection**: Private VPC
- **Backup**: Daily automated (7-day retention)
- **High Availability**: Zonal

### Infrastructure
- **Hosting**: Cloud Run (containerized)
- **Domain**: mythoria.pt (Cloud DNS)
- **SSL**: Google-managed certificates
- **Region**: Europe West 9 (Paris)
- **CI/CD**: Cloud Build with GitHub integration

### External Services
- **Authentication**: Clerk (managed service)
- **Monitoring**: Cloud Logging + Monitoring
- **Storage**: Container Registry

## Key Features

### Performance
- **Auto-scaling**: 0-3 instances based on load
- **CDN**: Global load balancing
- **Caching**: Next.js static generation
- **Database**: Connection pooling

### Security
- **Authentication**: Clerk with custom UI
- **Authorization**: Middleware-based route protection
- **Database**: Private VPC network
- **SSL**: End-to-end encryption
- **Webhooks**: Signature verification

### Development
- **Type Safety**: Full TypeScript coverage
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint + Prettier
- **Git Integration**: Automated deployments

## Data Flow

1. **User Request** → Load Balancer
2. **Load Balancer** → Cloud Run Container
3. **Container** → Clerk Authentication (if needed)
4. **Container** → PostgreSQL Database
5. **Response** ← Container ← Database
6. **User** ← Load Balancer ← Container

## Environment Configuration

### Development
- **URL**: `http://localhost:3000`
- **Database**: Local PostgreSQL
- **Authentication**: Clerk test keys
- **Webhooks**: ngrok tunnel

### Production
- **URL**: `https://mythoria.pt`
- **Database**: Cloud SQL (Private IP)
- **Authentication**: Clerk production keys
- **Webhooks**: Direct HTTPS

---

*For deployment details, see [Deployment Guide](../deployment/deployment-guide.md)*
- **Hosting**: Google Cloud Run (Serverless containers)
- **Load Balancer**: Google Cloud Load Balancer (Global)
- **SSL/TLS**: Google-managed SSL certificates
- **DNS**: Google Cloud DNS
- **Container Registry**: Google Container Registry (GCR)
- **CI/CD**: Google Cloud Build

### Authentication & Security
- **Authentication Provider**: Clerk
- **Session Management**: JWT tokens
- **API Security**: Bearer token authentication
- **Network Security**: VPC, Private IP ranges
- **Data Encryption**: TLS 1.2+ in transit, encrypted at rest

## Application Architecture

### Frontend Architecture
```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx          # Homepage
│   ├── aboutUs/          # About page
│   ├── pricing/          # Pricing page
│   └── api/              # API routes
├── components/           # Reusable UI components
│   ├── Header.tsx       # Navigation header
│   ├── Footer.tsx       # Site footer
│   └── StoryCounter.tsx # Story statistics
└── db/                  # Database layer
    ├── schema.ts        # Database schema
    ├── index.ts         # Database connection
    └── services.ts      # Data access layer
```

### API Layer
- **Pattern**: RESTful API design
- **Routes**: Next.js API routes in `/api` directory
- **Validation**: TypeScript + runtime validation
- **Error Handling**: Standardized error responses

### Database Schema

#### Core Entities
```sql
-- Users (managed by Clerk, referenced by ID)
-- Stories
CREATE TABLE stories (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  author_id VARCHAR(255) NOT NULL, -- Clerk user ID
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Story tags/categories (future enhancement)
-- User preferences (future enhancement)
-- Story interactions (likes, views, etc.)
```

## Infrastructure Components

### Cloud Run Configuration
- **Region**: europe-west9 (Paris)
- **Scaling**: 0-3 instances (auto-scaling)
- **Resources**: 512Mi memory, 1 vCPU
- **Timeout**: 300 seconds
- **Concurrency**: 80 requests per instance

### Load Balancer Setup
- **Type**: Global HTTP(S) Load Balancer
- **Backend**: Cloud Run NEG (Network Endpoint Group)
- **Health Checks**: HTTP health check on `/api/health`
- **SSL**: Google-managed certificates
- **HTTP to HTTPS**: Automatic redirect

### Database Configuration
- **Instance**: db-g1-small (1 vCPU, 1.7GB RAM)
- **Storage**: 10GB SSD (auto-expanding)
- **Backup**: Daily backups, 7-day retention
- **Maintenance**: Sundays 06:00 UTC
- **Networking**: Private IP (10.19.192.3)

### Security Architecture

#### Network Security
- **VPC**: Default VPC with custom subnets
- **Private IP**: Database accessible only via private network
- **Firewall**: Cloud Run egress to database only
- **Authorized Networks**: Limited IP ranges for external access

#### Application Security
- **Authentication**: Clerk-managed user sessions
- **Authorization**: Role-based access control
- **API Security**: Bearer token validation
- **Data Validation**: Input sanitization and validation

#### Data Security
- **Encryption in Transit**: TLS 1.2+
- **Encryption at Rest**: Google Cloud default encryption
- **Secrets Management**: Environment variables in Cloud Run
- **Database Access**: Service account authentication

## Deployment Pipeline

### Build Process
1. **Source**: GitHub repository
2. **Trigger**: Push to main branch
3. **Build**: Cloud Build using `cloudbuild.yaml`
4. **Test**: Automated testing (linting, type checking)
5. **Container**: Docker image build
6. **Registry**: Push to Google Container Registry
7. **Deploy**: Deploy to Cloud Run
8. **Health Check**: Verify deployment success

### Environments
- **Production**: `mythoria.pt` (Cloud Run)
- **Staging**: Separate Cloud Run service (future)
- **Development**: Local development environment

## Monitoring & Observability

### Application Monitoring
- **Health Endpoint**: `/api/health`
- **Uptime Monitoring**: Cloud Monitoring
- **Performance**: Cloud Trace
- **Logs**: Cloud Logging

### Infrastructure Monitoring
- **Cloud Run Metrics**: Request count, latency, errors
- **Database Metrics**: Connection count, query performance
- **Load Balancer**: Traffic distribution, SSL certificate status

### Alerting
- **Error Rate**: > 5% error rate alerts
- **Latency**: > 2s response time alerts
- **Availability**: Service downtime alerts
- **Database**: Connection failures, high CPU usage

## Scalability Considerations

### Current Scale
- **Users**: Small to medium scale (< 10,000 users)
- **Traffic**: Low to moderate (< 1000 requests/minute)
- **Data**: Small dataset (< 100GB)

### Scaling Strategy
1. **Horizontal Scaling**: Increase Cloud Run max instances
2. **Database Scaling**: Upgrade to higher-tier instance
3. **Global Distribution**: Multi-region deployment
4. **Caching**: Implement Redis for session/data caching
5. **CDN**: Cloud CDN for static assets

## Performance Optimization

### Current Optimizations
- **Static Assets**: Next.js optimization
- **Database**: Connection pooling via Drizzle
- **Caching**: Browser caching headers
- **Compression**: Gzip compression enabled

### Future Optimizations
- **CDN**: Google Cloud CDN implementation
- **Caching Layer**: Redis for application caching
- **Database**: Read replicas for query performance
- **Image Optimization**: Cloud Storage + CDN for images

## Disaster Recovery

### Backup Strategy
- **Database**: Daily automated backups (7-day retention)
- **Code**: Git repository (GitHub)
- **Configuration**: Infrastructure as Code (future: Terraform)

### Recovery Procedures
- **Database Recovery**: Point-in-time recovery available
- **Application Recovery**: Redeploy from latest container image
- **Domain Recovery**: DNS failover to backup region

### RTO/RPO Targets
- **Recovery Time Objective (RTO)**: < 4 hours
- **Recovery Point Objective (RPO)**: < 24 hours

## Security Compliance

### Data Protection
- **GDPR Considerations**: User data handling procedures
- **Data Retention**: Configurable data retention policies
- **Data Export**: User data export capabilities

### Security Best Practices
- **Least Privilege**: Minimal IAM permissions
- **Regular Updates**: Automated security patches
- **Vulnerability Scanning**: Container vulnerability scanning
- **Access Logging**: Audit logs for data access

## Future Architecture Considerations

### Short-term Enhancements (3-6 months)
- **Caching Layer**: Redis implementation
- **File Storage**: Cloud Storage for user uploads
- **Search**: Full-text search capabilities
- **Analytics**: User behavior tracking

### Long-term Enhancements (6-12 months)
- **Microservices**: Service decomposition
- **Multi-region**: Global deployment
- **Real-time Features**: WebSocket support
- **Advanced Analytics**: BigQuery integration

### Technology Evolution
- **Container Orchestration**: Consider GKE for complex workloads
- **Serverless Functions**: Cloud Functions for specific tasks
- **Machine Learning**: AI-powered content recommendations
- **GraphQL**: Consider GraphQL API layer

## Cost Optimization

### Current Cost Structure
- **Cloud Run**: Pay-per-use (minimal when idle)
- **Cloud SQL**: Fixed monthly cost (~$25/month)
- **Load Balancer**: Minimal traffic costs
- **Domain/DNS**: Fixed annual costs

### Cost Monitoring
- **Budget Alerts**: Set up budget notifications
- **Resource Optimization**: Regular review of resource usage
- **Reserved Capacity**: Consider committed use discounts

This architecture provides a solid foundation for the Mythoria application with room for growth and optimization as the user base expands.
