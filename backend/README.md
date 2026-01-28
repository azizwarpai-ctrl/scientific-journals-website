# Scientific Journals Backend (PHP)

Production-ready PHP backend for the Scientific Journals Management System, implementing Clean Architecture with OJS integration.

---

## 🎯 Overview

This PHP backend replaces the Next.js API routes to enable deployment on shared hosting without Node.js runtime. It provides:

- **RESTful API** for journal management
- **JWT Authentication** with mandatory 2FA (email OTP)
- **OJS Integration** - Read-only sync with Open Journal Systems at submitmanger.com
- **Clean Architecture** - Domain-driven design with clear separation of concerns
- **Production Ready** - Security best practices, error handling, logging

---

## 🚀 Quick Start

### Prerequisites
- PHP 8.2+
- MySQL/MariaDB
- Composer
- Access to OJS database (optional)

### Installation

1. **Install Dependencies**
   ```bash
   composer install
   # Or with Docker:
   docker run --rm -v "$(pwd):/app" composer install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start Database**
   ```bash
   # Using Docker
   cd .. && docker-compose up -d mysql
   
   # Or use existing MySQL
   ```

4. **Initialize Database**
   The Docker container automatically runs `scripts/001_create_tables.sql`.
   If running manually:
   ```bash
   mysql -u app_user -p scientific_journals < ../scripts/001_create_tables.sql
   mysql -u app_user -p scientific_journals < ../scripts/002_insert_sample_data.sql
   ```

5. **Start Development Server**
   ```bash
   php -S localhost:8000 -t public
   ```

6. **Test API**
   ```bash
   php scripts/test-all-endpoints.php
   ```

---

## 📁 Architecture

### Clean Architecture Layers

```
┌─────────────────────────────────────┐
│       Presentation Layer            │
│  Controllers, Middleware, DTOs      │
└───────────┬─────────────────────────┘
            │
┌───────────▼─────────────────────────┐
│       Application Layer             │
│  Use Cases, Services (OTP, Sync)    │
└───────────┬─────────────────────────┘
            │
┌───────────▼─────────────────────────┐
│         Domain Layer                │
│  Entities, Repository Interfaces    │
└───────────┬─────────────────────────┘
            │
┌───────────▼─────────────────────────┐
│      Infrastructure Layer           │
│  PDO Repositories, Email, OJS       │
└─────────────────────────────────────┘
```

### Directory Structure

```
backend/
├── public/
│   └── index.php              # Entry point & routing
├── src/
│   ├── Domain/
│   │   ├── Entities/          # Business objects
│   │   └── Repositories/      # Interfaces
│   ├── Application/
│   │   ├── Services/          # OTP, OJS Sync
│   │   └── UseCases/          # Business workflows
│   ├── Infrastructure/
│   │   ├── Database/          # PDO repositories, OJS
│   │   ├── Email/             # PHPMailer
│   │   └── Security/          # JWT
│   └── Presentation/
│       ├── Controllers/       # API endpoints
│       ├── Middleware/        # Auth, CORS
│       └── DTOs/              # Request validation
├── scripts/
│   ├── create-admin.php       # CLI tools
│   ├── ojs-sync-cron.php      # OJS sync job
│   └── test-*.php             # Test scripts
├── storage/                   # File uploads, logs
├── .env                       # Configuration
└── composer.json
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login (Step 1 of 2FA)
- `POST /api/auth/verify-2fa` - Verify OTP (Step 2)
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout

### Journals
- `GET /api/journals` - List journals
- `GET /api/journals/show?id={id}` - Get journal details
- `POST /api/journals` - Create journal (protected)

### OJS Integration (Display Only)
- `GET /api/ojs/submissions` - List submissions (from OJS, admin only)
- `GET /api/ojs/submissions/show?id={id}` - Get submission details

### Health
- `GET /api/health` - System health check

---

## 🔐 Authentication Flow

```
1. User submits email/password
   ↓
2. Backend validates credentials
   ↓
3. Generate 6-digit OTP → Send email
   ↓
4. Return temporary JWT (15min expiry)
   ↓
5. User submits tempToken + OTP
   ↓
6. Verify OTP from database
   ↓
7. Return session JWT (7 days)
   ↓
8. Set HTTP-only cookie
```

**Security Features:**
- Mandatory 2FA for all admin access
- Bcrypt password hashing
- JWT with expiration
- HTTP-only cookies
- Middleware route protection

---

## 🔄 OJS Integration

### Architecture

```
┌──────────────────────────┐
│  submitmanger.com        │
│  OJS 3.5.1               │
│  (Submission Workflow)   │
└──────────┬───────────────┘
           │
           │ Read-only
           │ MySQL Connection
           │
           ▼
┌──────────────────────────┐
│  Sync Service            │
│  (Every 15 min)          │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Local Database          │
│  (Display Cache)         │
└──────────────────────────┘
```

### Setup

1. **Configure OJS Database Access**
   ```env
   OJS_DB_HOST=submitmanger.com
   OJS_DB_NAME=ojs_database
   OJS_DB_USER=readonly_user
   OJS_DB_PASSWORD=secure_password
   OJS_BASE_URL=https://submitmanger.com
   ```

2. **Test Connection**
   ```bash
   php scripts/test-ojs-connection.php
   ```

3. **Run Manual Sync**
   ```bash
   php scripts/ojs-sync-cron.php
   ```

4. **Schedule Automated Sync**
   ```bash
   # Linux crontab
   */15 * * * * php /path/to/backend/scripts/ojs-sync-cron.php >> /path/to/logs/ojs-sync.log 2>&1
   
   # Windows Task Scheduler
   # Program: php.exe
   # Arguments: C:\path\to\backend\scripts\ojs-sync-cron.php
   # Trigger: Every 15 minutes
   ```

### What Gets Synced

✅ Submission metadata (title, abstract, authors)  
✅ Submission status updates  
✅ Review status  
✅ Published article metadata  
❌ File attachments (accessed from OJS directly)  
❌ User passwords (separate auth)

---

## 🧪 Testing

### Automated Testing
```bash
# Test database connection
php scripts/test-db.php

# Test OJS connection
php scripts/test-ojs-connection.php

# Test full authentication flow
php scripts/test-auth-flow.php

# Create test admin
php scripts/create-test-admin.php
```

### Manual API Testing
```bash
# Health check
curl http://localhost:8000/api/health

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"TestPassword123!"}'

# List journals
curl http://localhost:8000/api/journals
```

---

## ⚙️ Configuration

### Environment Variables

```env
# Application
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database (Docker default port 3307)
DB_HOST=localhost
DB_PORT=3307
DB_DATABASE=scientific_journals
DB_USERNAME=app_user
DB_PASSWORD=apppassword

# Security
JWT_SECRET=your-64-character-secret-key-here

# Email (SMTP)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USERNAME=
SMTP_PASSWORD=

# OJS Integration
OJS_DB_HOST=submitmanger.com
OJS_DB_PORT=3306
OJS_DB_NAME=ojs_database
OJS_DB_USER=readonly_user
OJS_DB_PASSWORD=
OJS_BASE_URL=https://submitmanger.com
```

---

## 🚀 Deployment

### Shared Hosting (Production)

1. **Upload Files**
   ```bash
   # Via FTP/SFTP, upload:
   # - backend/* to public_html/api/
   ```

2. **Install Dependencies**
   ```bash
   composer install --no-dev --optimize-autoloader
   ```

3. **Configure Web Server**
   
   **Apache (.htaccess in public/):**
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^ index.php [QSA,L]
   ```
   
   **Nginx:**
   ```nginx
   location /api {
       try_files $uri $uri/ /public/index.php?$query_string;
   }
   ```

4. **Set Production Environment**
   ```env
   APP_ENV=production
   APP_DEBUG=false
   JWT_SECRET=<64-character-random-string>
   ```

5. **Test Deployment**
   ```bash
   curl https://yourdomain.com/api/health
   ```

---

## 📊 Database Schema

Key tables:
- `admin_users` - Authentication
- `journals` - Journal metadata
- `submissions` - Manuscript data (synced from OJS)
- `reviews` - Review data (synced from OJS)
- `published_articles` - Published content (synced from OJS)
- `verification_tokens` - OTP storage
- `messages` - Contact form
- `faq_solutions` - FAQ content

---

## 🛡️ Security Checklist

- [x] JWT secret is 64+ characters
- [x] Passwords hashed with bcrypt
- [x] HTTP-only cookies for session tokens
- [x] SQL injection prevention (PDO prepared statements)
- [x] Input validation via DTOs
- [x] CORS configured
- [x] Error messages don't leak sensitive data
- [ ] Rate limiting (TODO: implement RedisRateLimiter)
- [ ] HTTPS enforced (production)
- [ ] Security headers (production)

---

## 📚 Documentation

- [Implementation Walkthrough](../../.gemini/antigravity/brain/.../implementation_walkthrough.md)
- [API Testing Guide](../../.gemini/antigravity/brain/.../api_testing_guide.md)
- [Phase 4 OJS Plan](../../.gemini/antigravity/brain/.../phase4_plan.md)

---

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check MySQL is running
docker ps | grep mysql

# Test connection
php scripts/test-db.php

# Verify credentials in .env
```

### OTP Email Not Sending
```bash
# In development, OTP is logged to error_log
# Check: storage/last_otp.txt or server error logs

# Configure email service:
# .env: SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD
```

### OJS Sync Failing
```bash
# Test OJS connection
php scripts/test-ojs-connection.php

# Check OJS credentials
# Ensure read-only user has SELECT permission
```

---

## 🤝 Contributing

1. Follow PSR-12 coding standards
2. Maintain Clean Architecture boundaries
3. Write tests for new features
4. Update documentation

---

## 📄 License

Proprietary - DigitoPub.com

---

**Built with Clean Architecture • PHP 8.2 • MySQL • JWT**
