# Task 8: Frontend Config, Proxy & UI Libs

**Goal:** Initialize the React application, configure the dev-proxy to talk to the Go backend, and install the UI component library.

**Tech Stack:** React (Vite), TypeScript, Tailwind CSS, React Router v6.
**UI Library:** `shadcn/ui` (Best for high-quality, customizable admin dashboards).

## Steps:

1.  **Project Setup:**
    * Inside the root, create a `frontend` folder using Vite: `npm create vite@latest frontend -- --template react-ts`.
    * Install Tailwind CSS following the official Vite guide.
    * Configure path aliases (update `vite.config.ts` and `tsconfig.json` so `@/` points to `src/`).

2.  **Dev Server Proxy (Crucial for http.Dir setup):**
    * Update `vite.config.ts`. Add a proxy for `/api` so that when you run `npm run dev`, requests are forwarded to your running Go backend (e.g., localhost:8080).
    * Example config:
      ```ts
      server: {
        proxy: {
          "/api": {
            target: "http://localhost:8080",
            changeOrigin: true,
          },
        },
      },
      ```

3.  **UI Library (shadcn/ui):**
    * Run the `shadcn-ui` init command.
    * Add essential components: `button`, `input`, `textarea`, `card`, `dialog`, `select`, `tabs`, `table`, `scroll-area`, `separator`, `badge`.
    * **Theme:** Configure the `dark` mode toggle.

4.  **Routing Architecture:**
    * Install `react-router-dom`.
    * Create `src/layouts/PublicLayout.tsx`: Public Navbar (Logo, Links) and Footer.
    * Create `src/layouts/AdminLayout.tsx`: Admin Sidebar, Auth check.
    * Configure `src/App.tsx` with two distinct route groups (Public vs Admin).

5.  **Build Output:**
    * Ensure `npm run build` outputs to `dist` (default).
    * *Note:* The Go backend will be configured to serve this `frontend/dist` folder using `http.Dir`.