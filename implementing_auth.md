Listed directory convex_resend
Listed directory src
Listed directory pages
Listed directory convex
Viewed auth.ts:1-62
Viewed AfterSignIn.jsx:1-80
Viewed http.ts:1-22
Viewed users.ts:1-144
Viewed AuthPage.jsx:1-216

To implement this login method, we established a robust authentication flow using **Convex Auth** integrated with **Resend**. This allows for a "Magic Link" experience where users sign in via email without needing passwords.

### 1. Pages Implemented
The implementation consists of five key views that manage the user's journey from entry to their specific dashboard:

*   **`AuthPage.jsx`**: The entry point where users enter their email. It supports both a production flow (Resend email) and a "Test Mode" for developers to capture links directly in the UI.
*   **`AfterSignIn.jsx`**: A specialized "redirection hub" that handles the logic immediately after a user clicks their magic link. It ensures the user record is synced and determines their next destination.
*   **`OnboardingPage.jsx`**: A multi-step form for new users to set up their profiles (name, username, interests).
*   **`AdminDashboard.jsx`**: A protected view for users with the `isAdmin: true` flag.
*   **`ProfilePage.jsx`**: The standard landing page for regular, onboarded users.

---

### 2. Creating the Token
The token is created on the backend by the **`@convex-dev/auth`** library. 

1.  **Frontend Trigger**: In `AuthPage.jsx`, the user submits their email. The app calls `signIn("resend", { email })`.
2.  **Backend Generation**: In `convex/auth.ts`, the `Resend` provider receives a `url` parameter from Convex. This URL is a magic link that already contains the uniquely generated, signed authentication token.
3.  **Delivery**: The `sendVerificationRequest` function in `convex/auth.ts` uses the Resend API to mail this URL to the user.

---

### 3. Ingredients of the Token
The "token" is a cryptographically signed string (often a JWT) appended to the magic link URL (e.g., `.../auth#token=XYZ`). Its core ingredients include:

*   **Identifier**: The user's email address.
*   **Provider ID**: Specifies which auth method was used (e.g., `"resend"` or `"test"`).
*   **Expiration Timestamp**: A short-lived window (default is usually 1 hour) after which the link becomes invalid.
*   **Signature**: A cryptographic hash generated using the project's secret keys, ensuring the token hasn't been tampered with or forged.

---

### 4. Routing to the Correct Page
The application uses the `AfterSignIn.jsx` component as a traffic controller to ensure users land on the correct page based on their database state:

1.  **Redirection Target**: The `signIn` call specifies `{ redirectTo: "/after-signin" }`.
2.  **Auth State Detection**: When the user clicks the link, the Convex Auth client validates the token and sets `isAuthenticated` to `true`.
3.  **Data Fetching**: The `AfterSignIn` page uses `useQuery(api.users.viewer)` to fetch the user's specific record from the database.
4.  **Conditional Logic**: The component runs a `useEffect` hook that evaluates the user's status:
    *   **Not Onboarded?** `navigate("/onboarding")`
    *   **Is Admin?** `navigate("/admin")`
    *   **Regular User?** `navigate("/profile")`

This approach ensures that even if a user bookmarks a page or re-logs in, they are always funneled through the correct business logic before reaching a dashboard.