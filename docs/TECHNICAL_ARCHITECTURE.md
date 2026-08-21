# KTech Computers - Technical Architecture Specification

**Architecture Version:** 2.1.0  
**Core Technologies:** Pinned Stable Electron (31.x / compatible) + React 18 + TypeScript + Vite + SQLite + Drizzle ORM (45 Tables)  

---

## 1. System Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                    RENDERER PROCESS                                   |
|  +---------------------------------------------------------------------------------+  |
|  |  React 18 + TypeScript SPA (Vite)                                               |  |
|  |  * Role-Based Workspaces (Owner / Reception / Technician / Accounts)            |  |
|  |  * High-Density KTech Design Tokens (Fast, Minimalist, Keyboard-First)         |  |
|  |  * State Management: Zustand (Client State) + TanStack Query (IPC Cache)       |  |
|  |  * Reusable Branded Print Layouts (A4 Invoices, Slips, Build Sheets, Quotes)    |  |
|  +---------------------------------------------------------------------------------+  |
|                                          |                                            |
|                        window.electronAPI (Typed IPC Bridge)                          |
+------------------------------------------|--------------------------------------------+
                                           | contextIsolation: true, nodeIntegration: false
+------------------------------------------|--------------------------------------------+
|                                    MAIN PROCESS                                       |
|  +---------------------------------------------------------------------------------+  |
|  |  Electron Main Process (Node.js 20+ Runtime)                                    |  |
|  |                                                                                 |  |
|  |  +---------------------------------------------------------------------------+  |  |
|  |  | IPC Controller & Role-Permission Authorization Gateway                    |  |  |
|  |  +---------------------------------------------------------------------------+  |  |
|  |       |                     |                     |                    |        |  |
|  |  +----------+         +-----------+         +-----------+        +-----------+  |  |
|  |  | Database |         | Document  |         | WhatsApp  |        | Backup    |  |  |
|  |  | Service  |         | Engine    |         | Service   |        | Service   |  |  |
|  |  +----------+         +-----------+         +-----------+        +-----------+  |  |
|  |       |                     |                     |                    |        |  |
|  |  * Drizzle ORM        * Chromium            * Cloud API          * SQLite    |  |  |
|  |  * SQLite Engine        Print-to-PDF          Provider             Online    |  |  |
|  |  * WAL Mode + FKs     * ESC/POS             * Deep-Link            Backup    |  |  |
|  |  * Migrations           Thermal Engine        Fallback           * Gzip Snap |  |  |
|  +---------------------------------------------------------------------------------+  |
|                                          |                                            |
|  +---------------------------------------------------------------------------------+  |
|  | Local OS Storage Subsystems (%APPDATA%/ktech-service-management)                |  |
|  |  ├── database/ktech.sqlite     ├── storage/photos/         ├── backups/         |  |
|  |  ├── storage/attachments/      ├── storage/generated_pdfs/ └── config/secrets  |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

---

## 2. Electron Process Model & Security Architecture

### 2.1 Context Isolation & Zero Node API Exposure
- `contextIsolation: true`: The renderer process operates in a strictly isolated JavaScript context.
- `nodeIntegration: false`: Renderer code cannot access Node.js runtime globals (`fs`, `child_process`, `crypto`, `path`).
- `webSecurity: true`: Cross-origin restrictions and local file URL hijacking protections are enforced.
- Secret credentials (WhatsApp API tokens, GST credentials) are encrypted on disk via Electron's native `safeStorage`.

### 2.2 Strongly Typed IPC Gateway (`preload.ts`)
All communication passes through explicit, validated IPC channels:

```typescript
export interface IElectronAPI {
  // Service Jobs & Data Recovery
  jobs: {
    create: (data: CreateJobDTO) => Promise<IPCResponse<ServiceJob>>;
    getById: (id: string) => Promise<IPCResponse<JobDetailsAggregate>>;
    list: (filters: JobFilterParams) => Promise<IPCResponse<PaginatedResult<ServiceJob>>>;
    updateStatus: (data: TransitionStatusDTO) => Promise<IPCResponse<void>>;
    recordDiagnosis: (data: DiagnosisDTO) => Promise<IPCResponse<void>>;
    recordApproval: (data: CustomerApprovalDTO) => Promise<IPCResponse<void>>;
    createDataRecovery: (data: DataRecoveryDTO) => Promise<IPCResponse<DataRecoveryJob>>;
  };
  // Inventory & Salvage
  inventory: {
    list: (filters: InventoryFilterParams) => Promise<IPCResponse<InventoryItem[]>>;
    recordMovement: (data: StockMovementDTO) => Promise<IPCResponse<void>>;
    processSalvage: (data: SalvageDismantleDTO) => Promise<IPCResponse<SalvageResult>>;
  };
  // Refurbished Products & PC Builder
  products: {
    createRefurb: (data: RefurbProductDTO) => Promise<IPCResponse<Product>>;
    createPCBuild: (data: PCBuildConfigDTO) => Promise<IPCResponse<PCBuild>>;
  };
  // Billing & Invoices
  billing: {
    createInvoice: (data: CreateInvoiceDTO) => Promise<IPCResponse<Invoice>>;
    recordPayment: (data: RecordPaymentDTO) => Promise<IPCResponse<Payment>>;
    createWarrantyClaim: (data: WarrantyClaimDTO) => Promise<IPCResponse<ServiceJob>>;
  };
  // WhatsApp Communication
  whatsapp: {
    dispatch: (templateKey: string, params: Record<string, unknown>) => Promise<IPCResponse<CommunicationResult>>;
    getConnectionStatus: () => Promise<IPCResponse<{ configured: boolean; provider: string }>>;
  };
  // Document Printing
  documents: {
    generatePdf: (type: DocumentType, id: string) => Promise<IPCResponse<{ filePath: string }>>;
    printDirect: (type: DocumentType, id: string, printerName?: string) => Promise<IPCResponse<void>>;
  };
  // Backup & Audit
  system: {
    createBackup: (type: 'MANUAL' | 'AUTO', targetPath?: string) => Promise<IPCResponse<BackupRecord>>;
    restoreBackup: (backupPath: string) => Promise<IPCResponse<void>>;
    getAuditLogs: (filters: AuditFilterParams) => Promise<IPCResponse<AuditLog[]>>;
  };
}
```

---

## 3. Database Architecture (SQLite + Drizzle ORM)

### 3.1 Relational Engine & Performance Tuning
SQLite is configured for enterprise local reliability and concurrency:
```sql
PRAGMA journal_mode = WAL;          -- Write-Ahead Logging for non-blocking concurrent reads
PRAGMA synchronous = NORMAL;        -- Balances power-outage durability with write performance
PRAGMA foreign_keys = ON;          -- Enforces cascading and foreign key referential integrity
PRAGMA busy_timeout = 5000;        -- 5000ms busy wait to avoid SQLite lock contention
PRAGMA cache_size = -64000;         -- 64MB in-memory page cache for instant queries
```

### 3.2 Schema Migrations via Drizzle ORM
- Schemas are defined in TypeScript (`electron/db/schema/*.ts`).
- Drizzle Kit manages versioned SQL migration files (`electron/db/migrations/`).
- On app launch, Electron Main automatically verifies and executes pending migrations before initializing the main window.

---

## 4. Local File Storage & OS Directory Hierarchy

All persistent runtime assets are stored in `app.getPath('userData')`:

```
%APPDATA%/ktech-service-management/  (Windows)
~/.config/ktech-service-management/  (Linux)
~/Library/Application Support/ktech-service-management/  (macOS)
├── database/
│   ├── ktech.sqlite                 # SQLite Master Database
│   ├── ktech.sqlite-wal             # WAL Write Journal
│   └── ktech.sqlite-shm             # Shared Memory Index
├── storage/
│   ├── photos/                      # Equipment intake and damage photos
│   ├── attachments/                 # Diagnostic schematics and oscilloscope dumps
│   └── generated_pdfs/              # Cached A4 Invoices, Quotations, Job Slips
├── backups/
│   ├── auto/                        # Automated daily rolling snapshots (30-day retention)
│   ├── manual/                      # User-triggered manual backups (.ktechbak / .sqlite)
│   └── pre_restore/                 # Safety snapshots taken prior to restore
└── config/
    └── secure_secrets.enc           # safeStorage encrypted API credentials
```

---

## 5. Document & PDF Generation Architecture

### 5.1 Local Generation Pipeline
Documents are rendered locally using Electron's native headless Chromium engine:
1. Electron creates an invisible offscreen `BrowserWindow`.
2. The print template is hydrated with relational job, invoice, or quotation data.
3. `webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 } })` generates the binary buffer.
4. Output is saved to `storage/generated_pdfs/` and presented for preview or direct local printer spooling.

### 5.2 Document Catalog:
1. **Admission Slip / Job Card:** Device intake receipt, condition checklist, accessory log, customer declaration.
2. **Estimate / Quotation:** Diagnostic summary, required parts, labor tasks, terms of service.
3. **PC Build Quotation:** Itemized rig specifications, component costs, assembly fee, warranty coverage.
4. **Data Recovery Assessment & Estimate:** Media condition, diagnostic risk disclaimer, data extraction estimate.
5. **GST / Non-GST Tax Invoice:** Itemized parts with HSN/SAC, service labor breakdown, CGST/SGST/IGST breakdown, payment summary, QR code.
6. **Payment Receipt:** Advance deposit or final settlement payment acknowledgment.
7. **Delivery Receipt:** Final equipment handover acknowledgement with customer acceptance signature line.
8. **Warranty Certificate:** Covered components, duration, start/end dates, warranty terms & claim instructions.
9. **Customer Service History Report:** Chronological record of all repairs and purchases.
10. **Business & GST Reports:** Daily collections, sales summaries, and HSN-wise tax reports.
11. **Thermal Slips (80mm/58mm):** Fast POS counter intake tokens and payment slips.

---

## 6. WhatsApp Communication Architecture

### 6.1 Abstracted Service Interface (`IWhatsAppService`)
- Pluggable provider model with two primary implementations:
  1. **Official Cloud / Business API Provider:** Sends structured template messages over HTTPS directly to Meta Graph API.
  2. **Manual Deep-Link Fallback Provider:** Generates formatted `https://wa.me/` URLs for 1-click manual dispatch when offline or unconfigured.
- Non-blocking design: Application workflows never fail or freeze if message dispatch encounters network errors.
- Every message attempt is logged in `communication_messages` with status (`PENDING`, `SENT`, `DELIVERED`, `FAILED`).

---

## 7. Audit Logging & Disaster Recovery Strategy

### 7.1 Immutable Audit Log
Every significant mutation (customer creation, job status change, quotation approval, stock transaction, invoice generation, void action) writes an append-only row to `audit_logs` storing `user_id`, `action`, `entity_type`, `entity_id`, `before_state`, `after_state`, and `timestamp`.

### 7.2 Multi-Tier Backup Engine
- **Automated Daily Backups:** Creates rolling snapshots on startup and daily background triggers (maintains 30 rolling copies).
- **Manual Backups:** 1-Click user export to external USB or network drives.
- **Safety Pre-Restore Snapshot:** Whenever a restore operation is triggered, the engine immediately takes a complete snapshot of the active database into `backups/pre_restore/` before applying the restore.
- **100% Offline Operational Integrity:** Fully functional with zero internet connectivity.
