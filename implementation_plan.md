# KTech Computers Service & Business Management Desktop Application

A full-featured, offline-first desktop application designed for **KTech Computers** to manage computer/laptop repair job cards, customer CRM, spare parts inventory, GST/non-GST billing, technician workflows, and business analytics.

---

## Technical Stack & Architecture

- **Desktop Shell**: Electron with secure IPC bridge (`contextBridge`, `preload.ts`)
- **Frontend Core**: React 18 + TypeScript + Vite
- **Styling & UI**: Modern Vanilla CSS Design System (KTech Slate/Navy + Cyan/Electric Blue accents, Dark/Light theme toggle, responsive data tables, glassmorphic cards, micro-animations)
- **Icons**: Lucide React
- **Data Persistence**: Local SQLite / Structured Local Data Engine with Electron IPC, automated backup, JSON/CSV export and import
- **Print Engine**: Built-in A4 Tax Invoice / Estimate generator & 80mm/58mm Thermal Receipt formatter with direct print support
- **WhatsApp Integration**: Instant formatted message templates with WhatsApp Web / Desktop deep links

```
+-------------------------------------------------------------------------+
|                           KTech Desktop App                             |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                 React 18 + TypeScript UI (Vite)                   |  |
|  |  * Modern KTech Design System (Dark/Light)                        |  |
|  |  * Dashboard & KPIs        * Service Job Cards & Diagnostics      |  |
|  |  * Customer CRM & History  * Spare Parts & Inventory              |  |
|  |  * Billing & Invoices      * Staff / Technician Management        |  |
|  |  * A4 & Thermal Print      * WhatsApp Quick Share                 |  |
|  +-------------------------------------------------------------------+  |
|                                  | IPC Bridge                            |
|  +-------------------------------------------------------------------+  |
|  |                     Electron Main Process                         |  |
|  |  * Window Management       * Local SQLite Database Service        |  |
|  |  * Native File Dialogs     * Backup & JSON/CSV Export Engine      |  |
|  |  * Direct Thermal / A4     * Local Settings & Store               |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## User Review Required

> [!IMPORTANT]
> - The application will be packaged as a standalone desktop app using Electron + Vite + React (TypeScript).
> - All data is stored locally in SQLite with zero cloud dependencies required for full daily offline operations.
> - Pre-loaded with realistic demo data (Job cards across various stages, inventory items, sample invoices, customers, technicians) with a 1-click "Reset / Clear Demo Data" option in Settings.

---

## Core Feature Modules

### 1. 📊 Executive Dashboard & Quick Actions
- **Live KPI Badges**: Active Repairs, Ready for Pickup, Today's Intake, Today's Revenue, Low Stock Alerts, Unassigned Tickets.
- **Global Search Bar**: Instant search across Job Card #, Customer Phone, Serial Number, or Customer Name (`Ctrl+K` shortcut).
- **Quick Action Bar**: `+ New Job Card`, `+ Quick Invoice`, `+ Add Inventory`, `+ Add Customer`.
- **Visual Analytics**: 7-Day Revenue Trend, Repair Status Distribution, Top Device Categories, Technician Workload.
- **Urgent Queue**: Overdue repairs, pending customer quotation approvals, and low stock warnings.

### 2. 🛠️ Service Job Cards & Repair Lifecycle
- **Intake Form**:
  - Customer selection or fast inline creation.
  - Device info: Category (Laptop, Desktop / Custom PC, MacBook, Printer, All-in-One, Peripherals), Brand, Model, Serial Number / Service Tag, Passcode / PIN.
  - Accessory Checklist: Charger / Power Adapter, Power Cord, Bag / Case, USB Dongles, External HDD/Pen Drive, Original Box.
  - Physical Condition Inspection: Scratches, Dents, Cracked Screen/Hinges, Missing Screws, Liquid Damage indicators.
  - Customer Reported Issues & Primary Symptoms.
  - Estimated Delivery Date, Diagnostic Fee / Advance Paid.
- **Repair Status Stages**:
  1. `Received` (New intake)
  2. `Diagnosing` (Under inspection)
  3. `Quotation Pending` (Estimate sent to customer)
  4. `Approved / In Repair` (Customer accepted; technician working)
  5. `Waiting for Parts` (Linked to inventory or supplier order)
  6. `Testing / QC` (Hardware test checklist: Boot, Display, Keyboard, Wi-Fi, Audio, Battery/Charging, Thermal stress)
  7. `Ready for Pickup` (Customer notified)
  8. `Delivered / Closed` (Settled & warranty period assigned)
  9. `Cancelled / Unrepaired` (Reason logged)
- **Diagnostics & Cost Sheet**:
  - Technician notes & diagnosed faults.
  - Spare parts required (auto-deduct from inventory).
  - Service labor charges.
  - Customer quotation generator with one-click WhatsApp estimate share.

### 3. 👥 Customer Management / CRM
- **Customer Directory**: Name, Phone Number, Secondary Phone, Email, Address, GSTIN (for B2B/corporate clients), Customer Notes.
- **Repair & Purchase History**: Tabulated list of all current and historical job cards, devices, invoices, and payments.
- **Customer Insights**: Total lifetime spend, pending balances, device ownership log.
- **Quick Contact**: Direct WhatsApp chat launcher, Call link, SMS copy.

### 4. 📦 Spare Parts & Inventory Management
- **Category System**: RAM, SSD / NVMe / HDD, Laptop Screens / Panels, Keyboards, Batteries, Power Supplies / SMPS, Motherboards & ICs, Cooling Fans / Heatsinks, Cables / Adapters, Thermal Paste & Consumables, Accessories.
- **Item Fields**: Part Name, SKU, Serial Number(s), Category, Cost Price, Selling Price, Minimum Reorder Level, Current Stock, Supplier Name / Contact, Warranty Duration.
- **Stock Movements**:
  - Auto-deduction when assigned to a Job Card / Invoice.
  - Automatic restock if a repair ticket is cancelled.
  - Stock-In / Purchase Entry log.
  - Low stock warning badges & one-click reorder list.

### 5. 🧾 Billing, Invoicing & Payments
- **Invoice Generation**:
  - Convert completed Job Card directly to Invoice or create Quick Over-the-Counter Sale.
  - Itemized lines for Parts (with HSN & Serial Numbers) + Labor / Service Charges.
  - GST / Non-GST toggle: Configurable CGST + SGST (e.g. 9% + 9%) or IGST (18%) with GSTIN and tax breakdown.
  - Advance payment deduction & balance due tracking.
  - Payment modes: Cash, UPI (Dynamic/Static QR code on bill), Card, Bank Transfer, Split Payment.
- **Print & Export Formats**:
  - **A4 / Letter Detailed Tax Invoice**: Professional branded layout with KTech logo, GSTIN, bank/UPI payment details, terms & conditions, warranty declaration, and signature lines.
  - **80mm / 58mm Thermal Receipt**: Fast POS-style intake slip and payment receipt for thermal slip printers.
  - **WhatsApp Sharing**: Formatted text bill summary with payment details and PDF link.

### 6. 🧑‍🔧 Staff & Technician Management
- **Staff Profiles**: Name, Role (`Admin`, `Reception / Front Desk`, `Senior Technician`, `Junior Technician`), Phone, Commission Rate / Incentive %.
- **Technician Dashboard**: View assigned tickets, active repair queue, completed repairs, turnaround time, and labor earnings.
- **Role-Based Access / PIN Protection**: Switch active user or lock sensitive administrative views (Financial reports, system settings, database resets).

### 7. ⚙️ Settings, Customization & Data Management
- **Shop Profile**: Business Name (KTech Computers), Tagline, Address, Phone, Email, GSTIN, UPI ID, Bank Details, Logo upload.
- **Customizable Master Lists**: Manage device categories, common repair issues, accessory checklist items, payment methods.
- **Data Backup & Restore**:
  - 1-Click SQLite Database Backup (.sqlite / .db).
  - Export all data to JSON / CSV (Job Cards, Customers, Inventory, Invoices).
  - Import / Restore from backup file.
  - Pre-loaded Demo Data with 1-Click "Clear Demo Data / Start Fresh".

---

## Proposed Project Structure

```
ktech-service-management/
├── electron/
│   ├── main.ts               # Electron main process (window, lifecycle)
│   ├── preload.ts            # Secure contextBridge IPC exposed to renderer
│   ├── db/
│   │   ├── database.ts       # SQLite database initialization & migrations
│   │   ├── schema.sql        # Database schema definitions
│   │   ├── seedData.ts       # Realistic demo data for KTech Computers
│   │   └── repositories/     # Data access layer for tickets, customers, inventory, invoices
│   └── ipc/
│       ├── ticketIpc.ts
│       ├── customerIpc.ts
│       ├── inventoryIpc.ts
│       ├── invoiceIpc.ts
│       └── settingsIpc.ts
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Main layout, router & navigation
│   ├── index.css             # KTech Design System (CSS variables, themes, utilities)
│   ├── types/                # TypeScript interfaces (JobCard, Customer, Part, Invoice, etc.)
│   ├── context/              # App state & theme context
│   ├── components/
│   │   ├── common/           # Modal, Button, Badge, DataTable, SearchBar, Tabs, KPICard
│   │   ├── layout/           # Sidebar, Header, NotificationDrawer, QuickActionBar
│   │   ├── tickets/          # JobCardList, JobCardDetailsModal, NewJobCardModal, StatusBadge, DiagnosticsForm
│   │   ├── customers/        # CustomerList, CustomerDetailsModal, NewCustomerModal
│   │   ├── inventory/        # InventoryList, StockAdjustmentModal, LowStockAlerts
│   │   ├── billing/          # InvoiceList, NewInvoiceModal, A4InvoicePrint, ThermalReceiptPrint
│   │   ├── technicians/      # TechnicianList, TechnicianWorkloadCard, AssignModal
│   │   ├── reports/          # AnalyticsDashboard, RevenueChart, StatusPieChart
│   │   └── settings/         # ShopProfileSettings, MasterDataSettings, BackupRestorePanel
│   ├── services/             # Renderer API client (IPC wrapper with web fallback)
│   └── utils/                # Date formatters, Currency (INR ₹ / USD), WhatsApp link generator, print helpers
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## Verification Plan

### 1. Build & Compilation Verification
- Run TypeScript type checking (`tsc --noEmit`) to guarantee zero typing errors.
- Run Vite build (`npm run build`) to verify bundle compilation.

### 2. Functional & Workflow Testing
- **Dashboard**: Verify KPI counts match database records, quick action shortcuts work.
- **Job Card Lifecycle**: Create a new laptop repair job card -> assign technician -> log diagnostic findings -> add spare parts (RAM/SSD) -> check inventory deduction -> progress through stages -> finalize quality test checklist -> mark ready for pickup.
- **Customer CRM**: View customer repair history and verify newly created job cards reflect under their profile.
- **Inventory & Spare Parts**: Add new stock, update minimum reorder level, verify low-stock warning triggers when stock drops below threshold.
- **Invoicing & Payments**: Generate an A4 Tax Invoice and an 80mm Thermal Receipt; verify GST calculation, advance payment deduction, and balance tracking.
- **WhatsApp Integration**: Test WhatsApp message link formatting with ticket status and invoice link.
- **Theme & Backup**: Toggle between Dark and Light mode; test JSON export/import and demo data reset.
