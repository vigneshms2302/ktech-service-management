# K-CONNECT (KTECH SERVICE MANAGEMENT)
## Master System Bible, Developer Handover & Remote Operations Field Manual

> **Document Classification:** Master Architectural Specification, Developer Handover, Database Dictionary & Production Troubleshooting Field Manual  
> **Target Audience:** Any new Software Engineer, DevOps Engineer, Support Lead, System Administrator, or AI Coding Agent working on or maintaining this codebase  
> **Application Name:** K-Connect (KTech Service & Business Management Desktop Application)  
> **Current Version:** `1.1.0` | **Release Date:** October 2026 | **Build Target:** Windows Desktop (NSIS & Portable)  
> **Repository:** `vigneshms2302/ktech-service-management`

---

## Table of Contents

1. [Executive Summary & Business Domain Overview](#1-executive-summary--business-domain-overview)
2. [Complete Technology Stack & Repository Map](#2-complete-technology-stack--repository-map)
3. [Three-Tier Architecture & Inter-Process Communication (IPC) Protocol](#3-three-tier-architecture--inter-process-communication-ipc-protocol)
4. [Database Architecture & Complete 46-Table Schema Data Dictionary](#4-database-architecture--complete-46-table-schema-data-dictionary)
5. [Complete IPC API Reference & Controller Catalog](#5-complete-ipc-api-reference--controller-catalog)
6. [Security, Cryptography, Licensing & Anti-Reverse Engineering](#6-security-cryptography-licensing--anti-reverse-engineering)
7. [Enterprise Logging, Audit Trails & Diagnostics Packager](#7-enterprise-logging-audit-trails--diagnostics-packager)
8. [Zero-Cost Remote Support Engineer Portal & Protocol](#8-zero-cost-remote-support-engineer-portal--protocol)
9. [Step-by-Step Remote Debugging & Bug Troubleshooting Field Guide](#9-step-by-step-remote-debugging--bug-troubleshooting-field-guide)
10. [Emergency Incident Playbook (Top 15 Real-World Production Scenarios & Exact Fixes)](#10-emergency-incident-playbook-top-15-real-world-production-scenarios--exact-fixes)
11. [Developer Setup, Testing, Building & Auto-Update Release Pipeline](#11-developer-setup-testing-building--auto-update-release-pipeline)
12. [Frontend Architecture, UI Design System & Component Tree](#12-frontend-architecture-ui-design-system--component-tree)
13. [AI Agent Prompting & Autonomous Task Execution Guidelines](#13-ai-agent-prompting--autonomous-task-execution-guidelines)

---

## 1. Executive Summary & Business Domain Overview

### 1.1 What is K-Connect?
**K-Connect** is an enterprise-grade, offline-first desktop application purpose-built for computer sales, electronics service centers, chip-level repair shops, and IT hardware enterprises (specifically customized for **KTech Computers**, headquartered in Coimbatore, Tamil Nadu, India).

### 1.2 Target Deployment Topology
* **Operating System:** Windows 10 / Windows 11 (64-bit).
* **Operating Mode:** 100% Offline-First. The application executes locally without requiring a persistent internet connection or remote cloud databases.
* **Shop Network Topology:** Multi-Workstation Local Setup (up to 4 authorized workstation nodes per shop: e.g., Reception Counter, Technician Bench 1, Technician Bench 2, Owner/Admin Cabin) sharing a unified local storage volume.
* **Zero Mandatory Monthly Cloud Overhead:** All cryptographic tokens, support tools, logging, PDF generation, and thermal printing run locally with zero server hosting costs.

### 1.3 Core Business Modules & Workflows
1. **13-Stage Service Job Lifecycle State Machine:**
   * Strict state-validated transitions: `RECEIVED` $\rightarrow$ `DIAGNOSIS` $\rightarrow$ `ESTIMATE_PENDING` $\rightarrow$ `WAITING_APPROVAL` $\rightarrow$ `APPROVED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `PARTS_PENDING` $\rightarrow$ `REPAIR_COMPLETED` $\rightarrow$ `QC_TESTING` $\rightarrow$ `READY_FOR_PICKUP` $\rightarrow$ `DELIVERED` (or `CANCELLED` / `REJECTED` / `UNREPAIRABLE`).
2. **Customer CRM & 18 Equipment Profiles:**
   * Customer profiles with primary/secondary phone lookup, GSTIN validation, and address management.
   * Equipment profiles supporting 18 hardware categories: Laptop, MacBook, Gaming PC, Desktop, All-in-One PC, Gaming Console, Server, Monitored PSU/SMPS, External HDD/SSD, NAS, Motherboard, GPU, Printer, UPS, Tablet, Mobile Phone, Projector, and Audio Amplifier.
   * Device Intake Condition Photos and Encrypted Passcode Vault.
3. **Billing, GST Invoicing & Local Printing:**
   * Multi-split payment engine supporting Cash, UPI QR, Card, Bank Transfer, and Advance Deposit deductions.
   * Comprehensive Indian GST tax engine (CGST 9% + SGST 9% for intra-state Tamil Nadu, IGST 18% for inter-state).
   * A4 PDF Tax Invoices & 80mm/58mm thermal POS customer intake admission slips.
4. **Multi-Tier Inventory & Salvage Harvesting Engine:**
   * Raw spare parts, retail products, accessories, and consumable tracking with minimum reorder alerts.
   * **Salvage Lineage Engine:** When a device is declared unrepairable, it can be converted into a salvage parent unit (`SALV-XXXXX`). Working ICs, screens, RAM, and batteries are harvested into inventory with lineage tracked back to the original donor device.
5. **Specialized High-Margin Business Modules:**
   * **Data Recovery Studio:** Clean-room intake, media condition evaluation (head crash, firmware corruption, bad sectors), donor drive matching, and liability disclaimer waiver.
   * **Custom PC Builder:** Interactive slot-by-slot rig builder with real-time TDP wattage calculation, component compatibility checks, cost vs. quoted margin estimation, and proposal PDF generation.
   * **Refurbished Device Store:** Refurbished laptop/desktop sales with cosmetic grading (`GRADE_A`, `GRADE_B`), refurbishment cost tracking, and warranty assignment.
   * **1-Click Warranty Claims:** Post-repair warranty registry and re-repair claim tracking.
6. **Automated WhatsApp Communication Engine:**
   * Meta WhatsApp Cloud API integration for automated status change broadcasts.
   * Zero-cost fallback to `wa.me/91...` WhatsApp Desktop/Web deep links when internet is offline or API tokens expire.

---

## 2. Complete Technology Stack & Repository Map

### 2.1 Technology Stack Table

| Architectural Layer | Technologies Used | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Desktop Shell** | Electron | `31.7.7` | Cross-platform desktop runtime with native OS access and Chromium rendering |
| **UI Framework** | React | `18.3.1` | Component-based UI with virtual DOM and state management |
| **Language** | TypeScript | `5.5.3` | Strict static typing across both main and renderer processes |
| **Build Tool & Bundler** | Vite | `5.3.4` | Lightning-fast HMR and ESM bundling |
| **Embedded Database** | SQLite / LibSQL | `@libsql/client 0.14.0` | Ultra-fast in-process relational database with zero daemon memory bloat |
| **ORM & Migrations** | Drizzle ORM | `0.38.4` | Type-safe SQL query builder and schema management |
| **Cryptography** | Node.js Crypto | Built-in | AES-256-GCM authenticated encryption, salted scrypt hashing, HMAC-SHA256 |
| **Desktop Packaging** | Electron Builder | `24.13.3` | Windows NSIS installer and standalone portable executable generation |
| **Auto-Updater** | Electron Updater | `6.8.9` | Seamless differential updates via GitHub Releases |
| **Test Suite** | Vitest | `2.1.9` | Fast unit and integration test runner (62 automated tests passing) |
| **UI Icons** | Lucide React | `0.460.0` | Clean, high-density SVG icon library |

### 2.2 Complete Repository File & Directory Map

```
ktech-service-management/
├── electron/                             # ELECTRON MAIN PROCESS (Backend Core)
│   ├── main.ts                           # App bootstrap, window lifecycle, firewall & license startup
│   ├── preload.ts                        # ContextBridge exposing window.electronAPI to Renderer
│   ├── db/                               # DATA PERSISTENCE LAYER
│   │   ├── database.ts                   # SQLite init, 46-table DDL script, backup & audit helpers
│   │   ├── seed.ts                       # Default seed data (roles, permissions, settings, admin user)
│   │   └── schema/                       # Drizzle ORM Schema definitions
│   │       ├── index.ts                  # Schema aggregator export
│   │       ├── auth.ts                   # roles, permissions, role_permissions, users, audit_logs
│   │       ├── billing.ts                # quotations, quotation_items, quotation_approvals, invoices, invoice_items, payments
│   │       ├── customers.ts              # customers, customer_addresses
│   │       ├── devices.ts                # devices (18 equipment types), device_photos
│   │       ├── inventory.ts              # inventory_categories, locations, suppliers, items, transactions, salvage
│   │       ├── jobs.ts                   # service_jobs, status_history, inspections, diagnosis, services, parts, tests
│   │       ├── products.ts               # products, product_sales, product_sale_items, pc_builds, pc_build_items
│   │       └── specialized.ts            # data_recovery_jobs, warranties, warranty_jobs, communication
│   ├── ipc/                              # MODULAR IPC CONTROLLERS (API Handlers)
│   │   ├── authIpc.ts                    # Authentication, PIN switching, user management
│   │   ├── billingIpc.ts                 # Invoices, payments, quotations, PDF and thermal printing
│   │   ├── communicationIpc.ts           # WhatsApp Cloud API & wa.me message dispatch
│   │   ├── customerIpc.ts                # Customer CRM, duplicate phone check, addresses
│   │   ├── deviceIpc.ts                  # Equipment profiles, intake photos
│   │   ├── inventoryIpc.ts               # Inventory transactions, stock alerts, salvage dismantling
│   │   ├── jobIpc.ts                     # 13-stage job intake, state transitions, technician checklists
│   │   ├── reportsIpc.ts                 # Executive dashboard metrics, GST sales reports, technician workloads
│   │   ├── searchIpc.ts                  # Global search (Ctrl+K) across jobs, customers, serials
│   │   ├── specializedIpc.ts             # Data recovery studio, custom PC builder, refurbished sales
│   │   ├── systemIpc.ts                  # 7-day logs, diagnostics zip, remote support, workstation licensing
│   │   ├── updaterIpc.ts                 # GitHub releases auto-updater integration
│   │   └── vaultIpc.ts                   # Encrypted device passcode unlocker
│   ├── security/                         # ENTERPRISE SECURITY & HARDENING
│   │   ├── crypto.ts                     # Hardware-fingerprinted AES-256-GCM & scrypt password hashing
│   │   ├── firewall.ts                   # In-app outbound HTTP/HTTPS request whitelist firewall
│   │   ├── supportSession.ts             # Cryptographic challenge-response elevated support session
│   │   └── workstationLicense.ts         # 4-computer hardware node seat licensing engine
│   └── utils/                            # UTILITIES & LOGGING
│       ├── logger.ts                     # 7-day rolling daily logger, PII redactor, exception hooks
│       └── diagnosticPackager.ts         # Pure Node.js PKZIP diagnostic archive packager
├── src/                                  # REACT RENDERER PROCESS (Frontend UI)
│   ├── App.tsx                           # Main application shell, workstation lock check, router, hotkeys
│   ├── index.css                         # CSS design system, typography tokens, glassmorphism, themes
│   ├── main.tsx                          # React 18 root mounting
│   ├── context/                          # GLOBAL REACT CONTEXTS
│   │   ├── AuthContext.tsx               # Active session, RBAC permissions, fast technician PIN switch
│   │   └── ShopContext.tsx               # Shop branding, address, GSTIN, currency, tax rates
│   ├── components/                       # UI VIEW MODULES & WORKSPACES
│   │   ├── auth/                         # LoginPage, PinSwitchModal, UserManagementModal
│   │   ├── billing/                      # BillingWorkspace, InvoiceCreatorModal, PaymentModal, PrintPreviewModal
│   │   ├── common/                       # Modal, Badge, DataTable, KPICard, ConfirmDialog, DateRangePicker
│   │   ├── communication/                # WhatsAppCenter, TemplateEditorModal, MessageLogModal
│   │   ├── customers/                    # CustomerList, CustomerProfileModal, CustomerAddressModal
│   │   ├── dashboard/                    # ExecutiveDashboard, UrgentQueue, TechnicianWorkloadChart, RevenueChart
│   │   ├── equipment/                    # EquipmentProfileView, SpecEditors for 18 hardware types
│   │   ├── inventory/                    # InventoryWorkspace, StockAdjustmentModal, SalvageDismantler
│   │   ├── jobs/                         # JobList, JobDetailView, NewJobWizard, StatusTransitionModal
│   │   ├── layout/                       # Sidebar, Header, GlobalSearchModal (Ctrl+K), NotificationBell
│   │   ├── reports/                      # ReportsDashboard, GSTReportTab, TechnicianMarginTab
│   │   ├── settings/                     # ShopSettingsModal, DiagnosticsTab, RemoteSupportTab
│   │   ├── setup/                        # SetupWizard (Day-Zero first-time shop onboarding wizard)
│   │   ├── specialized/                  # DataRecoveryStudio, PCBuilderWizard, RefurbishedStore
│   │   └── technician/                   # TechnicianWorkspace, HardwareQCModal, VoltageChecklist
│   ├── types/                            # TYPESCRIPT INTERFACES & ENUMS
│   │   ├── index.ts                      # Domain models, enums, status transitions, and typed ElectronAPI
│   │   └── electron.d.ts                 # Global window.electronAPI interface declaration
│   └── utils/                            # Frontend helpers (currency formatting, date formatters, tax maths)
├── tools/                                # STANDALONE SUPPORT UTILITIES
│   └── ktech-support-generator.html      # Zero-cost offline Single-File Support Token Generator (Web Crypto API)
├── tests/                                # AUTOMATED TEST SUITE (Vitest)
│   ├── autoCorrect.test.ts               # Input sanitizer and autocorrect test suite
│   ├── enterprise_system.test.ts         # Logging, PII redaction, zip packager, licensing, firewall tests
│   ├── security.test.ts                  # AES-256-GCM encryption & scrypt password hashing tests
│   ├── database.test.ts                  # 46 relational SQLite tables DDL, foreign keys & migrations tests
│   ├── jobs.test.ts                      # Service job lifecycle and state machine tests
│   ├── billing.test.ts                   # Invoicing, multi-split payments, and GST calculation tests
│   ├── inventory.test.ts                 # Stock deduction, salvage dismantling, and reorder tests
│   ├── customers.test.ts                 # CRM customer lookup and duplicate phone detection tests
│   ├── devices.test.ts                   # 18 equipment spec sheets and intake condition tests
│   ├── technician.test.ts                # Technician checklists, QC inspections, and diagnosis tests
│   ├── specialized.test.ts               # Data recovery, PC builder, and refurbished sale tests
│   ├── search.test.ts                    # Global search indexer and query tests
│   └── transactions.test.ts              # Inventory audit trail transaction tests
├── docs/                                 # PROJECT DOCUMENTATION
│   ├── MASTER_PROJECT_HANDOVER_AND_SYSTEM_BIBLE.md # (THIS DOCUMENT - Master Source of Truth)
│   ├── COMPLETED_AND_PENDING_ROADMAP.md  # Development status, completed features & future roadmap
│   ├── DATABASE_DESIGN.md                # Relational database architectural documentation
│   ├── TECHNICAL_ARCHITECTURE.md         # Electron process architecture and IPC specifications
│   ├── PRODUCT_REQUIREMENTS.md           # Business domain and feature requirements
│   ├── WORKFLOW_STATE_MACHINE.md         # 13-stage repair lifecycle transition rules
│   └── WHATSAPP_ARCHITECTURE.md          # WhatsApp Cloud API & fallback specification
├── electron-builder.json                 # Packaging configuration, NSIS installer, ASAR hardening
├── vite.config.ts                        # Vite configuration with Electron plugin
├── tsconfig.json                         # Strict TypeScript compiler options
└── package.json                          # Dependencies, scripts, and build metadata
```

---

## 3. Three-Tier Architecture & Inter-Process Communication (IPC) Protocol

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            RENDERER PROCESS (UI)                             │
│     React 18 Components + Context (AuthContext / ShopContext)                │
│     Executes inside sandboxed Chromium instance (Zero Node.js Access)        │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                            window.electronAPI (Typed)
                                       │
┌──────────────────────────────────────▼───────────────────────────────────────┐
│                      PRELOAD BRIDGE (electron/preload.ts)                    │
│    contextBridge.exposeInMainWorld('electronAPI', { ... })                   │
│    Enforces: contextIsolation: true, nodeIntegration: false, sandbox: true   │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                             ipcRenderer.invoke()
                                       │
┌──────────────────────────────────────▼───────────────────────────────────────┐
│                     ELECTRON MAIN PROCESS (Backend Core)                     │
│    ├── IPC Controllers (electron/ipc/*.ts)                                   │
│    ├── Security Engine (Crypto, Outbound Firewall, WorkstationLicense)       │
│    ├── Enterprise Logger & Exception Trap (electron/utils/logger.ts)         │
│    └── Data Persistence Engine (Drizzle ORM + LibSQL SQLite Client)          │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ Direct Disk I/O (WAL Mode)
┌──────────────────────────────────────▼───────────────────────────────────────┐
│                       LOCAL OPERATING SYSTEM DISK                            │
│    ├── Database:  D:\K-Connect\Data\database\ktech.sqlite                    │
│    ├── 7-Day Logs: D:\K-Connect\Data\logs\ktech-YYYY-MM-DD.log               │
│    ├── Storage:   D:\K-Connect\Data\storage\(photos|attachments|pdfs)\       │
│    └── Backups:   D:\K-Connect\Data\backups\auto\*.sqlite                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Security Boundaries & Context Isolation
* **`contextIsolation: true`:** Prevents the React frontend from accessing Node.js runtime primitives (`fs`, `child_process`, `crypto`, `os`).
* **`nodeIntegration: false`:** Guarantees that any third-party malicious JavaScript or XSS cannot execute shell commands or compromise the host machine.
* **`sandbox: true`:** Restricts Chromium renderer privileges to the minimum required.

### 3.2 How to Add a New IPC Channel (4-Step Standard):
1. **Implement Main Process Controller:** Add the handler inside the appropriate `electron/ipc/<domain>Ipc.ts` using `ipcMain.handle('<domain>:<action>', async (event, params) => { ... })`.
2. **Expose in Preload Bridge:** Add the wrapper in `electron/preload.ts`:
   ```typescript
   <domain>: {
     <action>: (params: ParamType) => ipcRenderer.invoke('<domain>:<action>', params),
   }
   ```
3. **Declare TypeScript Interface:** Update `ElectronAPI` in `src/types/index.ts` and `src/types/electron.d.ts`.
4. **Consume in React Component:** Call `const result = await window.electronAPI.<domain>.<action>(params);`.

---

## 4. Database Architecture & Complete 46-Table Schema Data Dictionary

### 4.1 Database Engine Rationale: SQLite vs. MySQL
* **Why SQLite/LibSQL + Drizzle ORM was chosen:**
  1. **Zero Client Installation:** Requires no separate MySQL/MariaDB server installation, background Windows services, or root passwords on client PCs.
  2. **Zero Memory Footprint:** Operates in-process using <15MB of RAM (compared to MySQL requiring 300MB–1GB idle RAM).
  3. **Instant 1-Click Backups & Portability:** The entire shop's database is a single file (`ktech.sqlite`). Backing up or moving to a new PC is as simple as copying one file.
  4. **High Concurrency via WAL Mode:** SQLite Write-Ahead Logging (`PRAGMA journal_mode = WAL`) enables simultaneous concurrent reads while writes occur without blocking.
  5. **Crash Resilience:** ACID-compliant transactions with `PRAGMA busy_timeout = 5000` and `PRAGMA foreign_keys = ON`.

### 4.2 Storage Locations on Client Machines
* **Primary Target:** `D:\K-Connect\Data\database\ktech.sqlite` (prevents data loss if Windows C: drive is formatted during OS reinstallation).
* **Fallback Path:** `%APPDATA%\ktech-service-management\database\ktech.sqlite` (if no D: drive exists).
* **Environment Override:** Set `KTECH_DB_PATH` in environment variables for testing or custom paths.

### 4.3 Directory Hierarchy Under `D:\K-Connect\Data\`
* `database/` $\rightarrow$ `ktech.sqlite`, `ktech.sqlite-wal`, `ktech.sqlite-shm`
* `logs/` $\rightarrow$ `ktech-YYYY-MM-DD.log`, `error-YYYY-MM-DD.log`
* `storage/photos/` $\rightarrow$ Intake condition photos (`IMG-XXXX.jpg`)
* `storage/attachments/` $\rightarrow$ PDF schematics, diagnostic reports
* `storage/generated_pdfs/` $\rightarrow$ Saved GST invoices and quotation estimates
* `backups/auto/` $\rightarrow$ Daily automated snapshots (`ktech_backup_auto_YYYY-MM-DD.sqlite`)
* `backups/manual/` $\rightarrow$ User-initiated backups
* `backups/pre_restore/` $\rightarrow$ Safety snapshots created immediately before restoring a backup
* `exports/diagnostics/` $\rightarrow$ Compressed 1-click diagnostic bundles (`ktech-diagnostics-*.zip`)

---

### 4.4 Complete 46-Table Data Dictionary

#### Group 1: Core System, Authentication & Audit (5 Tables)

##### Table 1: `roles`
* **Purpose:** Defines Role-Based Access Control (RBAC) tiers.
* **Columns:**
  * `id` (`TEXT`, PK): e.g., `'ROLE_OWNER'`, `'ROLE_MANAGER'`, `'ROLE_TECHNICIAN'`, `'ROLE_RECEPTIONIST'`.
  * `name` (`TEXT`, UNIQUE, NOT NULL): Display name (e.g. `'Shop Owner'`, `'Senior Technician'`).
  * `description` (`TEXT`): Role responsibilities.

##### Table 2: `permissions`
* **Purpose:** Granular system capabilities.
* **Columns:**
  * `id` (`TEXT`, PK): e.g., `'PERM_BILLING_CREATE'`, `'PERM_JOBS_DELETE'`.
  * `code` (`TEXT`, UNIQUE, NOT NULL): Short permission code.
  * `module` (`TEXT`, NOT NULL): Domain module (`'JOBS'`, `'BILLING'`, `'INVENTORY'`, `'SETTINGS'`).
  * `description` (`TEXT`): Human-readable permission explanation.

##### Table 3: `role_permissions`
* **Purpose:** Many-to-many relationship mapping permissions to roles.
* **Columns:**
  * `id` (`TEXT`, PK): Unique association ID.
  * `role_id` (`TEXT`, FK $\rightarrow$ `roles.id`, ON DELETE CASCADE).
  * `permission_id` (`TEXT`, FK $\rightarrow$ `permissions.id`, ON DELETE CASCADE).

##### Table 4: `users`
* **Purpose:** Staff members, technicians, and system operators.
* **Columns:**
  * `id` (`TEXT`, PK): `USR-XXXXX`.
  * `username` (`TEXT`, UNIQUE, NOT NULL): Login username.
  * `password_hash` (`TEXT`, NOT NULL): Salted `scrypt` cryptographic hash.
  * `pin_code` (`TEXT`): 4-digit quick-switch PIN for technician benches.
  * `full_name` (`TEXT`, NOT NULL): Full staff name.
  * `role_id` (`TEXT`, FK $\rightarrow$ `roles.id`, NOT NULL).
  * `phone` (`TEXT`): Staff contact number.
  * `is_active` (`INTEGER`, NOT NULL, DEFAULT `1`): Active flag.
  * `commission_pct` (`REAL`, NOT NULL, DEFAULT `0.0`): Repair commission percentage.
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).
  * `updated_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 5: `audit_logs`
* **Purpose:** Immutable tamper-evident audit trail of all system events.
* **Columns:**
  * `id` (`TEXT`, PK): `AUD-TIMESTAMP-RANDOM`.
  * `user_id` (`TEXT`, FK $\rightarrow$ `users.id`, NULLABLE for system actions).
  * `action` (`TEXT`, NOT NULL): Action identifier (e.g. `'JOB_CREATED'`, `'INVOICE_VOIDED'`).
  * `entity_type` (`TEXT`, NOT NULL): Entity affected (`'SERVICE_JOB'`, `'INVOICE'`, `'USER'`).
  * `entity_id` (`TEXT`, NOT NULL): ID of the affected entity.
  * `before_state` (`TEXT`): JSON string of previous state before modification.
  * `after_state` (`TEXT`): JSON string of new state after modification.
  * `ip_address` (`TEXT`): Machine IP or hostname identifier.
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

---

#### Group 2: System Configuration & Security Licensing (3 Tables)

##### Table 6: `settings`
* **Purpose:** Global application configurations, shop profile, and dynamic limits.
* **Columns:**
  * `key` (`TEXT`, PK): Configuration key (e.g., `'shop.name'`, `'license.max_workstations'`).
  * `value` (`TEXT`, NOT NULL): Configuration value.
  * `category` (`TEXT`, DEFAULT `'GENERAL'`): `'SHOP'`, `'TAX'`, `'WHATSAPP'`, `'SECURITY'`.
  * `is_encrypted` (`INTEGER`, DEFAULT `0`): `1` if the value is AES-256-GCM encrypted on disk.
  * `updated_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 7: `backups`
* **Purpose:** Registry of all automated and manual SQLite database snapshots.
* **Columns:**
  * `id` (`TEXT`, PK): `BAK-TIMESTAMP`.
  * `backup_name` (`TEXT`, NOT NULL): Snapshot filename.
  * `file_path` (`TEXT`, NOT NULL): Absolute disk path.
  * `file_size_bytes` (`INTEGER`, DEFAULT `0`): File size in bytes.
  * `backup_type` (`TEXT`, NOT NULL): `'AUTO'`, `'MANUAL'`, `'PRE_RESTORE'`.
  * `status` (`TEXT`, DEFAULT `'COMPLETED'`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 8: `licensed_workstations`
* **Purpose:** Workstation node registry enforcing the 4-computer seat restriction.
* **Columns:**
  * `id` (`TEXT`, PK): Node registration ID.
  * `machine_id` (`TEXT`, UNIQUE, NOT NULL): Hardware fingerprint (e.g., `MCH-3F265FBE62C4`).
  * `hostname` (`TEXT`, NOT NULL): Computer network name (e.g., `TECH-BENCH-1`).
  * `platform` (`TEXT`, NOT NULL): OS platform (`win32`).
  * `registered_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).
  * `last_active_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).
  * `is_active` (`INTEGER`, DEFAULT `1`): `1` = Authorized seat, `0` = Deactivated.
  * `ip_address` (`TEXT`): Local IPv4 address.

---

#### Group 3: CRM & Equipment Management (4 Tables)

##### Table 9: `customers`
* **Purpose:** Customer directory and business accounts.
* **Columns:**
  * `id` (`TEXT`, PK): `CUST-XXXXX`.
  * `customer_code` (`TEXT`, UNIQUE, NOT NULL): Auto-generated code (e.g. `CUST-1001`).
  * `full_name` (`TEXT`, NOT NULL): Customer name.
  * `primary_phone` (`TEXT`, NOT NULL): 10-digit primary mobile number.
  * `secondary_phone` (`TEXT`): Alternate contact number.
  * `email` (`TEXT`): Email address.
  * `gstin` (`TEXT`): 15-character Indian GSTIN for B2B accounts.
  * `customer_type` (`TEXT`, DEFAULT `'INDIVIDUAL'`): `'INDIVIDUAL'`, `'CORPORATE'`, `'DEALER'`.
  * `notes` (`TEXT`): Customer preferences and VIP flags.
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).
  * `updated_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 10: `customer_addresses`
* **Purpose:** Multi-address support for delivery and GST tax jurisdiction.
* **Columns:**
  * `id` (`TEXT`, PK): `ADDR-XXXXX`.
  * `customer_id` (`TEXT`, FK $\rightarrow$ `customers.id`, ON DELETE CASCADE).
  * `address_line1` (`TEXT`, NOT NULL): Street address.
  * `address_line2` (`TEXT`): Area / locality.
  * `landmark` (`TEXT`): Nearby landmark.
  * `city` (`TEXT`, DEFAULT `'Coimbatore'`).
  * `state` (`TEXT`, DEFAULT `'Tamil Nadu'`).
  * `pincode` (`TEXT`): 6-digit postal code.
  * `is_default` (`INTEGER`, DEFAULT `1`).

##### Table 11: `devices`
* **Purpose:** Customer hardware registry across 18 equipment categories.
* **Columns:**
  * `id` (`TEXT`, PK): `DEV-XXXXX`.
  * `customer_id` (`TEXT`, FK $\rightarrow$ `customers.id`, ON DELETE CASCADE).
  * `equipment_type` (`TEXT`, NOT NULL): One of 18 types (`'LAPTOP'`, `'MACBOOK'`, `'DESKTOP'`, etc.).
  * `brand` (`TEXT`, NOT NULL): Manufacturer (e.g. `'Dell'`, `'Apple'`, `'Lenovo'`).
  * `model_name` (`TEXT`, NOT NULL): Model name/number (e.g. `'ThinkPad T14 Gen 3'`).
  * `serial_number` (`TEXT`): Unique hardware serial or IMEI.
  * `color_finish` (`TEXT`): Physical color and finish.
  * `encrypted_security_passcode` (`TEXT`): AES-256-GCM encrypted device passcode/PIN.
  * `specs_summary` (`TEXT`): JSON summary of hardware specs (CPU, RAM, Storage, GPU).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 12: `device_photos`
* **Purpose:** Pre-service intake condition photos and post-repair proof.
* **Columns:**
  * `id` (`TEXT`, PK): `PHOTO-XXXXX`.
  * `device_id` (`TEXT`, FK $\rightarrow$ `devices.id`, ON DELETE CASCADE).
  * `job_id` (`TEXT`): Associated service job ID.
  * `photo_type` (`TEXT`, DEFAULT `'INTAKE_CONDITION'`): `'INTAKE_CONDITION'`, `'SCRATCH_PROOF'`, `'COMPLETED_REPAIR'`.
  * `file_path` (`TEXT`, NOT NULL): Relative path in `storage/photos/`.
  * `caption` (`TEXT`): Annotation (e.g. `'Crack on top right bezel'`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

---

#### Group 4: Service Jobs & Technical Diagnostics (11 Tables)

##### Table 13: `service_jobs`
* **Purpose:** Core service ticket tracking customer device repair lifecycle.
* **Columns:**
  * `id` (`TEXT`, PK): `JOB-XXXXX`.
  * `job_number` (`TEXT`, UNIQUE, NOT NULL): Sequential ticket ID (e.g. `KT-2026-0001`).
  * `customer_id` (`TEXT`, FK $\rightarrow$ `customers.id`, NOT NULL).
  * `device_id` (`TEXT`, FK $\rightarrow$ `devices.id`, NOT NULL).
  * `service_category` (`TEXT`, NOT NULL): `'CHIP_LEVEL_REPAIR'`, `'SCREEN_REPLACEMENT'`, `'OS_INSTALL'`, `'DATA_RECOVERY'`.
  * `current_status` (`TEXT`, DEFAULT `'RECEIVED'`): One of 13 state machine statuses.
  * `priority` (`TEXT`, DEFAULT `'NORMAL'`): `'LOW'`, `'NORMAL'`, `'HIGH'`, `'CRITICAL_URGENT'`.
  * `assigned_technician_id` (`TEXT`, FK $\rightarrow$ `users.id`): Assigned technician.
  * `reported_issue` (`TEXT`, NOT NULL): Customer's description of fault.
  * `accessories_received` (`TEXT`): Charger, power cord, bag, wireless dongle, stylus.
  * `physical_condition_notes` (`TEXT`): Dents, scratches, missing screws.
  * `estimated_cost` (`REAL`, DEFAULT `0.0`): Initial estimate.
  * `advance_deposit` (`REAL`, DEFAULT `0.0`): Upfront advance payment collected.
  * `promised_delivery_date` (`TEXT`): Promised completion date.
  * `actual_delivery_date` (`TEXT`): Timestamp delivered to customer.
  * `is_warranty_job` (`INTEGER`, DEFAULT `0`): `1` if this is a free re-repair warranty claim.
  * `parent_warranty_id` (`TEXT`): Link to warranty claim if applicable.
  * `created_by` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).
  * `updated_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 14: `job_status_history`
* **Purpose:** Audit log of every state transition during a job's lifecycle.
* **Columns:**
  * `id` (`TEXT`, PK): `JSH-XXXXX`.
  * `job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `previous_status` (`TEXT`): Status before change.
  * `new_status` (`TEXT`, NOT NULL): Status after change.
  * `changed_by` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `reason_or_notes` (`TEXT`): Reason for transition.
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 15: `job_inspections`
* **Purpose:** Bench intake inspection metrics.
* **Columns:**
  * `id` (`TEXT`, PK): `INSP-XXXXX`.
  * `job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `inspected_by` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `power_status` (`TEXT`, DEFAULT `'NORMAL_POWER'`): `'NO_POWER'`, `'POWER_NO_DISPLAY'`, `'NORMAL_POWER'`.
  * `display_status` (`TEXT`): Lines, flickering, dead pixels, backlight fault.
  * `motherboard_status` (`TEXT`): Corrosion, liquid spill, burnt ICs.
  * `body_condition` (`TEXT`): Hinge broken, casing cracked.
  * `water_damage_detected` (`INTEGER`, DEFAULT `0`).
  * `short_circuit_detected` (`INTEGER`, DEFAULT `0`).
  * `inspection_notes` (`TEXT`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 16: `job_diagnosis`
* **Purpose:** Detailed root cause analysis by chip-level technician.
* **Columns:**
  * `id` (`TEXT`, PK): `DIAG-XXXXX`.
  * `job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `technician_id` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `root_cause_analysis` (`TEXT`, NOT NULL): Technical root cause (e.g. `'Short on 3.3V power rail'`).
  * `voltage_rails_checked` (`TEXT`): JSON of voltage measurements (`VIN`, `+3VALW`, `+5VALW`, `+1.05V`, `VCORE`).
  * `faulty_components_identified` (`TEXT`): Specific ICs/MOSFETs identified (e.g., `'PU401 (SY8286BRAC)'`).
  * `recommended_action` (`TEXT`): Recommended repair action.
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 17: `job_services`
* **Purpose:** Labor services performed on a job (e.g., BGA Reballing, BIOS Flashing).
* **Columns:**
  * `id` (`TEXT`, PK): `JS-XXXXX`.
  * `job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `service_name` (`TEXT`, NOT NULL): Name of service.
  * `sac_code` (`TEXT`): 6-digit SAC Code for GST (e.g. `998713` for IT repair).
  * `labor_charge` (`REAL`, DEFAULT `0.0`).
  * `discount` (`REAL`, DEFAULT `0.0`).
  * `tax_rate` (`REAL`, DEFAULT `18.0`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 18: `job_parts`
* **Purpose:** Replacement parts installed during a repair.
* **Columns:**
  * `id` (`TEXT`, PK): `JP-XXXXX`.
  * `job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `inventory_item_id` (`TEXT`): FK to inventory item if deducted from stock.
  * `part_name` (`TEXT`, NOT NULL): e.g., `'15.6" FHD 30-Pin Matte IPS Display'`.
  * `serial_number` (`TEXT`): Part serial number.
  * `quantity` (`INTEGER`, DEFAULT `1`).
  * `unit_cost_price` (`REAL`, DEFAULT `0.0`): Cost price for profit calculation.
  * `unit_selling_price` (`REAL`, DEFAULT `0.0`): Selling price charged to customer.
  * `hsn_code` (`TEXT`): 8-digit HSN code (e.g. `84733020` for laptop screens).
  * `tax_rate` (`REAL`, DEFAULT `18.0`).
  * `warranty_months` (`INTEGER`, DEFAULT `0`): Part warranty period.
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 19: `job_repair_activities`
* **Purpose:** Log of technician bench time and actions.
* **Columns:**
  * `id` (`TEXT`, PK): `JRA-XXXXX`.
  * `job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `technician_id` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `activity_title` (`TEXT`, NOT NULL): e.g., `'Replaced PU401 PWM Controller'`.
  * `description` (`TEXT`): Detailed action summary.
  * `time_spent_minutes` (`INTEGER`, DEFAULT `0`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 20: `job_notes`
* **Purpose:** Internal technician notes and customer communications.
* **Columns:**
  * `id` (`TEXT`, PK): `NOTE-XXXXX`.
  * `job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `user_id` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `note_type` (`TEXT`, DEFAULT `'INTERNAL'`): `'INTERNAL'`, `'CUSTOMER_CALL'`, `'WORKAROUND'`.
  * `content` (`TEXT`, NOT NULL).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 21: `job_attachments`
* **Purpose:** Schematics, boardviews, customer approval signatures.
* **Columns:**
  * `id` (`TEXT`, PK): `ATT-XXXXX`.
  * `job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `file_name` (`TEXT`, NOT NULL).
  * `file_path` (`TEXT`, NOT NULL): Relative path in `storage/attachments/`.
  * `file_type` (`TEXT`).
  * `file_size_bytes` (`INTEGER`, DEFAULT `0`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 22: `job_checklists`
* **Purpose:** Mandatory QA test checklist items.
* **Columns:**
  * `id` (`TEXT`, PK): `CHK-XXXXX`.
  * `job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `checklist_item_name` (`TEXT`, NOT NULL): e.g., `'Keyboard All Keys Working'`, `'WiFi 5GHz Connected'`.
  * `is_checked` (`INTEGER`, DEFAULT `0`).
  * `checked_by` (`TEXT`, FK $\rightarrow$ `users.id`).
  * `checked_at` (`TEXT`).

##### Table 23: `job_tests`
* **Purpose:** Burn-in stress test results (FurMark, Prime95, MemTest86).
* **Columns:**
  * `id` (`TEXT`, PK): `TEST-XXXXX`.
  * `job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `tested_by` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `test_type` (`TEXT`, NOT NULL): `'GPU_STRESS'`, `'CPU_THERMAL'`, `'MEMTEST'`, `'BATTERY_CYCLE'`.
  * `result` (`TEXT`, DEFAULT `'PASSED'`): `'PASSED'`, `'FAILED'`, `'WARNING'`.
  * `notes` (`TEXT`): Peak temperatures, battery health percentage.
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

---

#### Group 5: Quotations, Invoicing & GST Billing (6 Tables)

##### Table 24: `quotations`
* **Purpose:** Pre-repair cost estimates sent to customer for approval.
* **Columns:**
  * `id` (`TEXT`, PK): `QUOT-XXXXX`.
  * `quotation_number` (`TEXT`, UNIQUE, NOT NULL): e.g. `QT-2026-0001`.
  * `job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `parts_subtotal` (`REAL`, DEFAULT `0.0`).
  * `labor_subtotal` (`REAL`, DEFAULT `0.0`).
  * `discount_amount` (`REAL`, DEFAULT `0.0`).
  * `tax_amount` (`REAL`, DEFAULT `0.0`).
  * `total_amount` (`REAL`, DEFAULT `0.0`).
  * `status` (`TEXT`, DEFAULT `'PENDING'`): `'PENDING'`, `'APPROVED'`, `'REJECTED'`, `'EXPIRED'`.
  * `validity_days` (`INTEGER`, DEFAULT `7`).
  * `created_by` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 25: `quotation_items`
* **Purpose:** Line items on quotation.
* **Columns:**
  * `id` (`TEXT`, PK): `QI-XXXXX`.
  * `quotation_id` (`TEXT`, FK $\rightarrow$ `quotations.id`, ON DELETE CASCADE).
  * `item_type` (`TEXT`, NOT NULL): `'PART'`, `'LABOR'`.
  * `inventory_item_id` (`TEXT`).
  * `description` (`TEXT`, NOT NULL).
  * `quantity` (`INTEGER`, DEFAULT `1`).
  * `unit_price` (`REAL`, DEFAULT `0.0`).
  * `tax_rate` (`REAL`, DEFAULT `18.0`).
  * `total_price` (`REAL`, DEFAULT `0.0`).

##### Table 26: `quotation_approvals`
* **Purpose:** Proof of customer approval before ordering expensive parts.
* **Columns:**
  * `id` (`TEXT`, PK): `QA-XXXXX`.
  * `quotation_id` (`TEXT`, FK $\rightarrow$ `quotations.id`, ON DELETE CASCADE).
  * `job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `approved_amount` (`REAL`, NOT NULL).
  * `approval_status` (`TEXT`, NOT NULL): `'APPROVED'`, `'REJECTED'`, `'PARTIALLY_APPROVED'`.
  * `approval_method` (`TEXT`, NOT NULL): `'WHATSAPP'`, `'PHONE_CALL'`, `'IN_PERSON'`, `'EMAIL'`.
  * `customer_contact_used` (`TEXT`, NOT NULL): Phone number or email used.
  * `recorded_by_user_id` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `approval_timestamp` (`TEXT`, NOT NULL).
  * `notes` (`TEXT`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 27: `invoices`
* **Purpose:** Official GST Tax Invoices and Delivery Bills.
* **Columns:**
  * `id` (`TEXT`, PK): `INV-XXXXX`.
  * `invoice_number` (`TEXT`, UNIQUE, NOT NULL): Sequential GST invoice ID (e.g. `INV-2026-0001`).
  * `invoice_type` (`TEXT`, DEFAULT `'SERVICE_REPAIR'`): `'SERVICE_REPAIR'`, `'RETAIL_SALE'`, `'PC_BUILD'`.
  * `customer_id` (`TEXT`, FK $\rightarrow$ `customers.id`, NOT NULL).
  * `service_job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`).
  * `is_gst_invoice` (`INTEGER`, DEFAULT `1`).
  * `customer_gstin` (`TEXT`): Customer GSTIN for B2B input tax credit.
  * `subtotal_parts` (`REAL`, DEFAULT `0.0`).
  * `subtotal_labor` (`REAL`, DEFAULT `0.0`).
  * `discount_amount` (`REAL`, DEFAULT `0.0`).
  * `cgst_amount` (`REAL`, DEFAULT `0.0`): Central GST (9%).
  * `sgst_amount` (`REAL`, DEFAULT `0.0`): State GST (9%).
  * `igst_amount` (`REAL`, DEFAULT `0.0`): Integrated GST (18% for out-of-state).
  * `total_amount` (`REAL`, DEFAULT `0.0`).
  * `advance_adjusted` (`REAL`, DEFAULT `0.0`): Amount deducted from advance deposit.
  * `amount_paid` (`REAL`, DEFAULT `0.0`).
  * `balance_due` (`REAL`, DEFAULT `0.0`).
  * `payment_status` (`TEXT`, DEFAULT `'UNPAID'`): `'UNPAID'`, `'PARTIALLY_PAID'`, `'PAID'`.
  * `is_void` (`INTEGER`, DEFAULT `0`): `1` if invoice was cancelled/voided.
  * `void_reason` (`TEXT`).
  * `created_by` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 28: `invoice_items`
* **Purpose:** Itemized invoice charges with HSN/SAC codes.
* **Columns:**
  * `id` (`TEXT`, PK): `II-XXXXX`.
  * `invoice_id` (`TEXT`, FK $\rightarrow$ `invoices.id`, ON DELETE CASCADE).
  * `item_type` (`TEXT`, NOT NULL): `'PART'`, `'LABOR'`, `'PRODUCT'`.
  * `item_ref_id` (`TEXT`): ID reference.
  * `description` (`TEXT`, NOT NULL).
  * `hsn_sac_code` (`TEXT`): GST classification code.
  * `quantity` (`INTEGER`, DEFAULT `1`).
  * `unit_price` (`REAL`, DEFAULT `0.0`).
  * `discount` (`REAL`, DEFAULT `0.0`).
  * `tax_rate` (`REAL`, DEFAULT `18.0`).
  * `tax_amount` (`REAL`, DEFAULT `0.0`).
  * `total_amount` (`REAL`, DEFAULT `0.0`).

##### Table 29: `payments`
* **Purpose:** Payment transaction receipts and multi-split allocations.
* **Columns:**
  * `id` (`TEXT`, PK): `PAY-XXXXX`.
  * `receipt_number` (`TEXT`, UNIQUE, NOT NULL): e.g. `REC-2026-0001`.
  * `invoice_id` (`TEXT`, FK $\rightarrow$ `invoices.id`).
  * `service_job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`).
  * `customer_id` (`TEXT`, FK $\rightarrow$ `customers.id`, NOT NULL).
  * `payment_type` (`TEXT`, NOT NULL): `'ADVANCE_DEPOSIT'`, `'FINAL_SETTLEMENT'`, `'PARTIAL_PAYMENT'`.
  * `payment_mode` (`TEXT`, NOT NULL): `'CASH'`, `'UPI_QR'`, `'CARD'`, `'BANK_TRANSFER'`, `'CHEQUE'`.
  * `transaction_reference` (`TEXT`): UPI UTR or card authorization reference.
  * `amount` (`REAL`, NOT NULL).
  * `received_by` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `payment_date` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

---

#### Group 6: Inventory & Salvage Harvesting Engine (7 Tables)

##### Table 30: `inventory_categories`
* **Purpose:** Categories for parts and products (Screens, Motherboard ICs, RAM, SSDs).
* **Columns:**
  * `id` (`TEXT`, PK): `CAT-XXXXX`.
  * `name` (`TEXT`, UNIQUE, NOT NULL).
  * `code` (`TEXT`, UNIQUE, NOT NULL).
  * `description` (`TEXT`).

##### Table 31: `inventory_locations`
* **Purpose:** Physical warehouse bins and shelf locations (e.g. `Bin A3 - Motherboard ICs`).
* **Columns:**
  * `id` (`TEXT`, PK): `LOC-XXXXX`.
  * `name` (`TEXT`, UNIQUE, NOT NULL).
  * `description` (`TEXT`).

##### Table 32: `suppliers`
* **Purpose:** Component vendors, wholesale distributors, and importers.
* **Columns:**
  * `id` (`TEXT`, PK): `SUP-XXXXX`.
  * `company_name` (`TEXT`, NOT NULL).
  * `contact_person` (`TEXT`).
  * `phone` (`TEXT`).
  * `email` (`TEXT`).
  * `gstin` (`TEXT`).
  * `address` (`TEXT`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 33: `salvage_devices`
* **Purpose:** Scrapped/unrepairable donor laptops dismantled for working spare parts.
* **Columns:**
  * `id` (`TEXT`, PK): `SALV-XXXXX`.
  * `salvage_code` (`TEXT`, UNIQUE, NOT NULL): e.g. `SALV-2026-001`.
  * `original_service_job_id` (`TEXT`): Source repair ticket if scrapped by customer.
  * `equipment_type` (`TEXT`, NOT NULL).
  * `brand` (`TEXT`, NOT NULL).
  * `model_name` (`TEXT`, NOT NULL).
  * `serial_number` (`TEXT`).
  * `acquisition_type` (`TEXT`, DEFAULT `'CUSTOMER_SCRAP_DONATION'`): `'CUSTOMER_SCRAP_DONATION'`, `'PURCHASED_AS_SCRAP'`.
  * `acquisition_cost` (`REAL`, DEFAULT `0.0`).
  * `dismantled_by` (`TEXT`, FK $\rightarrow$ `users.id`).
  * `notes` (`TEXT`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 34: `inventory_items`
* **Purpose:** Master SKU directory of parts and accessories in stock.
* **Columns:**
  * `id` (`TEXT`, PK): `ITEM-XXXXX`.
  * `sku` (`TEXT`, UNIQUE, NOT NULL): SKU Code (e.g. `RAM-DDR4-8GB-3200`).
  * `name` (`TEXT`, NOT NULL): Full product name.
  * `category_id` (`TEXT`, FK $\rightarrow$ `inventory_categories.id`, NOT NULL).
  * `item_type` (`TEXT`, NOT NULL): `'NEW_PART'`, `'REFURBISHED_PART'`, `'HARVESTED_SALVAGE'`, `'ACCESSORY'`.
  * `serial_number` (`TEXT`).
  * `cost_price` (`REAL`, DEFAULT `0.0`).
  * `selling_price` (`REAL`, DEFAULT `0.0`).
  * `hsn_code` (`TEXT`).
  * `tax_rate` (`REAL`, DEFAULT `18.0`).
  * `quantity_on_hand` (`INTEGER`, DEFAULT `0`).
  * `min_reorder_level` (`INTEGER`, DEFAULT `2`).
  * `location_id` (`TEXT`, FK $\rightarrow$ `inventory_locations.id`).
  * `supplier_id` (`TEXT`, FK $\rightarrow$ `suppliers.id`).
  * `salvage_source_id` (`TEXT`, FK $\rightarrow$ `salvage_devices.id`): Lineage link to donor machine.
  * `warranty_months` (`INTEGER`, DEFAULT `0`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 35: `salvage_parts`
* **Purpose:** Individual components extracted from a salvage parent unit.
* **Columns:**
  * `id` (`TEXT`, PK): `SP-XXXXX`.
  * `salvage_device_id` (`TEXT`, FK $\rightarrow$ `salvage_devices.id`, ON DELETE CASCADE).
  * `inventory_item_id` (`TEXT`, FK $\rightarrow$ `inventory_items.id`): Link to stock item.
  * `part_name` (`TEXT`, NOT NULL): e.g., `'Original 65W DC Jack Cable'`.
  * `serial_number` (`TEXT`).
  * `tested_condition` (`TEXT`, DEFAULT `'GRADE_A_WORKING'`): `'GRADE_A_WORKING'`, `'GRADE_B_WORKING'`, `'UNTESTED'`.
  * `estimated_value` (`REAL`, DEFAULT `0.0`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 36: `inventory_transactions`
* **Purpose:** Immutable stock ledger tracking every addition, deduction, and transfer.
* **Columns:**
  * `id` (`TEXT`, PK): `TXN-XXXXX`.
  * `item_id` (`TEXT`, FK $\rightarrow$ `inventory_items.id`, NOT NULL).
  * `transaction_type` (`TEXT`, NOT NULL): `'PURCHASE_INTAKE'`, `'JOB_CONSUMPTION'`, `'SALVAGE_HARVEST'`, `'MANUAL_ADJUSTMENT'`.
  * `quantity_delta` (`INTEGER`, NOT NULL): e.g. `+5` or `-1`.
  * `balance_after` (`INTEGER`, NOT NULL): Quantity remaining after transaction.
  * `reference_type` (`TEXT`, NOT NULL): `'SERVICE_JOB'`, `'SUPPLIER_PURCHASE'`, `'SALVAGE_UNIT'`.
  * `reference_id` (`TEXT`): Associated entity ID.
  * `notes` (`TEXT`).
  * `created_by` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

---

#### Group 7: Specialized Modules, PC Builds & Retail Sales (7 Tables)

##### Table 37: `data_recovery_jobs`
* **Purpose:** Clean-room storage media recovery jobs with physical diagnostics.
* **Columns:**
  * `id` (`TEXT`, PK): `DRJ-XXXXX`.
  * `service_job_id` (`TEXT`, UNIQUE, NOT NULL, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `storage_type` (`TEXT`, NOT NULL): `'HDD_3.5'`, `'HDD_2.5'`, `'NVME_SSD'`, `'SATA_SSD'`, `'USB_FLASH'`, `'SD_CARD'`, `'RAID_ARRAY'`.
  * `capacity_gb` (`INTEGER`, NOT NULL): Drive size in GB (e.g. `1000` for 1TB).
  * `file_system` (`TEXT`): `'NTFS'`, `'FAT32'`, `'EXT4'`, `'APFS'`, `'RAW'`.
  * `detection_status` (`TEXT`, NOT NULL): `'DETECTED_NORMAL'`, `'DETECTED_WRONG_CAPACITY'`, `'CLICKING_NOISE'`, `'DEAD_NO_SPIN'`.
  * `damage_type` (`TEXT`, NOT NULL): `'LOGICAL'`, `'FIRMWARE_CORRUPTION'`, `'HEAD_CRASH'`, `'PCB_BURNT'`, `'BAD_SECTORS'`.
  * `recovery_complexity` (`TEXT`, NOT NULL): `'TIER_1_LOGICAL'`, `'TIER_2_PCB_SWAP'`, `'TIER_3_CLEAN_ROOM_HEAD_SWAP'`.
  * `target_data_description` (`TEXT`): High-priority directories (e.g. `'Tally Data, Photos'`).
  * `destination_media_type` (`TEXT`, DEFAULT `'CUSTOMER_PROVIDED_DRIVE'`).
  * `destination_media_details` (`TEXT`): Destination drive serial/model.
  * `recovered_size_gb` (`REAL`, DEFAULT `0.0`).
  * `recovery_outcome` (`TEXT`, DEFAULT `'ASSESSMENT'`): `'ASSESSMENT'`, `'IN_PROGRESS'`, `'SUCCESSFUL'`, `'PARTIAL'`, `'UNRECOVERABLE'`.
  * `disclaimer_acknowledged` (`INTEGER`, DEFAULT `1`): Liability waiver signature.
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 38: `products`
* **Purpose:** Refurbished and retail computer hardware units.
* **Columns:**
  * `id` (`TEXT`, PK): `PROD-XXXXX`.
  * `product_code` (`TEXT`, UNIQUE, NOT NULL): e.g. `REF-LAP-001`.
  * `product_type` (`TEXT`, NOT NULL): `'REFURBISHED_LAPTOP'`, `'REFURBISHED_DESKTOP'`, `'BRAND_NEW_LAPTOP'`.
  * `brand` (`TEXT`, NOT NULL).
  * `model_name` (`TEXT`, NOT NULL).
  * `serial_number` (`TEXT`).
  * `specs` (`TEXT`, NOT NULL): JSON summary (i5-11th Gen, 16GB RAM, 512GB SSD).
  * `cosmetic_grade` (`TEXT`, DEFAULT `'GRADE_A'`): `'GRADE_A'`, `'GRADE_B'`, `'GRADE_C'`.
  * `acquisition_cost` (`REAL`, DEFAULT `0.0`).
  * `refurb_cost_spent` (`REAL`, DEFAULT `0.0`): Money spent on new battery/RAM.
  * `selling_price` (`REAL`, NOT NULL).
  * `status` (`TEXT`, DEFAULT `'IN_STOCK'`): `'IN_STOCK'`, `'RESERVED'`, `'SOLD'`.
  * `warranty_months` (`INTEGER`, DEFAULT `3`).
  * `sold_to_customer_id` (`TEXT`, FK $\rightarrow$ `customers.id`).
  * `sales_invoice_id` (`TEXT`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 39: `product_sales`
* **Purpose:** Retail and refurbished hardware sales transactions.
* **Columns:**
  * `id` (`TEXT`, PK): `SALE-XXXXX`.
  * `sale_number` (`TEXT`, UNIQUE, NOT NULL): e.g. `SALE-2026-0001`.
  * `customer_id` (`TEXT`, FK $\rightarrow$ `customers.id`, NOT NULL).
  * `invoice_id` (`TEXT`).
  * `total_amount` (`REAL`, DEFAULT `0.0`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 40: `product_sale_items`
* **Purpose:** Line items on a retail sale.
* **Columns:**
  * `id` (`TEXT`, PK): `PSI-XXXXX`.
  * `sale_id` (`TEXT`, FK $\rightarrow$ `product_sales.id`, ON DELETE CASCADE).
  * `product_id` (`TEXT`, FK $\rightarrow`products.id`).
  * `inventory_item_id` (`TEXT`, FK $\rightarrow`inventory_items.id`).
  * `unit_price` (`REAL`, DEFAULT `0.0`).
  * `quantity` (`INTEGER`, DEFAULT `1`).
  * `tax_rate` (`REAL`, DEFAULT `18.0`).
  * `total_amount` (`REAL`, DEFAULT `0.0`).

##### Table 41: `pc_builds`
* **Purpose:** Custom PC build configurations, wattage estimation, and quotations.
* **Columns:**
  * `id` (`TEXT`, PK): `PCB-XXXXX`.
  * `build_number` (`TEXT`, UNIQUE, NOT NULL): e.g. `PCB-2026-0001`.
  * `customer_id` (`TEXT`, FK $\rightarrow$ `customers.id`, NOT NULL).
  * `build_name` (`TEXT`, NOT NULL): e.g. `'4K Video Editing & Gaming Rig'`.
  * `target_budget` (`REAL`, DEFAULT `0.0`).
  * `parts_cost` (`REAL`, DEFAULT `0.0`): Wholesale cost of parts.
  * `parts_price` (`REAL`, DEFAULT `0.0`): Selling price of parts.
  * `assembly_labor_fee` (`REAL`, DEFAULT `0.0`): Assembly and cable management fee.
  * `discount_amount` (`REAL`, DEFAULT `0.0`).
  * `tax_amount` (`REAL`, DEFAULT `0.0`).
  * `final_quoted_price` (`REAL`, DEFAULT `0.0`).
  * `status` (`TEXT`, DEFAULT `'DRAFT'`): `'DRAFT'`, `'QUOTED'`, `'APPROVED'`, `'ASSEMBLING'`, `'COMPLETED'`.
  * `created_by` (`TEXT`, FK $\rightarrow$ `users.id`, NOT NULL).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 42: `pc_build_items`
* **Purpose:** Component slot mapping for a custom PC (Processor, Motherboard, GPU, Cooler, PSU).
* **Columns:**
  * `id` (`TEXT`, PK): `PCBI-XXXXX`.
  * `pc_build_id` (`TEXT`, FK $\rightarrow$ `pc_builds.id`, ON DELETE CASCADE).
  * `component_slot` (`TEXT`, NOT NULL): `'CPU'`, `'MOTHERBOARD'`, `'RAM'`, `'GPU'`, `'STORAGE'`, `'PSU'`, `'CABINET'`, `'COOLER'`.
  * `inventory_item_id` (`TEXT`, FK $\rightarrow$ `inventory_items.id`).
  * `item_name` (`TEXT`, NOT NULL): e.g. `'AMD Ryzen 7 7800X3D'`.
  * `specs` (`TEXT`): TDP 120W, AM5 Socket, 8C/16T.
  * `quantity` (`INTEGER`, DEFAULT `1`).
  * `unit_cost` (`REAL`, DEFAULT `0.0`).
  * `unit_price` (`REAL`, DEFAULT `0.0`).
  * `tax_rate` (`REAL`, DEFAULT `18.0`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 43: `warranties`
* **Purpose:** Warranty certificate tracking for repairs and products sold.
* **Columns:**
  * `id` (`TEXT`, PK): `WAR-XXXXX`.
  * `warranty_code` (`TEXT`, UNIQUE, NOT NULL): e.g. `WAR-2026-0001`.
  * `customer_id` (`TEXT`, FK $\rightarrow$ `customers.id`, NOT NULL).
  * `device_id` (`TEXT`, FK $\rightarrow$ `devices.id`).
  * `original_job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`).
  * `original_invoice_id` (`TEXT`, FK $\rightarrow$ `invoices.id`).
  * `product_id` (`TEXT`, FK $\rightarrow$ `products.id`).
  * `warranty_type` (`TEXT`, NOT NULL): `'REPAIR_SERVICE'`, `'REPLACED_PART'`, `'REFURBISHED_DEVICE'`.
  * `start_date` (`TEXT`, NOT NULL).
  * `expiry_date` (`TEXT`, NOT NULL).
  * `duration_days` (`INTEGER`, NOT NULL): e.g. `90` days.
  * `covered_scope` (`TEXT`, NOT NULL): What is covered (e.g. `'Display no backlight / lines'`).
  * `terms_and_exclusions` (`TEXT`): Exclusions (e.g. `'Physical damage or liquid spill voids warranty'`).
  * `status` (`TEXT`, DEFAULT `'ACTIVE'`): `'ACTIVE'`, `'EXPIRED'`, `'CLAIMED'`, `'VOIDED'`.
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

##### Table 44: `warranty_jobs`
* **Purpose:** Claims raised against an existing active warranty certificate.
* **Columns:**
  * `id` (`TEXT`, PK): `WJ-XXXXX`.
  * `warranty_id` (`TEXT`, FK $\rightarrow$ `warranties.id`, ON DELETE CASCADE).
  * `warranty_claim_job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`, ON DELETE CASCADE).
  * `claim_date` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).
  * `claim_issue_reported` (`TEXT`, NOT NULL).
  * `resolution_type` (`TEXT`, DEFAULT `'FREE_RE_REPAIR'`): `'FREE_RE_REPAIR'`, `'REPLACEMENT'`, `'REFUND'`.
  * `notes` (`TEXT`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

---

#### Group 8: Automated Customer Communication (2 Tables)

##### Table 45: `communication_templates`
* **Purpose:** WhatsApp message templates with dynamic variable substitutions.
* **Columns:**
  * `id` (`TEXT`, PK): `TMPL-XXXXX`.
  * `template_key` (`TEXT`, UNIQUE, NOT NULL): e.g. `'JOB_INTAKE_ADMISSION'`, `'JOB_ESTIMATE_READY'`, `'JOB_READY_FOR_DELIVERY'`.
  * `name` (`TEXT`, NOT NULL).
  * `template_body` (`TEXT`, NOT NULL): Message text with placeholders `{customer_name}`, `{job_number}`, `{device_model}`, `{estimate_amount}`.
  * `variables_json` (`TEXT`): JSON array of accepted variables.
  * `is_active` (`INTEGER`, DEFAULT `1`).

##### Table 46: `communication_messages`
* **Purpose:** Outbound WhatsApp message queue and delivery status log.
* **Columns:**
  * `id` (`TEXT`, PK): `MSG-XXXXX`.
  * `customer_id` (`TEXT`, FK $\rightarrow$ `customers.id`).
  * `service_job_id` (`TEXT`, FK $\rightarrow$ `service_jobs.id`).
  * `channel` (`TEXT`, DEFAULT `'WHATSAPP_API'`): `'WHATSAPP_API'`, `'WHATSAPP_DEEP_LINK'`, `'SMS'`.
  * `recipient_phone` (`TEXT`, NOT NULL): Recipient phone with country code (e.g. `919876543210`).
  * `template_key` (`TEXT`, NOT NULL).
  * `message_payload` (`TEXT`, NOT NULL): Rendered text content.
  * `dispatch_status` (`TEXT`, DEFAULT `'PENDING'`): `'PENDING'`, `'SENT'`, `'FAILED'`, `'DELIVERED'`.
  * `retry_count` (`INTEGER`, DEFAULT `0`).
  * `last_error` (`TEXT`): Error string if API returned an error.
  * `sent_at` (`TEXT`).
  * `created_at` (`TEXT`, DEFAULT `CURRENT_TIMESTAMP`).

---

## 5. Complete IPC API Reference & Controller Catalog

Every backend endpoint in K-Connect is exposed via modular IPC controllers in `electron/ipc/`. Below is the complete catalog:

### 5.1 Authentication Controller (`electron/ipc/authIpc.ts`)
* `auth:login` $\rightarrow$ Accepts `{ username, password }`. Verifies salted scrypt hash. Returns `{ user, token }`.
* `auth:quick-pin-login` $\rightarrow$ Accepts `{ pinCode }`. Switches active technician bench session instantly.
* `auth:get-users` $\rightarrow$ Returns list of staff members with assigned roles.
* `auth:create-user` $\rightarrow$ Creates a new staff account with hashed password and PIN.
* `auth:update-user` $\rightarrow$ Updates staff profile, role, or active status.
* `auth:change-password` $\rightarrow$ Updates user password with new cryptographic salt.

### 5.2 Service Jobs Controller (`electron/ipc/jobIpc.ts`)
* `jobs:list` $\rightarrow$ Returns filtered service jobs with customer, device, and technician details.
* `jobs:get-by-id` $\rightarrow$ Returns complete 360-degree job dossier (status history, diagnosis, parts, inspections, notes, checklists, tests).
* `jobs:create` $\rightarrow$ Creates new job ticket (`KT-YYYY-XXXX`), links device, and records intake photos.
* `jobs:update-status` $\rightarrow$ Validates 13-stage state machine transition, records `job_status_history`, and queues WhatsApp alert.
* `jobs:save-inspection` $\rightarrow$ Records physical/motherboard bench inspection.
* `jobs:save-diagnosis` $\rightarrow$ Records chip-level root cause and voltage rail measurements.
* `jobs:add-part` $\rightarrow$ Adds part to job, deducts inventory stock if item is from stock, records cost vs selling price.
* `jobs:remove-part` $\rightarrow$ Removes part and restores inventory quantity.
* `jobs:add-service` $\rightarrow$ Adds labor service charge with SAC code.
* `jobs:save-checklist` $\rightarrow$ Updates QA testing checklist items.
* `jobs:record-test` $\rightarrow$ Records FurMark/MemTest86 stress test results.

### 5.3 Billing & Invoicing Controller (`electron/ipc/billingIpc.ts`)
* `billing:get-invoices` $\rightarrow$ Returns invoices with filter by payment status (`PAID`, `UNPAID`, `PARTIALLY_PAID`).
* `billing:get-invoice-by-id` $\rightarrow$ Returns complete invoice line items, tax breakdown, and payments.
* `billing:generate-from-job` $\rightarrow$ Automatically aggregates all job parts and labor into a GST Tax Invoice.
* `billing:record-payment` $\rightarrow$ Records multi-split payment (Cash, UPI, Card), updates balance due, generates receipt.
* `billing:void-invoice` $\rightarrow$ Voids an invoice, records audit log, and reverses accounting balances.
* `billing:create-quotation` $\rightarrow$ Creates estimate quote with 7-day validity.
* `billing:approve-quotation` $\rightarrow$ Records customer approval method (WhatsApp/Call) and unlocks `IN_PROGRESS` status.
* `billing:print-thermal-slip` $\rightarrow$ Generates 80mm/58mm intake admission slip or payment receipt.
* `billing:export-pdf` $\rightarrow$ Compiles A4 GST Tax Invoice PDF with shop branding, HSN/SAC breakdown, and bank QR.

### 5.4 Inventory & Salvage Controller (`electron/ipc/inventoryIpc.ts`)
* `inventory:get-items` $\rightarrow$ Returns inventory list with low stock warnings.
* `inventory:create-item` $\rightarrow$ Creates new SKU with cost price, selling price, and reorder threshold.
* `inventory:adjust-stock` $\rightarrow$ Manually increments/decrements stock with audit transaction record.
* `inventory:get-salvage-units` $\rightarrow$ Lists scrapped laptops available for component harvesting.
* `inventory:dismantle-salvage` $\rightarrow$ Harvests working parts (RAM, Screen, Motherboard ICs) into inventory with lineage tracking to parent unit.

### 5.5 System, Diagnostics & Licensing Controller (`electron/ipc/systemIpc.ts`)
* `system:get-diagnostics` $\rightarrow$ Returns live CPU, RAM, disk space, and SQLite integrity metrics.
* `system:get-logs` $\rightarrow$ Reads active 7-day daily rolling logs with severity filter.
* `system:export-diagnostics` $\rightarrow$ Generates 1-click compressed `ktech-diagnostics-[timestamp].zip` PKZIP archive.
* `system:generate-support-challenge` $\rightarrow$ Generates client-side 15-minute challenge code (`KT-XXXX-XXXX`).
* `system:activate-support-session` $\rightarrow$ Verifies HMAC authorization token and grants 2-hour elevated session.
* `system:execute-support-maintenance` $\rightarrow$ Executes `REINDEX`, `VACUUM`, `INTEGRITY_FIX`, or `CLEAN_ORPHANS`.
* `system:get-licensed-workstations` $\rightarrow$ Returns list of registered shop computers and seat limit (4/4).
* `system:deactivate-workstation` $\rightarrow$ Deactivates retired PC to free up a seat.
* `system:update-seat-limit` $\rightarrow$ Updates maximum allowable seats in `settings` table.
* `system:create-backup` $\rightarrow$ Creates an instant standalone SQLite snapshot.
* `system:restore-backup` $\rightarrow$ Takes a safety pre-restore backup and restores database from snapshot.

### 5.6 Vault Controller (`electron/ipc/vaultIpc.ts`)
* `vault:decrypt-passcode` $\rightarrow$ Accepts encrypted string and decrypts client device passcode in memory using hardware-bound AES-256-GCM.

### 5.7 Customer CRM Controller (`electron/ipc/customerIpc.ts`)
* `customers:search` $\rightarrow$ Instant lookup by phone number, customer code, name, or GSTIN.
* `customers:create` $\rightarrow$ Creates customer profile with automatic duplicate phone check.
* `customers:get-history` $\rightarrow$ Returns full history of all devices, past repair jobs, and invoices for a customer.

### 5.8 Specialized Controller (`electron/ipc/specializedIpc.ts`)
* `specialized:data-recovery:create` $\rightarrow$ Creates clean-room data recovery job with drive damage diagnostics.
* `specialized:pc-builder:save` $\rightarrow$ Saves custom PC build with real-time wattage TDP and margin calculations.
* `specialized:refurbished:list` $\rightarrow$ Lists refurbished hardware units in stock with cosmetic grading.

---

## 6. Security, Cryptography, Licensing & Anti-Reverse Engineering

### 6.1 Dynamic Hardware-Bound Cryptography (`electron/security/crypto.ts`)
* **Algorithm:** Authenticated AES-256-GCM (Galois/Counter Mode).
* **Zero Hardcoded Secrets:** Encryption keys are not stored statically in JavaScript. Instead, the 256-bit encryption key is derived dynamically at runtime using `scrypt` combining:
  1. CPU Model and Architecture (`os.cpus()[0].model`, `os.arch()`).
  2. Network Interface MAC Address.
  3. Hostname and Platform ID (`os.hostname()`, `os.platform()`).
  4. Cryptographic salt unique to the application instance.
* **Tamper Evidence:** AES-256-GCM produces an authentication tag for every encrypted payload. If an adversary attempts to modify the encrypted passcode bytes in the database, decryption immediately fails.

### 6.2 Workstation Node Licensing & 4-Seat Restriction (`electron/security/workstationLicense.ts`)
* **Business Requirement:** Prevent a single shop license from being copied to an unlimited number of unauthorized computers. Default limit is **4 active computers**.
* **Hardware Fingerprinting:** Computes a unique `machineId` (e.g. `MCH-3F265FBE62C4`) derived from the physical CPU, motherboard serial, and MAC address.
* **Auto-Registration:**
  1. On application boot, K-Connect checks if the current `machineId` exists in `licensed_workstations`.
  2. If already registered and `is_active = 1`, boot proceeds normally.
  3. If not registered, it counts active registered workstations in the shop database.
  4. If count $< 4$, it automatically registers the new computer and proceeds.
  5. If count $\ge 4$, execution is blocked and the **Seat Limit Exceeded Lockout Screen** is displayed.
* **Seat Decommissioning:** The shop owner can retire an old computer with 1 click in **Shop Settings $\rightarrow$ Security & Remote Support $\rightarrow$ Deactivate Node**, instantly freeing up the seat for a new computer.

### 6.3 In-App Outbound Request Firewall (`electron/security/firewall.ts`)
* Intercepts all outbound network calls using Electron's `session.defaultSession.webRequest.onBeforeRequest`.
* **Strict Whitelist:**
  * WhatsApp Official Cloud APIs: `graph.facebook.com`, `api.whatsapp.com`, `web.whatsapp.com`, `wa.me`
  * GitHub Auto-Update Server: `github.com`, `api.github.com`, `objects.githubusercontent.com`
  * Local Loopback: `127.0.0.1`, `localhost`
* **Action:** Blocks all unauthorized external domain calls, prevents telemetry leaks, and logs blocked attempts with `[FIREWALL_BLOCKED]` audit tags.

### 6.4 Anti-Reverse Engineering & Binary Hardening
* **ASAR Packaging:** Production JavaScript is packaged into an encrypted ASAR archive with source maps (`*.map`) completely stripped.
* **DevTools Lockdown:** Chrome Developer Tools (`Ctrl+Shift+I`, `F12`) are permanently disabled in production builds.
* **Navigation Sandboxing:** `will-navigate` and `new-window` event listeners intercept any attempt to navigate away from the application shell.

---

## 7. Enterprise Logging, Audit Trails & Diagnostics Packager

### 7.1 Unified Logging Framework (`electron/utils/logger.ts`)
* **Log Levels:** `DEBUG`, `INFO`, `WARN`, `ERROR`, `AUDIT`, `EXCEPTION`.
* **Daily Rolling Files:**
  * Standard Log: `D:\K-Connect\Data\logs\ktech-YYYY-MM-DD.log`
  * High-Severity Filter: `D:\K-Connect\Data\logs\error-YYYY-MM-DD.log`
* **Automated 7-Day Retention Worker:** Scans the logs directory on startup and every 24 hours. Automatically deletes log files older than 7 days to prevent hard disk consumption.
* **PII Redaction Engine:** High-performance regular expression scrubber automatically masks sensitive customer credentials before writing to disk:
  * Passwords: `password="[REDACTED]"`
  * PIN Codes: `pin="[REDACTED]"`
  * Auth Tokens: `token="[REDACTED]"`
  * Credit Card Numbers: Masks 16-digit card numbers to `4111-XXXX-XXXX-1111`.
* **Global Crash Trap:** Hooks into `process.on('uncaughtException')` and `process.on('unhandledRejection')` to guarantee that unexpected runtime errors are written to `error-YYYY-MM-DD.log` before any crash.

### 7.2 1-Click Diagnostics Packager (`electron/utils/diagnosticPackager.ts`)
* Compiles a complete diagnostic archive: `ktech-diagnostics-[timestamp].zip`.
* **Package Contents:**
  1. `logs/ktech-YYYY-MM-DD.log` — Full 7-day activity trace.
  2. `logs/error-YYYY-MM-DD.log` — Filtered error log with stack traces.
  3. `diagnostics/database_integrity_report.json` — Results of `PRAGMA integrity_check`, `PRAGMA quick_check`, and exact row counts for all 46 tables.
  4. `diagnostics/system_environment.json` — Windows OS build, RAM usage, CPU load, and Node.js runtime metrics.
* **Pure Node.js Implementation:** Built using native `node:zlib` with standard PKZIP local file headers (`0x04034b50`) and Central Directory records (`0x02014b50`), requiring zero third-party zip libraries.

---

## 8. Zero-Cost Remote Support Engineer Portal & Protocol

When a customer running K-Connect in a remote shop encounters an issue or requires administrative maintenance, use the **Consent-Based Cryptographic Challenge-Response Protocol**.

### 8.1 Why This Model? (Why Not a Hardcoded Backdoor?)
* **Dangerous Backdoor Vulnerability:** A hardcoded superadmin password embedded in the app could be extracted by any hacker using a decompiler, giving them full access to every customer shop. Furthermore, antivirus software (Windows Defender, Kaspersky) flags hardcoded backdoors as Remote Access Trojans (RATs).
* **The Solution:** A client-initiated, ephemeral HMAC-SHA256 challenge. It gives elevated support access ONLY when the shop owner explicitly requests it, and automatically expires after 2 hours.

### 8.2 The Free Offline Support Tool Location
👉 File Path: [`tools/ktech-support-generator.html`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/tools/ktech-support-generator.html)  
*(This is a standalone single-file HTML5/JS tool utilizing the browser's native Web Crypto API. It runs 100% offline on any smartphone or laptop with zero hosting costs).*

### 8.3 Handshake Protocol Flow
```
┌────────────────────────────────────────┐                ┌─────────────────────────────────────────┐
│        CLIENT COMPUTER (IN SHOP)       │                │      KTECH SUPPORT ENGINEER (REMOTE)    │
└───────────────────┬────────────────────┘                └────────────────────┬────────────────────┘
                    │                                                          │
   1. Customer clicks "Generate Support Code"                                  │
      App generates 15-minute challenge:                                       │
      e.g., "KT-3F26-89A4B2"                                                   │
                    │                                                          │
                    │─── 2. Customer calls/messages Challenge Code ───────────►│
                    │                                                          │
                    │                                             3. Engineer opens tools/ktech-support-generator.html
                    │                                                Pastes "KT-3F26-89A4B2"
                    │                                                Tool computes HMAC-SHA256 token:
                    │                                                "SUP-A7E1-89F0-C12B"
                    │                                                          │
                    │◄── 4. Engineer provides Unlock Token to Customer ────────│
                    │                                                          │
   5. Customer enters "SUP-A7E1-89F0-C12B"                                     │
      App verifies token using crypto.timingSafeEqual()                        │
      Activates 2-Hour Elevated Support Session!                               │
```

### 8.4 Elevated Support Capabilities
* **`REINDEX`:** Rebuilds all database B-tree indices.
* **`VACUUM`:** Defragments and reclaims SQLite disk space.
* **`INTEGRITY_FIX`:** Runs full database integrity self-check.
* **`CLEAN_ORPHANS`:** Deletes orphaned relational records across foreign key constraints.
* **Raw Audit Inspection:** View raw audit trails and system telemetry.

---

## 9. Step-by-Step Remote Debugging & Bug Troubleshooting Field Guide

When a customer or shop manager reports a bug or malfunction on a remote PC, follow this exact standard operating procedure (SOP):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    REMOTE BUG TRIAGE & RESOLUTION SOP                        │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
               ┌───────────────────────┴───────────────────────┐
               ▼                                               ▼
    [App Opens Successfully]                        [App Crashes On Boot]
               │                                               │
   Ask user to open Settings $\rightarrow$          Ask user to open File Explorer $\rightarrow$
   Diagnostics & 7-Day Logs $\rightarrow$           Navigate to D:\K-Connect\Data\logs\ $\rightarrow$
   Click "Download Diagnostic Zip"                  Zip the folder and send it
               │                                               │
               └───────────────────────┬───────────────────────┘
                                       ▼
                     [EXTRACT & INSPECT DIAGNOSTIC BUNDLE]
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
  Inspect error-*.log       Inspect database_integrity  Inspect system_environment
  Search for: [EXCEPTION]   Check: "integrity": "ok"    Check: Available RAM & OS
  Identify stack trace      Check: table row counts     Verify Node.js version
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       ▼
                       [LOCAL REPRODUCTION IN DEV MODE]
  1. Copy client's ktech.sqlite to local ./data/ktech.sqlite
  2. Run: npm.cmd run dev
  3. Reproduce exact user flow and inspect console stack trace
                                       │
                                       ▼
                          [CODE FIX & VERIFICATION]
  1. Apply fix in TypeScript code
  2. Run automated test suite: npm.cmd test (Ensure 62/62 tests pass)
  3. Verify lint: npm.cmd run lint
                                       │
                                       ▼
                          [DEPLOYMENT TO CLIENT]
  Option A: Publish GitHub Release (Client app auto-updates on restart)
  Option B: Send updated executable directly or run SQL patch via Support Portal
```

---

## 10. Emergency Incident Playbook (Top 15 Real-World Production Scenarios & Exact Fixes)

### Incident 1: "Workstation Seat Limit Exceeded (4/4)" Lockout Screen
* **Symptom:** App refuses to launch on a new PC and displays the Seat Limit Exceeded screen.
* **Cause:** The shop installed K-Connect on a 5th PC, or replaced an old PC with a new one.
* **Resolution (30 Seconds):**
  1. On any of the 4 authorized PCs in the shop, open **Shop Settings $\rightarrow$ Security & Remote Support**.
  2. Under **Workstation Node Licensing**, locate the name of the retired/old PC.
  3. Click **"Deactivate Node"**.
  4. On the new PC, click **"Retry Verification"**. It will immediately register and launch.
* **Direct Database Override (if accessing disk directly):**
  ```sql
  UPDATE licensed_workstations SET is_active = 0 WHERE hostname = 'OLD-PC-NAME';
  ```

---

### Incident 2: Shop Owner / Admin Forgot Password or PIN
* **Symptom:** Staff cannot log in or switch user accounts.
* **Resolution via Cryptographic Support Mode:**
  1. On the login screen, have the user click **"Emergency Support Unlock"** $\rightarrow$ Generate Challenge Code.
  2. Generate the unlock token using [`tools/ktech-support-generator.html`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/tools/ktech-support-generator.html).
  3. Enter token to activate Support Session $\rightarrow$ Click **"Reset Owner Password"** $\rightarrow$ Sets temporary password `ktech@admin`.
* **Direct Database Fix:**
  ```sql
  -- Reset PIN to '1234' for Owner role
  UPDATE users SET pin_code = '1234' WHERE role_id = 'ROLE_OWNER';
  ```

---

### Incident 3: SQLite Database Corrupted / Sudden Power Cut
* **Symptom:** Error `SQLITE_CORRUPT: database disk image is malformed`.
* **Cause:** Sudden power loss during heavy disk write while UPS was drained.
* **Resolution (1-Click Recovery from Pre-Restore Snapshot):**
  1. Close K-Connect completely.
  2. Open directory: `D:\K-Connect\Data\backups\auto\`.
  3. Identify the latest daily snapshot (e.g. `ktech_backup_auto_2026-10-07.sqlite`).
  4. Rename current damaged `D:\K-Connect\Data\database\ktech.sqlite` to `ktech.sqlite.corrupt`.
  5. Copy the backup file to `D:\K-Connect\Data\database\ktech.sqlite`.
  6. Launch K-Connect. All data is restored up to the backup timestamp.

---

### Incident 4: Database Locked / `SQLITE_BUSY` Error
* **Symptom:** Error `SQLITE_BUSY: database is locked`.
* **Cause:** A hung background process or external backup software locked `ktech.sqlite`.
* **Resolution:**
  1. Open Windows Task Manager (`Ctrl+Shift+Esc`).
  2. Search for any orphaned `ktech-service-management.exe` or `electron.exe` background processes.
  3. Click **End Task**.
  4. In `D:\K-Connect\Data\database\`, check if `ktech.sqlite-wal` or `ktech.sqlite-shm` are locked.
  5. Relaunch K-Connect. The LibSQL client will automatically replay the WAL journal and recover cleanly.

---

### Incident 5: WhatsApp Messages Failing to Dispatch
* **Symptom:** Outbound WhatsApp status updates show `FAILED` status.
* **Cause:** Meta Permanent Access Token expired or internet is disconnected.
* **Resolution:**
  1. Open **WhatsApp Center** inside the app.
  2. If using Cloud API, verify the Meta System User Access Token in **Shop Settings $\rightarrow$ Communication**.
  3. If the shop has no internet, K-Connect automatically generates the 1-click `wa.me/91XXXXXXXXXX?text=...` deep link so technicians can send the update via WhatsApp Desktop or Web without requiring API credits.

---

### Incident 6: Thermal POS Printer Not Printing or Printing Garbage Text
* **Symptom:** 80mm/58mm thermal receipt printer outputs blank paper or garbled symbols.
* **Resolution:**
  1. Open **Shop Settings $\rightarrow$ Hardware & Printers**.
  2. Ensure the correct Windows Printer Driver is selected (e.g. `POS-80`, `TVS RP-3200`).
  3. Switch between **"Standard Windows GDI / Print Dialog"** and **"Direct Thermal Canvas"** mode.
  4. Verify paper width setting is set to `80mm` or `58mm` matching the physical roll.

---

### Incident 7: Global Search (Ctrl+K) Not Finding Customer or Serial Number
* **Symptom:** Typing a phone number or serial number returns "No results found".
* **Resolution:**
  1. Activate Elevated Support Session via [`tools/ktech-support-generator.html`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/tools/ktech-support-generator.html).
  2. Click **"Rebuild Database Indexes (REINDEX)"**.
  3. SQLite rebuilds all B-trees across `customers`, `devices`, and `service_jobs`.

---

### Incident 8: App Won't Launch (Crashes Immediately on Startup)
* **Symptom:** Double-clicking application icon results in a brief flash and immediate exit.
* **Resolution:**
  1. Check Windows Event Viewer $\rightarrow$ Windows Logs $\rightarrow$ Application for crash events.
  2. Inspect `D:\K-Connect\Data\logs\error-*.log`.
  3. Common cause: Corrupt local preference or port conflict. Delete `%APPDATA%\ktech-service-management\Preferences` and restart.

---

### Incident 9: Moving Entire Shop Installation to a New Computer in 2 Minutes
* **Procedure for 100% Data Migration:**
  1. On old PC: Copy the entire folder `D:\K-Connect\Data\` to a USB thumb drive.
  2. On new PC: Install `K-Connect Setup 1.1.0.exe`.
  3. Paste the `Data` folder onto the new PC's `D:\K-Connect\` directory.
  4. Launch K-Connect on the new PC. It will automatically detect the database and load all historical jobs, customers, invoices, and photos!

---

### Incident 10: Auto-Update Download Stuck or Failed
* **Symptom:** Update notification displays but download progress stays at 0%.
* **Resolution:**
  1. Check firewall rules: Ensure outbound connections to `github.com` and `objects.githubusercontent.com` are not blocked by corporate antivirus.
  2. Download the latest installer `K-Connect Setup X.X.X.exe` directly from the GitHub Releases page and run it. The NSIS installer will upgrade the binary in-place without touching `ktech.sqlite`.

---

### Incident 11: Inventory Stock Count Out of Sync / Negative Stock
* **Symptom:** Item shows negative quantity on hand.
* **Resolution:**
  1. Open **Inventory Workspace $\rightarrow$ Select Item $\rightarrow$ Transaction History**.
  2. Audit all intake vs consumption records.
  3. Click **"Adjust Stock"** to enter the physical stock count. The system will create an audited `MANUAL_ADJUSTMENT` transaction entry.

---

### Incident 12: GST Tax Calculation Discrepancy on Invoices
* **Symptom:** CGST + SGST does not match expected tax amount.
* **Resolution:**
  1. Open **Shop Settings $\rightarrow$ Tax & GST**.
  2. Verify Shop State is set to `'Tamil Nadu'` (State Code: `33`).
  3. If customer is in Tamil Nadu, the system applies **Intra-State GST** (CGST 9% + SGST 9%).
  4. If customer address state is outside Tamil Nadu (e.g. Kerala / Karnataka), the system automatically switches to **Inter-State IGST** (18%).

---

### Incident 13: Data Recovery Job Missing Intake Photos or Passcode
* **Symptom:** Technician cannot access drive due to missing BitLocker / BIOS password.
* **Resolution:**
  1. Open **Service Job Detail $\rightarrow$ Device Profile $\rightarrow$ Passcode Vault**.
  2. Click **"Reveal Passcode"** (Requires technician PIN).
  3. The system decrypts the passcode stored in `devices.encrypted_security_passcode`.

---

### Incident 14: Accidental Invoicing / Voiding & Audit Reversal
* **Symptom:** Invoice was created with incorrect items or customer.
* **Resolution:**
  1. Open **Billing Workspace $\rightarrow$ Select Invoice $\rightarrow$ Click "Void Invoice"**.
  2. Enter the mandatory reason for voiding (e.g. `'Incorrect customer selected by reception'`).
  3. The system marks `is_void = 1`, records a permanent entry in `audit_logs`, and restores any deducted parts back to inventory.

---

### Incident 15: Hardware Upgrade on Client PC Changing the Machine ID Fingerprint
* **Symptom:** PC motherboard or network card was replaced, causing the app to treat it as a 5th machine.
* **Resolution:**
  1. On any active PC, open **Shop Settings $\rightarrow$ Security & Remote Support**.
  2. Deactivate the old entry associated with the previous motherboard.
  3. Relaunch K-Connect on the upgraded PC. It will claim the freed seat.

---

## 11. Developer Setup, Testing, Building & Auto-Update Release Pipeline

### 11.1 Local Development Setup (Prerequisites)
* **Node.js:** Node.js `20.x` or `22.x` (LTS recommended).
* **Package Manager:** `npm` (v10+).
* **OS:** Windows 10/11, macOS, or Linux.

```bash
# 1. Clone the repository
git clone https://github.com/vigneshms2302/ktech-service-management.git
cd ktech-service-management

# 2. Install all dependencies
npm.cmd install

# 3. Start local development environment with HMR
npm.cmd run dev
```

### 11.2 Running the Automated Test Suite
K-Connect features **62 automated unit and integration tests** covering all subsystems:

```bash
# Run full Vitest test suite
npm.cmd test

# Run tests in watch mode
npm.cmd test -- --watch

# Verify TypeScript type safety across entire codebase
npm.cmd run lint
```

### 11.3 Packaging Production Executables
```bash
# Compile and build Windows NSIS Installer & Portable executable
npm.cmd run build

# Build outputs generated in ./release/:
#  - K-Connect Setup 1.1.0.exe (Production NSIS Windows Installer)
#  - K-Connect-1.1.0-win.exe (Standalone zero-install Portable Executable)
#  - latest.yml (Metadata manifest for differential auto-updater)
```

### 11.4 Publishing an Auto-Update Release (GitHub Releases)
1. Bump the version in `package.json` (e.g., `"version": "1.2.0"`).
2. Commit and push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Release v1.2.0: Feature updates and optimizations"
   git push origin main
   ```
3. Run `npm.cmd run build` to generate the new release binaries in `./release/`.
4. Create a new Release on GitHub tagged `v1.2.0` and upload:
   * `K-Connect Setup 1.2.0.exe`
   * `latest.yml`
5. All client installations will automatically detect the new version on startup, download the update in the background, and prompt the user to restart!

---

## 12. Frontend Architecture, UI Design System & Component Tree

### 12.1 Styling & Design System Principles
* **High-Density Typography:** Engineered for high-speed counter operations (12px–14px crisp fonts, high-contrast borders).
* **Glassmorphism & Micro-Interactions:** Subtle backdrop blurs (`backdrop-filter: blur(12px)`), smooth CSS transitions (`transition: all 0.2s ease`), and state-aware badge colors.
* **Zero Generic Ad-Hoc CSS:** All components consume design tokens defined in `src/index.css` (e.g. `--color-bg`, `--color-card`, `--color-accent`, `--color-success`, `--color-warning`, `--color-danger`).
* **Keyboard Hotkeys:**
  * `Ctrl + K`: Global Omnisearch across Jobs, Customers, Invoices, and Hardware Serials.
  * `Ctrl + N`: Instant New Service Job Intake Wizard.
  * `Escape`: Close active modal / Return to dashboard.

### 12.2 Global State Architecture
* **`AuthContext.tsx`:** Manages the authenticated user, active session token, RBAC permissions check (`hasPermission('PERM_CODE')`), and 4-digit PIN quick-switch.
* **`ShopContext.tsx`:** Holds shop profile metadata (Shop Name, Address, Phone, GSTIN, Default Tax Rates, Currency Symbol `₹`).

---

## 13. AI Agent Prompting & Autonomous Task Execution Guidelines

When an AI Coding Agent is assigned a bug or feature in this repository, it MUST adhere to the following strict operating principles:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  MANDATORY AI AGENT EXECUTION CONSTRAINTS                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ 1. NEVER hardcode secrets, passwords, or backdoors.                          │
│ 2. NEVER replace SQLite with MySQL (Preserve offline-first architecture).   │
│ 3. NEVER bypass contextBridge in Electron IPC communication.                 │
│ 4. ALWAYS preserve PII redaction regex in logging utilities.                 │
│ 5. ALWAYS write tests for new features and verify: npm.cmd test (62/62 pass).│
│ 6. ALWAYS verify TypeScript linting with 0 errors: npm.cmd run lint.        │
│ 7. ALWAYS format file paths as clickable markdown links: [file](file:///...).│
└──────────────────────────────────────────────────────────────────────────────┘
```

### 13.1 AI Task Execution Template
```markdown
### 1. Root Cause Analysis
- Problem description & error signature from error-YYYY-MM-DD.log.
- Affected file(s) and specific lines of code.

### 2. Implementation Strategy
- Step 1: Database schema or IPC handler updates.
- Step 2: Preload bridge and TypeScript interface extensions.
- Step 3: React component UI updates.

### 3. Verification & Safety Checks
- Ran `npm.cmd test` -> All 62+ tests passing.
- Ran `npm.cmd run lint` -> 0 TypeScript compilation errors.
- Verified offline compatibility and PII masking.
```

---

## Master Architecture Summary Table

| Subsystem | Master Component | Primary File Location |
| :--- | :--- | :--- |
| **Electron Main Shell** | Bootstrap & Window Lifecycle | [`electron/main.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/electron/main.ts) |
| **Preload Security Bridge** | Context Bridge & Sandboxing | [`electron/preload.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/electron/preload.ts) |
| **Embedded Database** | SQLite DDL, WAL & Migrations | [`electron/db/database.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/electron/db/database.ts) |
| **Cryptography** | AES-256-GCM & scrypt Hashing | [`electron/security/crypto.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/electron/security/crypto.ts) |
| **Workstation Licensing** | 4-Computer Seat Engine | [`electron/security/workstationLicense.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/electron/security/workstationLicense.ts) |
| **In-App Firewall** | Request Whitelist Interceptor | [`electron/security/firewall.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/electron/security/firewall.ts) |
| **Support Session** | HMAC Challenge-Response Portal | [`electron/security/supportSession.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/electron/security/supportSession.ts) |
| **Support Tool** | Free Standalone Generator | [`tools/ktech-support-generator.html`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/tools/ktech-support-generator.html) |
| **Unified Logging** | 7-Day Rolling Logger & PII Mask | [`electron/utils/logger.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/electron/utils/logger.ts) |
| **Diagnostics** | 1-Click PKZIP Bundle Packager | [`electron/utils/diagnosticPackager.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/electron/utils/diagnosticPackager.ts) |
| **Job Controller** | 13-Stage Service State Machine | [`electron/ipc/jobIpc.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/electron/ipc/jobIpc.ts) |
| **Billing Controller** | Invoices, GST Engine & Thermal Print | [`electron/ipc/billingIpc.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/electron/ipc/billingIpc.ts) |
| **Inventory Controller** | Stock Ledger & Salvage Lineage | [`electron/ipc/inventoryIpc.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/electron/ipc/inventoryIpc.ts) |
| **Automated Test Suite** | 62 Unit & Integration Tests | [`tests/enterprise_system.test.ts`](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/tests/enterprise_system.test.ts) |

---
*End of Master System Bible & Handover Document. This document represents the complete, unabridged architectural record of the K-Connect application.*
