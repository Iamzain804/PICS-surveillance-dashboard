# PICS — Surveillance Dashboard

A web-based administration dashboard for the **PICS** (People Intelligence Camera System) — an AI-powered employee attendance and break monitoring platform. This frontend communicates with a GPU-accelerated FastAPI backend that processes CCTV footage using YOLOv8 + InsightFace face recognition.

---

## Project Overview

PICS Surveillance Dashboard provides a centralized interface for operations teams to monitor real-time employee presence, review AI-detected attendance and break events, manage staff and organizational structure, and generate Excel-based reports — all driven by an autonomous AI video processing pipeline running on the backend.

---

## Project Objectives

- Provide a real-time, browser-based interface for monitoring AI-processed CCTV events
- Enable administrators to review, filter, and export attendance and break records
- Allow management of staff, departments, branches, cameras, and user roles
- Surface pipeline processing status and system logs for operational visibility
- Support human review of ambiguous face recognition results

---

## Key Features

| Feature | Description |
|---|---|
| **Dashboard** | Overview of today's attendance, active staff, and recent events |
| **Staff Management** | Add, edit, view, and deactivate employee records with profile photos |
| **Camera Management** | Register and configure CCTV cameras by role (attendance / break-in / break-out) |
| **Camera Processing** | Monitor per-camera video processing status and progress |
| **AI Pipeline Monitor** | View real-time pipeline execution status and worker health |
| **Events Dashboard** | Browse AI-detected person events with face crop thumbnails and recognition results |
| **Activities Log** | Filter and review check-in/check-out and break events per employee |
| **Reports** | Generate and download attendance and break reports as Excel files with date/shift/department filters |
| **Departments & Branches** | Manage organizational hierarchy with shift configuration |
| **Roles & Permissions** | RBAC — assign and manage user roles and access levels |
| **Logs Viewer** | Browse system and pipeline logs with filtering |
| **Authentication** | Login, session management, and password recovery |

---

## Technology Stack

| Category | Technology | Version |
|---|---|---|
| UI Framework | React | 19.x |
| Build Tool | Vite | 8.x |
| Icon Library | Lucide React | 1.x |
| Linting | OxLint | 1.x |
| Language | JavaScript (JSX) | ES2022+ |
| Styling | Plain CSS (custom design system) | — |
| Package Manager | npm | — |

> No external CSS framework (Tailwind, Bootstrap, MUI) is used. All UI components are built from scratch using a custom CSS design system defined in `src/index.css` and `src/bm-styles.css`.

---

## Project Architecture

```
PICS Surveillance Dashboard (React SPA)
        │
        │  REST API (HTTP/JSON)
        ▼
PICS Backend (FastAPI + PostgreSQL)
        │
        │  Video Processing
        ▼
AI Pipeline (YOLOv8n + InsightFace + NVDEC)
        │
        ▼
CCTV Camera Footage
```

The frontend is a pure client-side Single Page Application (SPA). All data is fetched from the backend REST API defined by `VITE_API_BASE` environment variable.

---

## Project Directory Structure

```
PICS-surveillance-dashboard/
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   ├── pics-brand-mark.svg
│   └── static/
│       └── profiles/          # Staff profile images (served by backend)
├── src/
│   ├── assets/                # Static image assets
│   ├── components/            # Reusable UI components
│   │   ├── BrandLogo.jsx
│   │   ├── CameraProcessingFilterModal.jsx
│   │   ├── CustomDatePicker.jsx
│   │   ├── CustomSelect.jsx
│   │   ├── CustomTimePicker.jsx
│   │   ├── DateRangePicker.jsx
│   │   ├── EmployeeCards.jsx
│   │   ├── EventsTable.jsx
│   │   ├── LoginPage.jsx
│   │   ├── Navbar.jsx
│   │   ├── PageHeader.jsx
│   │   ├── PageLoader.jsx
│   │   ├── ReportFilterModal.jsx
│   │   ├── ReportPanel.jsx
│   │   ├── Sidebar.jsx
│   │   ├── StaffAvatar.jsx
│   │   ├── StatsOverview.jsx
│   │   └── UserProfileHeaderBadge.jsx
│   ├── pages/                 # Full page views (one per route)
│   │   ├── ActivitiesPage.jsx
│   │   ├── BranchesPage.jsx
│   │   ├── CameraProcessingPage.jsx
│   │   ├── CamerasPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── DepartmentsPage.jsx
│   │   ├── EventsDashboardPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   ├── LogsPage.jsx
│   │   ├── PipelinePage.jsx
│   │   ├── ReportsPage.jsx
│   │   ├── RolesPage.jsx
│   │   └── StaffPage.jsx
│   ├── utils/
│   │   └── permissions.js     # RBAC permission helpers
│   ├── config.js              # API base URL configuration
│   ├── App.jsx                # Root component and client-side routing
│   ├── main.jsx               # React DOM entry point
│   ├── index.css              # Global CSS design system
│   ├── bm-styles.css          # Extended UI component styles
│   ├── App.css                # App-level layout styles
│   └── font-overrides.css     # Typography overrides
├── .env.example               # Environment variable template
├── .gitignore
├── index.html                 # Vite HTML entry point
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

---

## Installation Requirements

- **Node.js** >= 18.x ([nodejs.org](https://nodejs.org))
- **npm** >= 9.x (bundled with Node.js)
- **PICS Backend** running and accessible (see Backend API Integration)

---

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/Iamzain804/PICS-surveillance-dashboard.git
cd PICS-surveillance-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set your backend URL:

```env
VITE_API_BASE=http://localhost:8000
```

### 4. Start development server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE` | Base URL of the PICS FastAPI backend | `http://localhost:8000` |

> All Vite environment variables must be prefixed with `VITE_` to be accessible in the browser. Never commit `.env` files containing real credentials.

---

## Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | Build optimized production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run OxLint static analysis |

---

## Production Build

```bash
npm run build
```

The production-ready static files will be output to the `dist/` directory. Deploy this directory to any static file server (Nginx, Apache, Vercel, Netlify, etc.).

### Nginx Example Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/pics-dashboard/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
    }
}
```

---

## Backend API Integration

This dashboard communicates exclusively with the **PICS Backend** (FastAPI).

The backend must be running and accessible at the URL specified by `VITE_API_BASE`.

Backend provides:
- JWT-based authentication endpoints
- Staff, camera, department, branch, and role management APIs
- AI pipeline control and status endpoints
- Event and activity data endpoints
- Report generation endpoints (returns Excel files)
- System log streaming endpoints

Refer to the backend repository for full API documentation.

---

## Security Considerations

- **Never commit `.env`** files. Use `.env.example` as the only committed template.
- All API requests use JWT bearer tokens managed in memory or `localStorage`.
- RBAC permissions are enforced server-side; the frontend `permissions.js` utility provides UI-level access control only.
- No sensitive credentials, API keys, or tokens are hardcoded in the source.
- The production build should be served over HTTPS.

---

## Planned Improvements

> The following are planned enhancements and are not yet implemented.

- Real-time event streaming via WebSocket
- Dark mode support
- Multi-language (i18n) support
- Mobile-responsive layout improvements
- Interactive dashboard charts and analytics
- Bulk staff import from CSV/Excel

---

## Author

**Muhammad Zain Manzoor**
GitHub: [@Iamzain804](https://github.com/Iamzain804)

