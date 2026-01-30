# Production Deployment Guide - Fix 403 Error

## ⚠️ Critical Issue

The 403 Forbidden error on `https://digitopub.com/admin` is caused by **missing `.htaccess` files** on the production server.

### What Happened

✅ `.htaccess` files exist locally:
- `out/.htaccess` - Frontend URL rewriting
- `backend-out/public/.htaccess` - Backend routing

❌ Files were deleted from production server  
❌ Apache cannot rewrite `/admin` → `/admin.html`  
❌ Result: 403 Forbidden (directory access denied)

---

## 🚀 Quick Fix - 3 Steps

### Step 1: Verify Local Files

From PowerShell in project directory:

```powershell
# Check if files exist (should return True)
Test-Path "out\.htaccess"
Test-Path "backend-out\public\.htaccess"
```

Both should return **True** ✅

### Step 2: Upload `.htaccess` Files

**Using FTP/SFTP Client (FileZilla, WinSCP, etc.):**

1. **Enable "Show Hidden Files"** in your FTP client settings
   - Files starting with `.` are hidden by default
   - FileZilla: Server → Force showing hidden files
   - WinSCP: Options → Preferences → Panels → Show hidden files

2. **Upload Frontend `.htaccess`:**
   ```
   Local:  out/.htaccess
   Remote: /public_html/.htaccess
   ```
   (Adjust `/public_html/` to your actual web root)

3. **Upload Backend `.htaccess` (if applicable):**
   ```
   Local:  backend-out/public/.htaccess
   Remote: /public_html/api/.htaccess
   ```
   (Adjust path based on your backend location)

4. **Set correct file permissions:**
   - Right-click `.htaccess` → Properties → Permissions
   - Set to: `644` (Owner: Read+Write, Group/Others: Read only)

### Step 3: Verify Apache Configuration

**SSH into your production server:**

```bash
# Check if mod_rewrite is enabled
apachectl -M | grep rewrite
# OR
apache2ctl -M | grep rewrite

# Should output:
# rewrite_module (shared)
```

**If mod_rewrite is NOT enabled:**

```bash
# Enable it
sudo a2enmod rewrite

# Restart Apache
sudo systemctl restart apache2
# OR
sudo service apache2 restart
```

---

## 📋 Testing After Deployment

### Test 1: File Exists
```bash
# SSH to server
ls -la /path/to/public_html/.htaccess

# Should show:
# -rw-r--r-- 1 user group 338 Jan 29 22:00 .htaccess
```

### Test 2: URL Rewriting Works
```bash
# From local machine
curl -I https://digitopub.com/admin

# Should return:
# HTTP/1.1 200 OK  (NOT 403!)
```

### Test 3: Full Flow
1. Open browser (incognito mode)
2. Go to: `https://digitopub.com/admin`
3. **Expected behavior:**
   - Brief loading spinner
   - Redirect to: `https://digitopub.com/admin/login`
   - Login form displays
4. **Success:** No 403 error! ✅

---

## 🔧 Alternative: Full Redeployment

If manual upload is problematic, rebuild and redeploy everything:

```powershell
# 1. Rebuild frontend
bun run build

# 2. Rebuild backend
npm run build:backend

# 3. Upload entire directories (including .htaccess)
# - Upload out/ → production web root
# - Upload backend-out/ → production backend directory
```

---

## 🎯 `.htaccess` File Contents

### Frontend: `out/.htaccess`

```apache
Options -Indexes
ErrorDocument 404 /404.html
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^ %{REQUEST_FILENAME}.html [L]
RewriteCond %{REQUEST_FILENAME} -d
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.*)/$ $1.html [L]
</IfModule>
```

**What it does:**
- `/admin` → Serves `/admin.html`
- `/admin/login` → Serves `/admin/login.html`
- Blocks directory listing (403 prevention)

### Backend: `backend-out/public/.htaccess`

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Remove .html extension from URL
  RewriteCond %{THE_REQUEST} ^[A-Z]{3,}\s([^.]+)\.html [NC]
  RewriteRule ^ %1 [R=301,L]
  
  # Serve .html file if exists
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME}.html -f
  RewriteRule ^ %{REQUEST_FILENAME}.html [L]
  
  # Handle trailing slashes
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteCond %{REQUEST_FILENAME}.html -f
  RewriteRule ^(.*)/$ $1.html [L]
</IfModule>

ErrorDocument 404 /404.html
Options -Indexes
```

---

## 🛑 Common Mistakes to Avoid

| ❌ Mistake | ✅ Correct Approach |
|-----------|-------------------|
| FTP client hides `.htaccess` | Enable "Show hidden files" |
| Wrong file permissions | Set to `644` |
| Uploaded to wrong directory | Check web root path |
| mod_rewrite disabled | Enable in Apache config |
| Deleted `.htaccess` again | Keep it! It's **required** |

---

## 📊 Troubleshooting

### Issue: Still getting 403 after upload

**Check:**
1. File actually uploaded: `ls -la /public_html/.htaccess`
2. Permissions correct: `chmod 644 .htaccess`
3. mod_rewrite enabled: `apache2ctl -M | grep rewrite`
4. Apache restarted: `sudo systemctl restart apache2`

### Issue: "Internal Server Error" (500)

**Cause:** Syntax error in `.htaccess`

**Fix:**
- Check Apache error logs: `tail -f /var/log/apache2/error.log`
- Verify `.htaccess` syntax matches examples above

### Issue: Using Nginx (not Apache)

`.htaccess` doesn't work on Nginx. You need different config:

```nginx
location / {
    try_files $uri $uri.html $uri/ =404;
}
```

Contact your hosting provider for Nginx configuration.

---

## ✅ Success Checklist

- [ ] `.htaccess` exists in local `out/` directory
- [ ] `.htaccess` uploaded to production web root
- [ ] File permissions set to `644`
- [ ] Show hidden files enabled in FTP client
- [ ] Apache mod_rewrite is enabled
- [ ] Apache server restarted
- [ ] Test URL: `https://digitopub.com/admin` → redirects to login
- [ ] No 403 error appears

---

## 📞 Need Help?

**Common hosting providers:**

- **cPanel:** File Manager → Show hidden files → Upload
- **Plesk:** File Manager → Show hidden files → Upload  
- **DirectAdmin:** File Manager → Show hidden files → Upload

**Contact your hosting provider if:**
- You can't enable mod_rewrite
- `.htaccess` is not recognized
- Server uses Nginx instead of Apache

---

**Bottom Line:** The `.htaccess` files are **NOT optional**. They are **critical** for the static export to work on Apache servers. Upload them now to fix the 403 error!
