# Frontend (React + Tailwind PWA — locked)

```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173 (proxies /api + /healthz to :8000)
npm run build    # production bundle
```

Routes (§28): `/login /capture /upload /scan/:id /review/:id /scans
/dashboard /reports/:id /admin/users /admin/rules` — stubs in `src/pages/`,
wired in `src/App.jsx`. Components: `AppShell`, `CameraCapture` (Camera API +
gallery fallback, §29), `StatusBadge` (five-state, text + icon, never
color-only). PWA basics: `public/manifest.webmanifest` + `public/sw.js`
(shell-only cache; evidence/API always network).
