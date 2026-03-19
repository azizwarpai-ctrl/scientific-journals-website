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
