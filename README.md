# Dennan UX Monorepo

Welcome to the Dennan UX codebase. This is a monorepo containing two decoupled React/Vite frontends and a unified Convex backend.

## Workspace Structure

- **`storefront/`**: The customer-facing storefront application (runs on `http://localhost:5173` in development).
- **`admin/`**: The internal administrative and staff portal application (runs on `http://localhost:5174` in development).
- **`convex/`**: The backend database schema, queries, mutations, actions, and HTTP routes.
- **`public/`**: Shared static assets (images, fonts, etc.) utilized by the frontends.

---

## Local Development

Before running the applications, make sure dependencies are installed at the workspace root:

```bash
npm install
```

### Running All Services

You can spin up the storefront, admin panel, and Convex development server simultaneously using:

```bash
npm run dev:all
```

### Running Services Individually

If you prefer to run services separately:

*   **Convex Backend Dev Server**:
    ```bash
    npm run dev:convex
    ```
*   **Storefront Application Only**:
    ```bash
    npm run dev:storefront
    ```
*   **Admin Application Only**:
    ```bash
    npm run dev:admin
    ```

---

## Deployment Guide (Vercel)

Because this repository contains two separate frontend applications, you should deploy them as **two separate Vercel projects** pointing to the same GitHub repository.

If you attempt to deploy the root of the repository without configuration, the build will fail with a `Cannot resolve entry module index.html` error. Follow these steps to deploy correctly:

### 1. Storefront Project on Vercel

1.  Create a new project in the Vercel dashboard and connect it to this repository.
2.  In the project configuration page, click on **Edit** next to **Root Directory** and set it to:
    `storefront`
3.  Ensure the **Framework Preset** is set to **Vite**.
4.  Keep the default build settings:
    *   **Build Command**: `npm run build` (or `vite build`)
    *   **Output Directory**: `dist`
5.  Add your environment variables (e.g. `VITE_CONVEX_URL`).
6.  Click **Deploy**.

### 2. Admin Project on Vercel

1.  Create another new project in the Vercel dashboard and connect it to this repository.
2.  In the project configuration page, click on **Edit** next to **Root Directory** and set it to:
    `admin`
3.  Ensure the **Framework Preset** is set to **Vite**.
4.  Keep the default build settings:
    *   **Build Command**: `npm run build` (or `vite build`)
    *   **Output Directory**: `dist`
5.  Add your environment variables (e.g. `VITE_CONVEX_URL`).
6.  Click **Deploy**.
