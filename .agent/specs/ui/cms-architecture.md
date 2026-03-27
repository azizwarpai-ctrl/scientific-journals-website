# CMS Architecture Spec

## Overview
The **digitopub** CMS architecture is designed to provide dynamic, admin-managed content for public pages while maintaining a stateless frontend. It uses a combination of dedicated relational tables for structured features (Solutions, FAQs, Journals) and a key-value `SystemSetting` table for page-specific configurations (About, Help).

## 1. Feature-Based CMS (Relational)

These features have dedicated Prisma models and API endpoints.

### 1.1 Solutions Feature
- **Model**: `Solution`
- **Endpoint**: `/api/solutions`
- **Fields**: `title`, `description`, `icon` (Lucide name), `features` (JSON array), `display_order`, `is_published`.
- **UI Usage**: Renders as cards on `/solutions`.

### 1.2 FAQ Feature
- **Model**: `FAQ`
- **Endpoint**: `/api/faqs`
- **Fields**: `question`, `answer`, `display_order`, `is_published`.
- **UI Usage**: Renders as an accordion on `/help`.

### 1.3 Journals Feature
- **Model**: `Journal`
- **Endpoint**: `/api/journals`
- **Sync**: Automatically synchronized from OJS database.
- **UI Usage**: Displayed on `/journals` and `/journals/[id]`.

## 2. Page-Based CMS (Key-Value)

These features use the `SystemSetting` table to store large JSON objects representing entire page sections.

### 2.1 About Page Content
- **Setting Key**: `about_page_content`
- **Endpoint**: `/api/about`
- **Structure**:
  - `heroTitle`, `heroSubtitle`
  - `missionText`, `visionText`
  - `whoWeAreText`, `brandPhilosophyText`
  - `coreValues`: Array of `{ icon, title, desc, color }`

### 2.2 Help Page Content
- **Setting Key**: `help_page_content`
- **Endpoint**: `/api/help`
- **Structure**:
  - `heroTitle`, `heroSubtitle`
  - `authorGuide`: `{ title, content: Array<{ heading, text }> }`
  - `reviewerGuide`: `{ title, content: Array<{ heading, text }> }`

## 3. Implementation Rules

### 3.1 Data Integrity
- All CMS content MUST be validated via Zod schemas on both the API (Inbound/Outbound) and the Frontend.
- If a CMS fetch fails, the UI MUST display a graceful fallback (meaningful empty state) or a localized error message, NOT a site-wide crash.

### 3.2 Aesthetics & UX
- **Skeleton Loaders**: All CMS-driven sections MUST use skeleton loaders during the `isLoading` state to prevent layout shift.
- **Empty States**: If no items are found (e.g., zero FAQs), a custom empty state with an icon and "Coming Soon" text MUST be displayed.
- **Micro-animations**: GSAP wrappers should be used to animate the appearance of CMS content once loaded.

### 3.3 Administrative Management
- All CMS endpoints MUST be protected by the `requireAdmin` middleware for mutation operations (POST, PATCH, PUT, DELETE).
- GET operations for published content are public.
