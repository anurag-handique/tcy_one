# TCY WorkHub — High-Density Enterprise Desktop Application & Supabase Technical Documentation

> **Product**: TCY WorkHub (Native Desktop Workspace)  
> **Company**: TCY Consulting Private Limited  
> **Version**: 1.0.4-prod (Lean MVP Desktop Packaging)  
> **Desktop System Architecture**: Obsidian Dark Slate (`#0B0D13`), Linear-Style Split Workspaces, Monospace Tabular Metrics, Drag-and-Drop Kanban, Real-Time Supabase PostgreSQL & RLS

---

## 1. Desktop UI Design Language & System Architecture

TCY WorkHub is architected specifically as an **internal desktop workspace** (Tauri 2 / Windows Desktop .exe design) with high information density, tabular typography, and native desktop window controls:

1. **Native Desktop Window Titlebar**:
   - Integrated draggable titlebar with custom minimize, maximize/restore, and close buttons.
   - Connected workspace context (`TCY Consulting Private Limited — Internal Workspace`) and live system status indicator.
2. **Desktop Navigation Architecture**:
   - Linear/Raycast-grade compact sidebar with grouped workspace categories:
     - **CORE**: My Day Cockpit, Tasks & Kanban, Attendance Terminal
     - **COLLABORATION**: Daily Standup, Internal Meetings, Projects, Leave & Holidays
     - **ORGANIZATION**: Team Directory, Reports & Analytics, System & Supabase
3. **Desktop Status Bar (Bottom)**:
   - Live Supabase PostgreSQL connection status, real-time clock-in timer, pending task counters, character set, active user role, and `Ctrl+K` command hint.
4. **Information Density & Typography**:
   - Monospace tabular data figures (`JetBrains Mono`), tight border radii (`rounded-md`/`rounded`), dense table rows, crisp borders (`#1B202C`), and dark obsidian panels (`#0E1118`).

---

## 2. Supabase Database Setup & RLS Migration

### Step 1: Execute SQL DDL
Open your Supabase Project's **SQL Editor** and run:
- [scripts/supabase_schema.sql](file:///e:/tcy_one/scripts/supabase_schema.sql): Creates all 18 PostgreSQL tables, foreign keys, updated_at triggers, and Row-Level Security (RLS) policies.
- [scripts/seed_data.sql](file:///e:/tcy_one/scripts/seed_data.sql): Populates realistic initial team roster, active projects, tasks, attendance history, and holidays.

### Step 2: Configure Environment Variables
Set your credentials in `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-api-key-here
```

---

## 3. Core Modules & Workflows

| Module | Desktop UI Highlights |
| :--- | :--- |
| **My Day Cockpit (`/`)** | Metric summary tape, work item queue with inline state toggles, daily standup checkpoint, meeting launcher, and manager squad triage matrix. |
| **Tasks & Kanban (`/tasks`)** | `dnd-kit` drag-and-drop board across To Do, In Progress, In Review, and Completed columns; filterable data table; rich task inspector dialog. |
| **Attendance & Timecards (`/attendance`)** | Desktop punch terminal with live duration timer, work mode selection (*Office*, *Remote*, *Hybrid*), monthly timesheet log, and regularization request drawer. |
| **Leave & Holidays (`/leave`)** | Entitlement quota meters (*Casual*, *Sick*, *Earned*, *Comp Off*), 1-click manager approval queue, and official holiday list. |
| **Project Workspaces (`/projects`)** | Workspaces grid with progress meters, task linkages, budgets, and creation modal. |
| **Daily Standup (`/standup`)** | Asynchronous Yesterday/Today/Blocker feed with **1-Click Blocker-to-Task** conversion. |
| **Internal Meetings (`/meetings`)** | Schedule calendar, room/link launcher, agenda items, and RSVP toggles. |
| **Team Directory (`/team`)** | Employee roster, departmental hierarchy, contact directory, and onboarding modal. |
| **Reports & Compliance (`/reports`)** | Recharts visual analytics (hours per employee, task distribution, project velocity) and CSV timesheet export. |
| **System & Supabase (`/settings`)** | Database connection status, migration path copying, display density toggle (*Comfortable* vs *Compact*), and demo state reset. |

---

## 4. Running the Application

```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
