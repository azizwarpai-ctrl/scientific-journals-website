# SiteGround Deployment Guide

Follow these steps to deploy the API to SiteGround Shared Hosting.

## 1. Prepare Database

1.  Log in to **SiteGround Site Tools**.
2.  Go to **Site -> MySQL**.
3.  **Create Database**:
    *   Name: `yourprefix_journals` (Note the full name provided by SiteGround).
4.  **Create User**:
    *   Create a new user (e.g., `api_user`).
    *   **Important**: Note down the password.
    *   Assign the user to the database with **All Privileges**.
5.  **Import Schema**:
    *   Go to **phpMyAdmin** (in MySQL Manager).
    *   Select your new database.
    *   Click **Import**.
    *   Upload `001_create_tables.sql` and click **Go**.
    *   (Optional) Import `002_insert_sample_data.sql` for test data.

## 2. Upload Files

1.  Go to **Site -> File Manager**.
2.  Navigate to `public_html`.
3.  Create a new folder named `api` (or keep it in root if utilizing a subdomain like `api.yourdomain.com`).
4.  **Upload** the `backend` contents from this zip:
    *   Upload the **contents** of the `backend` folder into your target folder (e.g. `public_html` or `public_html/api`).
    *   Ideally, your structure should look like:
        ```
        /public_html
          /api
            /public
            /src
            /vendor
            .env
            composer.json
            ...
        ```

## 3. Configure Domain / Subdomain

**Option A: Subdomain (Recommended)**
1.  Go to **Domain -> Subdomains**.
2.  Create `api.yourdomain.com`.
3.  Set the **Document Root** to the `public` folder inside your uploaded files.
    *   Example: `public_html/api/public`
    *   **Crucial**: Pointing to `/public` ensures your source code (`/src`, `.env`) is not accessible from the web.

**Option B: Subfolder**
If you must use `yourdomain.com/api`:
1.  You will need to point a URL rewrite to the `public` folder, which can be tricky on shared hosting without exposing other files.
2.  **Recommendation**: Use Option A (Subdomain).

## 4. Configure Environment

1.  In File Manager, find `.env.example` in your API folder.
2.  Rename it to `.env`.
3.  Edit `.env`:
    ```ini
    APP_ENV=production
    APP_DEBUG=false
    APP_URL=https://api.yourdomain.com
    
    # Database (Use "localhost" for SiteGround)
    DB_HOST=localhost
    DB_PORT=3306
    DB_DATABASE=yourprefix_journals
    DB_USERNAME=yourprefix_api_user
    DB_PASSWORD=your_password_here
    
    # Security (Generate a random 64-char string)
    JWT_SECRET=...
    ```

## 5. Verify

Visit `https://api.yourdomain.com/api/health` to verify the deployment.
