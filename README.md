# Scientific Journals Platform

A comprehensive digital publishing platform for academic and scientific journals, featuring a **Next.js Frontend** and **PHP Backend**.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/azizwarpai-7979s-projects/v0-scientific-journals-website)

## 🌟 Architecture

- **Frontend**: Next.js 16 (App Router), configured for Static Export (`output: "export"`).
- **Backend**: PHP 8.2+ following Clean Architecture principles.
- **Database**: MySQL 8.0 (Dockerized).
- **Authentication**: JWT-based with mandatory Two-Factor Authentication (2FA).
- **Integration**: Syncs with Open Journal Systems (OJS) for read-only metadata.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- PHP 8.2+ (with PDO, OpenSSL)
- Docker Desktop (for Database)

### 1. Database Setup
Start the MySQL database using Docker. It will automatically initialize with the schema and sample data.

```bash
docker-compose up -d
```

### 2. Backend Setup
Navigate to the backend directory and start the development server.

```bash
cd backend
# Install dependencies (if needed)
composer install

# Start PHP server
php -S localhost:8000 -t public
```

### 3. Frontend Setup
In the root directory, install dependencies and start the Next.js development server.

```bash
# Install dependencies
bun install

# Start development server
bun dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
scientific-journals-website/
├── app/                    # Next.js App Router (Frontend)
├── backend/                # PHP Application (Backend)
│   ├── src/               # Domain, Application, Infrastructure layers
│   ├── public/            # Entry point (index.php)
│   └── scripts/           # Backend utility scripts (tests, migrations)
├── components/             # React UI components
├── lib/
│   └── php-api-client.ts   # TypsScript API Client for Backend
├── out/                    # Static export output (bun run build)
├── scripts/                # Database initialization SQL scrips
├── docker-compose.yml      # MySQL configuration
└── README.md
```

## 🔐 Authentication & API
See [API_INTEGRATION.md](./API_INTEGRATION.md) for detailed documentation on the authentication flow, API endpoints, and integration usage.

## 🛠️ Development

### Frontend
- **Build Static Export**: `bun run build`
- **Lint**: `bun run lint`

### Backend
- **Test Connections**: `php backend/scripts/test-db.php`
- **Test API Endpoints**: `php backend/scripts/test-all-endpoints.php`

## 📚 Documentation
- **[Review & Testing Plan](./REVIEW_TESTING_PLAN.md)** - Comprehensive QA checklist
- **[API Integration](./API_INTEGRATION.md)** - API Guide
- **[Migration Notes](./MIGRATION_README.md)** - History of PostgreSQL to MySQL migration

## 📄 License
Private and Proprietary.
