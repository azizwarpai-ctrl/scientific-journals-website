# UI Rules & Flow

## 1. Submit Button Logic
The "Submit Manuscript" button behavior must be purely stateless and direct. It must NEVER depend on auth state.

1. **Always Visible**: The button is always rendered.
2. **Direct Link**: Render a direct `<Link>` to the OJS submission wizard URL.
3. **No Conditional Rendering**: It must not conditionally trigger `/api/ojs/sso` based on local UI context or stores.

## 2. Registration Behavior
- Users who register on digitopub are automatically provisioned.
- After a successful `POST /api/auth/register`, the user is immediately redirected to OJS via the SSO flow.
- The registration UI must clearly communicate that the user is creating an account for the entire journal system (OJS).

## 3. Forbidden UI Behaviors
- **Local Login Modals**: Modals prompting for email/password on digitopub.
- **"Login to digitopub"**: UI text suggesting a local account exists.
- **Password Reset Forms**: Local forms for resetting OJS passwords on digitopub.
- **Loading Identity State**: Showing "Welcome, [User]" or "Logged in as..." derived from local cookies/sessions.

## 4. Async UI Requirements
- **Skeletons**: All journal lists and detail pages must show pulse skeletons (using shadcn `Skeleton`) while metadata is being fetched.
- **Error States**: Error components must provide a "Back to Journals" or "Retry" action.

## 5. Dynamic Content Rules
- **No Fake Data**: Pages must never display hardcoded sample statistics, simulated loading states with fake data, or placeholder distribution arrays.
- **CMS-First**: Sections that display content managed by admins (About, FAQs, Solutions) must fetch from their respective API endpoints.
- **Empty States**: When no data exists, show a proper empty state UI (icon + "Coming Soon" message), not simulated data.
- **Loading States**: All data-dependent sections must show skeleton loaders while fetching.

## 6. Page-Specific Rules

### Solutions Page (`/solutions`)
- Must fetch from `/api/solutions` (the `Solution` model).
- Must NOT render journals as solutions.
- Must display solution title, description, icon, and features list.

### About Page (`/about`)
- Platform statistics must come from `/api/statistics` (real OJS DB data).
- No hardcoded sample distributions or simulated quality metrics.

### Help Page (`/help`)
- Quick links must all be navigable (either to sub-pages or anchor links).
- FAQ section must be dynamic from `/api/faqs`.

### Home Page (`/`)
- Featured journals section shows latest 6 journals (sorted by `created_at DESC`).
- CTA copy must not include unverifiable claims.

## 7. Long Form Content
- **Collapsible Pattern**: For content sections that can exceed a typical viewport height (e.g., Aims & Scope, Author Guidelines), the UI MUST use the `CollapsibleContent` component.
- **Max Height Enforcement**: Set appropriate `maxHeight` values (e.g., `300px`) to prevent overwhelming the page layout.
- **Read More Toggle**: Provide a clean "Read More" and "Read Less" toggle button to allow the user to expand the content without creating endless scrolling.
