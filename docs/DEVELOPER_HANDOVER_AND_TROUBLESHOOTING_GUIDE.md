# K-Connect — Complete Developer Handover, Architecture & Remote Troubleshooting Field Manual

> **Document Type:** Master Developer Handover & Production Operations Runbook  
> **Target Audience:** Any new Software Engineer, DevOps, or AI Coding Agent working on this project  
> **Application:** K-Connect (KTech Service & Business Management Desktop Application)  
> **Version:** 1.1.0 | **Last Updated:** October 2026  

---

## Table of Contents

1. [Executive Overview & Business Domain](#1-executive-overview--business-domain)
2. [Complete Technology Stack & Repository Map](#2-complete-technology-stack--repository-map)
3. [Architecture & Inter-Process Communication (IPC)](#3-architecture--inter-process-communication-ipc)
4. [Database & Local Storage Architecture](#4-database--local-storage-architecture)
5. [Domain Modules & State Machines](#5-domain-modules--state-machines)
6. [Security, Cryptography & Licensing Subsystems](#6-security-cryptography--licensing-subsystems)
7. [Enterprise Logging & Diagnostics Packager](#7-enterprise-logging--diagnostics-packager)
8. [Zero-Cost Remote Support Engineer Portal & Protocol](#8-zero-cost-remote-support-engineer-portal--protocol)
9. [Step-by-Step Remote Debugging & Troubleshooting Guide](#9-step-by-step-remote-debugging--troubleshooting-guide)
10. [Emergency Incident Runbook (Top Production Scenarios)](#10-emergency-incident-runbook-top-production-scenarios)
11. [Build, Test, Release & Auto-Update Procedures](#11-build-test-release--auto-update-procedures)

---

## 1. Executive Overview & Business Domain

### What is K-Connect?
**K-Connect** is an offline-first, high-performance desktop application engineered for computer repair shops, service centers, and IT hardware businesses (specifically customized for **KTech Computers**).

### What does it do?
1. **Service Job Intake & Repair Lifecycle:** Tracks customer devices (Laptops, MacBooks, Desktops, Consoles, SMPS, Storage Drives) through a strict 13-stage state machine from intake to testing and delivery.
2. **Customer CRM & Device Directory:** Customer profiles, phone autocomplete, duplicate detection, and 18 distinct hardware equipment specs.
3. **Billing, GST Invoicing & Local Printing:** Multi-split payments (Cash, UPI QR, Card), GST tax engine (CGST/SGST/IGST), A4 PDF Tax Invoices, and 80mm/58mm POS thermal admission slips.
4. **Multi-Tier Inventory & Salvage Harvesting:** Raw parts, used components, scrap harvesting with parent-device lineage tracking, and automated stock deductions.
5. **Specialized Workflows:** Dedicated Data Recovery studio, Custom PC Builder rig configurator, Refurbished sales, and 1-Click Warranty Claims.
6. **Automated WhatsApp Alerts:** Cloud API or WhatsApp Web/Desktop deep link template notifications.

---

## 2. Complete Technology Stack & Repository Map

### Tech Stack Table
| Layer | Technologies Used |
| :--- | :--- |
| **Desktop Shell** | Electron 31.7.7 |
| **Renderer UI** | React 18.3.1, TypeScript 5.5.3, Vite 5.3.4 |
| **Icons & Styling** | Lucide React, Custom High-Density Vanilla CSS Design System (Dark/Light) |
| **Embedded Database** | SQLite / LibSQL (`@libsql/client`) with WAL Mode |
| **ORM & Migrations** | Drizzle ORM 0.38.4, `drizzle-kit` |
| **Crypto & Security** | Node.js `crypto` (AES-256-GCM, Salted `scrypt`, HMAC-SHA256) |
| **Packaging & Updates** | `electron-builder` 24.13.3, `electron-updater` 6.8.9 |
| **Test Suite** | Vitest 2.0.3 (62 automated unit & integration tests) |

### Complete Repository Map
```
ktech-service-management/
├── electron/                         # ELECTRON MAIN PROCESS & BACKEND
│   ├── main.ts                       # App lifecycle bootstrap, window hardening, firewall init
│   ├── preload.ts                    # Secure contextBridge exposing window.electronAPI
│   ├── db/                           # DATA PERSISTENCE LAYER
│   │   ├── database.ts               # SQLite/LibSQL init, 46-table DDL, backup & audit helpers
│   │   ├── seed.ts                   # Default seed data (roles, permissions, settings)
│   │   └── schema/                   # Drizzle ORM Schema definitions
│   │       ├── auth.ts               # Users, roles, permissions, role_permissions
│   │       ├── billing.ts            # Invoices, invoice_items, payments, quotations
│   │       ├── customers.ts          # Customers, customer_addresses
│   │       ├── devices.ts            # Devices (18 equipment types), device_photos
│   │       ├── inventory.ts          # Inventory items, categories, transactions, salvage
│   │       ├── jobs.ts               # Service jobs, status history, checklists, tests
│   │       ├── products.ts           # Retail products, sales, pc_builds
│   │       └── specialized.ts        # Data recovery, warranties, communication messages
│   ├── ipc/                          # MODULAR IPC CONTROLLERS (Backend Endpoints)
│   │   ├── authIpc.ts                # Login, PIN switch, user management
│   │   ├── billingIpc.ts             # Invoices, payments, quotations, PDF/print generation
│   │   ├── communicationIpc.ts       # WhatsApp dispatch & message templates
│   │   ├── customerIpc.ts            # Customer CRM & duplicate checks
│   │   ├── deviceIpc.ts              # Equipment profiles & intake photos
│   │   ├── inventoryIpc.ts           # Stock movements, salvage dismantling
│   │   ├── jobIpc.ts                 # Job intake, state transitions, technician checklists
│   │   ├── reportsIpc.ts             # Analytics, revenue charts, technician workloads
│   │   ├── searchIpc.ts              # Global search (Ctrl+K) across jobs, phones, serials
│   │   ├── specializedIpc.ts         # Data recovery, PC builder, refurbished sales
│   │   ├── systemIpc.ts              # Diagnostics, 7-day logs, remote support, workstation license
│   │   ├── updaterIpc.ts             # GitHub releases auto-updater
│   │   └── vaultIpc.ts               # Encrypted device passcode unlocker
│   ├── network/                      # Network utilities
│   ├── security/                     # ENTERPRISE SECURITY SUBSYSTEMS
│   │   ├── crypto.ts                 # Dynamic hardware-fingerprinted AES-256-GCM & scrypt hashing
│   │   ├── firewall.ts               # In-app outbound request whitelist firewall
│   │   ├── supportSession.ts         # Cryptographic challenge-response elevated support session
│   │   └── workstationLicense.ts     # 4-computer hardware node seat licensing engine
│   └── utils/                        # LOGGING & UTILITIES
│       ├── logger.ts                 # 7-day rolling logger, PII redactor, exception hooks
│       └── diagnosticPackager.ts     # Pure Node.js PKZIP diagnostic archive bundle builder
├── src/                              # REACT RENDERER (FRONTEND UI)
│   ├── App.tsx                       # Main shell, license lock check, global hotkeys, router
│   ├── index.css                     # Comprehensive CSS tokens & component design system
│   ├── main.tsx                      # React root mount
│   ├── context/                      # GLOBAL STATE CONTEXTS
│   │   ├── AuthContext.tsx           # Session user, RBAC permission checks, PIN switch
│   │   └── ShopContext.tsx           # Shop profile, branding, currency, tax configurations
│   ├── components/                   # UI VIEW MODULES
│   │   ├── auth/                     # LoginPage, PinModal, UserManagement
│   │   ├── billing/                  # BillingWorkspace, InvoiceCreator, PaymentModal, PrintView
│   │   ├── common/                   # Reusable UI widgets, badges, modals, data tables
│   │   ├── communication/            # WhatsAppCenter, message template editor
│   │   ├── customers/                # CustomerList, CustomerProfile, AddressModal
│   │   ├── dashboard/                # ExecutiveDashboard, KPI cards, revenue charts, urgent queue
│   │   ├── equipment/                # EquipmentProfile, spec sheets for 18 device types
│   │   ├── inventory/                # InventoryWorkspace, StockTransfer, SalvageDismantler
│   │   ├── jobs/                     # JobList, JobDetail, NewJobWizard, StatusTimeline
│   │   ├── layout/                   # Sidebar navigation, Header, GlobalSearchModal (Ctrl+K)
│   │   ├── reports/                  # ReportsDashboard, GST sales reports, technician margins
│   │   ├── settings/                 # ShopSettingsModal, DiagnosticsTab, RemoteSupportTab
│   │   ├── setup/                    # SetupWizard (Day-Zero onboarding wizard)
│   │   ├── specialized/              # DataRecoveryStudio, PCBuilderWizard, RefurbishedStore
│   │   └── technician/               # TechnicianWorkspace, HardwareQC checklist, IC root cause
│   ├── types/                        # TYPESCRIPT INTERFACES
│   │   ├── index.ts                  # All domain entities & typed ElectronAPI definition
│   │   └── electron.d.ts             # window.electronAPI global type declaration
│   └── utils/                        # Frontend formatters, currency, date helpers
├── tools/                            # ENGINEERING UTILITIES
│   └── ktech-support-generator.html  # Free offline single-file Support Token Generator
├── tests/                            # TEST SUITE (Vitest)
│   ├── enterprise_system.test.ts     # Tests for logging, PII, zip packager, licensing, firewall
│   ├── security.test.ts              # Tests for AES-256-GCM & scrypt password hashing
│   ├── database.test.ts              # Tests for 46 SQLite relational tables & seeds
│   └── *.test.ts                     # Jobs, billing, inventory, CRM, technician, search tests
├── docs/                             # TECHNICAL DOCUMENTATION
├── electron-builder.json             # Packaging, NSIS installer, ASAR configuration
├── vite.config.ts                    # Vite build pipeline & Electron plugin config
└── package.json                      # Dependencies and npm scripts
```

---

## 3. Architecture & Inter-Process Communication (IPC)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RENDERER PROCESS (UI)                           │
│     React 18 Components + Context (AuthContext / ShopContext)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         window.electronAPI (Typed)
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    PRELOAD BRIDGE (electron/preload.ts)                │
│    contextBridge.exposeInMainWorld('electronAPI', { ... })             │
│    Enforces sandbox: contextIsolation=true, nodeIntegration=false      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                           ipcRenderer.invoke()
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                   ELECTRON MAIN PROCESS (Backend)                      │
│   ├── IPC Handlers (electron/ipc/*.ts)                                 │
│   ├── Security Subsystems (Crypto, Firewall, WorkstationLicense)       │
│   ├── Logger & Exception Trap (electron/utils/logger.ts)              │
│   └── Data Persistence Layer (Drizzle ORM + SQLite LibSQL Client)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Direct File I/O
┌───────────────────────────────────▼────────────────────────────────────┐
│                    LOCAL OS HARD DRIVE PERSISTENCE                     │
│   ├── Database:  D:\K-Connect\Data\database\ktech.sqlite               │
│   ├── Logs:      D:\K-Connect\Data\logs\ktech-YYYY-MM-DD.log           │
│   └── Backups:   D:\K-Connect\Data\backups\auto\*.sqlite               │
└────────────────────────────────────────────────────────────────────────┘
```

### How to Add a New Feature or IPC Channel:
1. Define the handler in the appropriate `electron/ipc/<domain>Ipc.ts` file using `ipcMain.handle('<domain>:<action>', async (event, args) => { ... })`.
2. Expose the typed wrapper method inside `electron/preload.ts`.
3. Add the TypeScript signature to `ElectronAPI` inside `src/types/index.ts`.
4. Call `await window.electronAPI.<domain>.<action>(args)` inside your React component.

---

## 4. Database & Local Storage Architecture

### File Locations on Client Computers
* **Primary Target (Enterprise Drive Separation):** `D:\K-Connect\Data\database\ktech.sqlite`
* **Fallback (if no D: drive exists):** `%APPDATA%\ktech-service-management\database\ktech.sqlite`
* **Storage Folders:**
  * Intake Photos: `D:\K-Connect\Data\storage\photos\`
  * Job Attachments: `D:\K-Connect\Data\storage\attachments\`
  * Generated PDFs: `D:\K-Connect\Data\storage\generated_pdfs\`
  * Automated Backups: `D:\K-Connect\Data\backups\auto\`
  * Diagnostic Bundles: `D:\K-Connect\Data\exports\diagnostics\`

### Relational Schema Summary (46 Tables)
1. **Core & Auth (5):** `roles`, `permissions`, `role_permissions`, `users`, `audit_logs`
2. **System & Security (3):** `settings`, `backups`, `licensed_workstations`
3. **CRM & Equipment (4):** `customers`, `customer_addresses`, `devices`, `device_photos`
4. **Service Jobs (11):** `service_jobs`, `job_status_history`, `job_inspections`, `job_diagnosis`, `job_services`, `job_parts`, `job_repair_activities`, `job_notes`, `job_attachments`, `job_checklists`, `job_tests`
5. **Quotations & Invoicing (6):** `quotations`, `quotation_items`, `quotation_approvals`, `invoices`, `invoice_items`, `payments`
6. **Inventory & Salvage (6):** `inventory_categories`, `inventory_locations`, `inventory_items`, `inventory_transactions`, `suppliers`, `salvage_devices`, `salvage_parts`
7. **Specialized Modules (7):** `data_recovery_jobs`, `products`, `product_sales`, `product_sale_items`, `pc_builds`, `pc_build_items`, `warranties`, `warranty_jobs`
8. **Communication (2):** `communication_templates`, `communication_messages`

---

## 5. Domain Modules & State Machines

### 13-Stage Service Job State Machine
```
   [RECEIVED] ──► [DIAGNOSIS] ──► [ESTIMATE_PENDING]
                         │
                         ▼
               [WAITING_APPROVAL] ──► [CANCELLED] / [REJECTED]
                         │
                         ▼ (Customer Approves)
                   [IN_PROGRESS]
                         │
                         ▼
                   [QC_TESTING]
                         │
                         ▼
               [READY_FOR_PICKUP]
                         │
                         ▼
                    [DELIVERED]
```

### Specialized Workflows
* **Data Recovery Studio (`electron/ipc/specializedIpc.ts`):** Includes storage media physical evaluation, firmware checks, donor parts matching, and client risk liability waivers.
* **Salvage Lineage Engine (`electron/ipc/inventoryIpc.ts`):** When a device is marked `UNREPAIRABLE`, it can be converted into a salvage unit (`SALV-XXXXX`). Working components (RAM, Screen, Motherboard ICs) are harvested into inventory with parent device tracking.
* **Custom PC Builder:** Interactive slot-by-slot rig builder with real-time TDP watt calculations, cost vs. quoted margin estimation, and PDF proposal generation.

---

## 6. Security, Cryptography & Licensing Subsystems

### 1. Dynamic Hardware-Bound Cryptography (`electron/security/crypto.ts`)
* **Algorithm:** AES-256-GCM (Authenticated Encryption).
* **Key Derivation:** Computed dynamically at runtime combining machine entropy (CPU Model, MAC Address, Hostname, Platform) with unique salts via `scrypt`. **Zero static master secrets are hardcoded in the JavaScript bundle.**
* **Passcode Vault:** Device unlock passwords, BIOS pins, and Windows credentials are encrypted on disk and only decrypted in memory upon user request.

### 2. Workstation Node Licensing (`electron/security/workstationLicense.ts`)
* **Seat Limit:** Default 4 active computers per shop (dynamically configurable in `settings` under `license.max_workstations`).
* **Node Identification:** Unique cryptographic `machineId` (e.g. `MCH-3F265FBE62C4`) derived from physical hardware.
* **Enforcement:** If a 5th computer attempts to open the app, the startup check prevents execution and displays the **Seat Limit Exceeded Lockout Screen**.
* **Seat Management:** The shop owner can decommission or replace an old computer with 1 click in **Shop Settings $\rightarrow$ Security & Remote Support**.

### 3. In-App Request Firewall (`electron/security/firewall.ts`)
* Intercepts all outbound web requests via `session.defaultSession.webRequest.onBeforeRequest`.
* Strictly whitelists:
  * WhatsApp Official Cloud APIs (`graph.facebook.com`, `api.whatsapp.com`, `web.whatsapp.com`, `wa.me`)
  * GitHub Auto-Update Servers (`github.com`, `api.github.com`, `objects.githubusercontent.com`)
  * Local loopback (`127.0.0.1`, `localhost`)
* Blocks and logs any rogue or unauthorized third-party external requests.

---

## 7. Enterprise Logging & Diagnostics Packager

### Unified Logging Architecture (`electron/utils/logger.ts`)
* **Daily Rolling Files:** `ktech-YYYY-MM-DD.log` and high-severity `error-YYYY-MM-DD.log`.
* **7-Day Automated Retention:** Scans on boot and daily; deletes log files older than the retention threshold.
* **PII Redaction Engine:** Automatically redacts passwords, passcodes, PINs, auth tokens, and 16-digit credit card numbers using regex pattern matchers before persisting to disk.
* **Global Crash Trap:** Automatically captures uncaught exceptions and unhandled promise rejections.

### 1-Click Diagnostics Packager (`electron/utils/diagnosticPackager.ts`)
* Compresses active 7-day logs + SQLite database integrity metrics (`PRAGMA integrity_check`, `PRAGMA quick_check`, table row counts) + system memory/CPU metrics into `ktech-diagnostics-[timestamp].zip`.
* Implemented in pure Node.js standard library with standard PKZIP format (zero external dependencies).

---

## 8. Zero-Cost Remote Support Engineer Portal & Protocol

When a customer running K-Connect in a remote shop experiences an issue, use the **Consent-Based Cryptographic Support Protocol**.

### The Offline Tool Location
👉 File: [`tools/ktech-support-generator.html`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/tools/ktech-support-generator.html)  
*(Open this file in any browser on your computer or mobile phone. Requires zero internet or hosting).*

### Protocol Flow:
```
1. Customer calls/messages: "I need help / have an error"
2. You say: "Open K-Connect -> Shop Settings -> Security & Remote Support -> Click 'Generate Support Code'"
3. Customer gives you their 15-minute challenge: e.g. "KT-98A4-B2C1"
4. You open tools/ktech-support-generator.html on your phone, enter "KT-98A4-B2C1", click "Generate"
5. Tool outputs: "SUP-A7E1-89F0-C12B"
6. You give this token to the customer
7. Customer enters token -> App activates a 2-Hour Elevated Support Session!
```

### Elevated Privileges Granted in Support Mode:
* **`REINDEX`:** Rebuilds all database indexes.
* **`VACUUM`:** Defragments and reclaims SQLite disk space.
* **`INTEGRITY_FIX`:** Runs full database integrity self-check.
* **`CLEAN_ORPHANS`:** Deletes orphaned relational records.
* **Raw Audit Inspection:** View unmasked system audit trails.

---

## 9. Step-by-Step Remote Debugging & Troubleshooting Guide

### How to Diagnose Any Bug from a Remote System (Checklist for Developers/AIs):

#### Step 1: Request the Diagnostic Zip
Ask the shop manager:
> *"Please open Settings $\rightarrow$ Diagnostics & 7-Day Logs $\rightarrow$ Click 'Download Diagnostic Zip' and send me the file."*
* If the app doesn't open at all, have them zip the folder `D:\K-Connect\Data\logs\` manually.

#### Step 2: Unpack and Inspect the Diagnostic Bundle
The zip contains:
1. `logs/ktech-YYYY-MM-DD.log` — Full trace of all actions and queries.
2. `logs/error-YYYY-MM-DD.log` — Filtered file showing only errors and unhandled exceptions with full stack traces.
3. `diagnostics/database_integrity_report.json` — Status of SQLite database, table counts, and page sizes.
4. `diagnostics/system_environment.json` — Windows OS version, RAM usage, CPU, and Node version.

#### Step 3: Search for Error Signatures in the Log File
Open `error-YYYY-MM-DD.log` and search for:
* `[EXCEPTION]` $\rightarrow$ Uncaught runtime errors.
* `[ERROR]` $\rightarrow$ Handled IPC or database errors.
* `[FIREWALL_BLOCKED]` $\rightarrow$ Blocked external network calls.
* `[AUDIT_TRAIL]` $\rightarrow$ Trace what the user clicked immediately prior to the crash.

---

## 10. Emergency Incident Runbook (Top Production Scenarios)

### Scenario 1: Customer PC says "Workstation Seat Limit Exceeded (4/4)"
* **Cause:** The shop installed K-Connect on a 5th PC, or they replaced an old PC with a new one.
* **Fix:**
  1. On any of the 4 active computers in the shop, open **Shop Settings $\rightarrow$ Security & Remote Support**.
  2. Under **Workstation Node Licensing**, locate the old/retired computer name.
  3. Click **"Deactivate Node"**.
  4. On the new computer, click **"Retry Verification"**. It will immediately register and launch.

---

### Scenario 2: Shop Owner forgot their Password or PIN
* **Cause:** Staff forgot credentials and cannot log in.
* **Fix via Elevated Support Session:**
  1. From the Login page, have them generate a Support Challenge Code.
  2. Generate the Unlock Token using [`tools/ktech-support-generator.html`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/tools/ktech-support-generator.html).
  3. In Support Mode, use the Reset Password command to set a temporary password (e.g. `kconnect123`).
* **Manual Database Fix (if accessing disk directly):**
  1. Open `D:\K-Connect\Data\database\ktech.sqlite` in SQLite Studio / DB Browser for SQLite.
  2. Update table `users`:
     ```sql
     UPDATE users SET pin_code = '1234' WHERE role_id = 'ROLE_OWNER';
     ```

---

### Scenario 3: Database Corrupted or Hardware Power Loss During Write
* **Cause:** PC was forcefully turned off during a heavy disk write.
* **Fix (1-Click Recovery from Pre-Restore Snapshot):**
  1. Close the app.
  2. Check `D:\K-Connect\Data\backups\auto\` for the latest automatic daily backup snapshot (e.g. `ktech_backup_auto_2026-10-07.sqlite`).
  3. Copy that backup file to `D:\K-Connect\Data\database\ktech.sqlite`.
  4. Launch K-Connect. All data is restored up to the backup timestamp.

---

### Scenario 4: Moving K-Connect to a Brand New Computer (Migration)
* **How to migrate 100% of data to a new PC in 2 minutes:**
  1. On the old PC, copy the entire `D:\K-Connect\Data` folder to a USB pen drive.
  2. Install K-Connect on the new PC.
  3. Paste the `D:\K-Connect\Data` folder onto the new PC's D: drive.
  4. Launch K-Connect. It will automatically detect the database and load all historical records, jobs, invoices, and photos!

---

### Scenario 5: WhatsApp Messages Not Sending
* **Cause:** Client configured Meta WhatsApp Cloud API with an expired bearer token or has no internet.
* **Fix:**
  1. In **WhatsApp Center**, check if "Direct Web / Desktop Links" fallback is enabled.
  2. If using Cloud API, verify the Meta Permanent System User Access Token in Settings.
  3. If offline, K-Connect automatically generates the one-click `wa.me/91...` deep link so technicians can send updates through WhatsApp Desktop or WhatsApp Web without API credits.

---

## 11. Build, Test, Release & Auto-Update Procedures

### Daily Development & Testing
```bash
# 1. Run local development environment with hot reload
npm run dev

# 2. Run full test suite (62 automated unit/integration tests)
npm test

# 3. Verify TypeScript type safety
npm run lint
```

### Packaging Production Executables
```bash
# Build production NSIS Windows installer & portable executable
npm run build

# Output directory: ./release/
# Outputs:
#  - K-Connect Setup 1.1.0.exe (NSIS Installer)
#  - K-Connect-Portable.exe (Standalone zero-install portable executable)
```

### Publishing an Auto-Update
1. Update `"version": "1.2.0"` in `package.json`.
2. Commit and push your changes to GitHub repository `vigneshms2302/ktech-service-management`.
3. Create a GitHub Release with tag `v1.2.0` and upload the files generated in `./release/` (`K-Connect Setup 1.2.0.exe`, `latest.yml`).
4. All client installations will automatically detect the update on boot, display a notification badge, download the differential update in the background, and apply it upon restart.
