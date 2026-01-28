# DigitoPub.com Database Migration Guide

## PostgreSQL to MySQL Migration + OJS Integration

This guide walks you through migrating your Next.js + Prisma application from PostgreSQL to MySQL and integrating with the Open Journal Systems (OJS) database.

---

## 📋 Prerequisites

- [x] MySQL 8.0+ or MariaDB 10.2.7+ installed
- [x] Access to existing PostgreSQL database (for data export)
- [x] Access to OJS MySQL database (read-only)
- [x] Bun or Node.js installed

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
bun install
# or
npm install
```

This will install the required `mysql2` package along with other dependencies.

### 2. Configure Environment Variables

Copy the example environment file and update with your credentials:

```bash
cp .env.example .env
```

Edit `.env` and update the following:

```env
# Main MySQL Database
DATABASE_HOST="localhost"
DATABASE_PORT="3306"
DATABASE_NAME="scientific_journals"
DATABASE_USER="app_user"
DATABASE_PASSWORD="your_password"

# OJS Database (Read-Only)
OJS_DATABASE_HOST="localhost"
OJS_DATABASE_NAME="ojs_db"
OJS_DATABASE_USER="ojs_readonly"
OJS_DATABASE_PASSWORD="readonly_password"
```

### 3. Create MySQL Database and Users

```bash
# Connect to MySQL as root
mysql -u root -p

# Create database
CREATE DATABASE scientific_journals CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create application user
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON scientific_journals.* TO 'app_user'@'localhost';

# Create OJS read-only user
CREATE USER 'ojs_readonly'@'localhost' IDENTIFIED BY 'readonly_password';
GRANT SELECT ON ojs_db.* TO 'ojs_readonly'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

### 4. Run Database Migrations

```bash
# Apply schema
mysql -u app_user -p scientific_journals < scripts/001_create_tables.sql

# Insert sample data (optional)
mysql -u app_user -p scientific_journals < scripts/002_insert_sample_data.sql
```

Or use the npm scripts:

```bash
# Note: Set DATABASE_USER and DATABASE_PASSWORD environment variables first
export DATABASE_USER=app_user
export DATABASE_PASSWORD=your_password
export DATABASE_NAME=scientific_journals

npm run db:migrate
npm run db:seed
```

### 5. Generate Prisma Client

```bash
npx prisma generate
# or
npm run prisma:generate
```

### 6. Verify Connections

```bash
# Test main database
npm run db:verify

# Test OJS database
npm run ojs:verify
```

Expected output:
```
✅ MySQL Version: 8.0.x
📚 Total Journals: X
📝 Total Submissions: Y
📄 Published Articles: Z
```

---

## 📊 Data Migration (PostgreSQL → MySQL)

If you have existing data in PostgreSQL, you need to export and transform it.

### Step 1: Export from PostgreSQL

```bash
# Export each table as CSV
psql -U username -d dbname -c "\copy admin_users TO 'admin_users.csv' CSV HEADER"
psql -U username -d dbname -c "\copy journals TO 'journals.csv' CSV HEADER"
psql -U username -d dbname -c "\copy submissions TO 'submissions.csv' CSV HEADER"
# ... repeat for all tables
```

### Step 2: Transform Data

**Important transformations:**

1. **UUID → BIGINT**: PostgreSQL UUIDs need to be converted to MySQL BIGINT AUTO_INCREMENT
2. **TEXT[] → JSON**: Array fields like `keywords` need to be converted to JSON arrays
3. **JSONB → JSON**: JSONB fields need to be re-serialized as JSON

Example transformation for keywords:
```
PostgreSQL: {keyword1,keyword2,keyword3}
MySQL: ["keyword1", "keyword2", "keyword3"]
```

### Step 3: Import to MySQL

```bash
# Load data into MySQL
# Note: You may need to adjust column mappings due to UUID → BIGINT change

mysql -u app_user -p scientific_journals -e "
LOAD DATA LOCAL INFILE 'journals.csv'
INTO TABLE journals
FIELDS TERMINATED BY ','
ENCLOSED BY '\"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(title, abbreviation, issn, e_issn, description, field, publisher, editor_in_chief, frequency, cover_image_url);
"
```

> **Note**: A custom migration script may be needed for complex data transformations. See `scripts/migrate-data-pg-to-mysql.ts` (to be created if needed).

---

## 🔗 OJS Integration

### Verify OJS Connection

```bash
npm run ojs:verify
```

This will display:
- MySQL version
- Number of journals, submissions, and published articles
- Connection pool statistics

### Manual Sync

Sync data from OJS to your application database:

```bash
npm run ojs:sync
```

This will:
1. ✅ Sync all active journals from OJS
2. ✅ Sync published articles with metadata
3. ✅ Update the last sync timestamp

### Automated Sync (Cron Job)

To run sync automatically every 6 hours:

```bash
# Edit crontab
crontab -e

# Add this line (adjust path as needed)
0 */6 * * * cd /path/to/app && bun run scripts/ojs-sync-cron.ts >> /var/log/ojs-sync.log 2>&1
```

Cron schedule examples:
- Every 6 hours: `0 */6 * * *`
- Daily at midnight: `0 0 * * *`
- Every Monday at 2 AM: `0 2 * * 1`

---

##Key Changes from PostgreSQL

| Feature | PostgreSQL | MySQL |
|---------|-----------|-------|
| **UUID** | `UUID` type with `uuid-ossp` extension | `BIGINT AUTO_INCREMENT` or `CHAR(36)` |
| **Arrays** | `TEXT[]` | `JSON` array: `["item1", "item2"]` |
| **JSON** | `JSONB` (binary) | `JSON` (text) |
| **Timestamps** | `TIMESTAMPTZ` | `DATETIME` with explicit timezone handling |
| **Auth Schema** | `auth.users` (Supabase) | Removed; use application-level auth |
| **Row Level Security** | Built-in RLS policies | Application-level middleware |
| **Triggers** | `LANGUAGE plpgsql` | `DELIMITER $$` syntax |

---

## 📁 Project Structure

```
scientific-journals-website/
├── prisma/
│   └── schema.prisma          # Updated for MySQL
├── scripts/
│   ├── 001_create_tables.sql  # MySQL schema
│   ├── 002_insert_sample_data.sql
│   ├── ojs-sync-cron.ts       # OJS sync script
│   ├── verify-mysql-connection.ts
│   └── verify-ojs-connection.ts
├── lib/
│   ├── ojs-client.ts          # OJS database client
│   ├── ojs-models.ts          # TypeScript types
│   └── ojs-service.ts         # Business logic
└── .env                       # Configuration
```

---

## 🧪 Testing

### 1. Test Main Database

```bash
npm run db:verify
```

### 2. Test OJS Database

```bash
npm run ojs:verify
```

### 3. Test Application

```bash
npm run dev
```

Visit `http://localhost:3000` and verify:
- ✅ Admin login works
- ✅ Journals are displayed
- ✅ Submissions can be created
- ✅ OJS data appears (if sync has run)

---

## ⚠️ Common Issues

### Issue: "Access denied for user"

**Solution**: Check your environment variables and MySQL user permissions:

```bash
mysql -u root -p -e "SHOW GRANTS FOR 'app_user'@'localhost';"
```

### Issue: "JSON field not supported"

**Solution**: Upgrade to MySQL 5.7.8 + or MariaDB 10.2.7+:

```bash
mysql -V
```

### Issue: "Tablealready exists"

**Solution**: Drop and recreate the database:

```bash
mysql -u root -p -e "DROP DATABASE scientific_journals; CREATE DATABASE scientific_journals CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Issue: "OJS connection failed"

**Solution**: 
1. Verify OJS database is running
2. Check OJS read-only user permissions
3. Ensure OJS database name is correct in `.env`

---

## 🔐 Security Best Practices

1. **Use Read-Only User for OJS**: Never use a user with write permissions
2. **Strong Passwords**: Use complex passwords for database users
3. **Environment Variables**: Never commit `.env` file to version control
4. **Connection Limits**: Monitor connection pool usage
5. **Regular Backups**: Schedule automated MySQL backups

---

## 📊 Monitoring

### Check Last OJS Sync

```sql
SELECT setting_value 
FROM system_settings 
WHERE setting_key = 'ojs_last_sync';
```

### Check Sync Logs

```bash
tail -f /var/log/ojs-sync.log
```

### Monitor Database Size

```sql
SELECT 
  table_name,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'scientific_journals'
ORDER BY (data_length + index_length) DESC;
```

---

## 🆘 Rollback Plan

If migration fails, you can rollback to PostgreSQL:

1. Stop the application
2. Switch `.env` back to PostgreSQL connection
3. Restore PostgreSQL backup
4. Revert Prisma schema to PostgreSQL
5. Regenerate Prisma client

```bash
# Restore PostgreSQL
pg_restore -U username -d dbname -v backup_YYYYMMDD.dump

# Revert schema
git checkout prisma/schema.prisma

# Regenerate client
npx prisma generate
```

---

## 📚 Additional Resources

- [Prisma MySQL Documentation](https://www.prisma.io/docs/concepts/database-connectors/mysql)
- [MySQL JSON Functions](https://dev.mysql.com/doc/refman/8.0/en/json-functions.html)
- [OJS Documentation](https://docs.pkp.sfu.ca/dev/documentation/en/)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)

---

## 🤝 Support

For issues or questions:
1. Check the [implementation_plan.md](../implementation_plan.md) for detailed technical information
2. Review migration logs in `/var/log/`
3. Test connections with verify scripts

---

**Migration Checklist:**

- [ ] MySQL 8.0+ installed
- [ ] Database and users created
- [ ] Environment variables configured
- [ ] Schema migrations applied
- [ ] Prisma client generated
- [ ] Connections verified (main + OJS)
- [ ] Sample data loaded (optional)
- [ ] OJS sync tested
- [ ] Application tested
- [ ] Cron job configured (optional)
- [ ] Backups scheduled

**Good luck with your migration! 🚀**
