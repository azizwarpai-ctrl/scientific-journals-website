# API Integration Guide

This document outlines the API integration between the Next.js Frontend and the PHP Backend for the Scientific Journals Platform.

## 1. Architecture Overview
- **Frontend**: Next.js 16 (Static Export)
- **Backend**: PHP 8.2+ (Clean Architecture)
- **Communication**: REST API via `lib/php-api-client.ts`
- **Authentication**: JWT with mandatory Two-Factor Authentication (2FA)

## 2. Authentication Flow

### 2.1 Login & 2FA
The authentication process requires two steps:
1.  **Initial Login (`POST /api/auth/login`)**:
    - Accepts `email` and `password`.
    - Returns a `tempToken` (5-minute validity).
    - Triggers an OTP email to the user.
    - **Note for Dev**: OTP is logged to `backend/storage/logs/otp.log` or `backend/temp_otp.txt`.

2.  **Verify OTP (`POST /api/auth/verify-2fa`)**:
    - Accepts `tempToken` and `otp`.
    - Returns a long-lived JWT `token`.
    - Secure HTTP-only cookies are *not* used for API token storage in this specific configuration to support static export; the token is handled by the client (stored in memory/session).

### 2.2 Session Management
- **Get User (`GET /api/auth/me`)**: Validates the current token and returns user details.
- **Logout (`POST /api/auth/logout`)**: Invalidates the current session.

## 3. Key API Endpoints

### 3.1 Journals
- `GET /api/journals`: List all journals (public).
- `GET /api/journals/{id}`: Get journal details.
- `POST /api/journals` (Admin): Create a new journal.

### 3.2 Messages (Contact Form)
- `POST /api/messages`: Submit a contact message (Public).
- `GET /api/messages` (Admin): List all messages.

### 3.3 FAQ
- `GET /api/faq`: List published FAQs (Public).
- `POST /api/faq` (Admin): Create a new FAQ (requires Auth).

### 3.4 OJS Integration
- The system syncs with Open Journal Systems (OJS) databases.
- `GET /api/submissions`: Fetches submissions synced from OJS (Admin).

## 4. Error Handling
- The frontend `php-api-client.ts` handles:
    - **401 Unauthorized**: Redirects to login.
    - **403 Forbidden**: Shows permission error.
    - **422 Validation Error**: Returns field-specific errors.
    - **500 Server Error**: Returns generic error message with retry option.

## 5. Development Setup
To test the API integration locally:
1.  Start Backend:
    ```bash
    cd backend
    php -S localhost:8000 -t public
    ```
2.  Start Frontend:
    ```bash
    bun dev
    ```
3.  Ensure `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env`.

## 6. Security checklist
- [x] All admin endpoints are protected by `AuthMiddleware`.
- [x] Passwords are hashed using Bcrypt.
- [x] Input data is validated using DTOs.
- [x] CORS is configured to allow frontend origin only.
