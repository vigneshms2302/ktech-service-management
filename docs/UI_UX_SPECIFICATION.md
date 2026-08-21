# KTech Computers - UI/UX Specification for Internal Desktop App

**Core Philosophy:** High-Density, Fast-Navigation, Minimal-Click Interface for Non-Technical Shop Staff.  
**Styling Standard:** Clean, High-Contrast Professional UI (Dark / Light Mode) with zero distracting visual bloat or heavy animations.  

---

## 1. Usability Principles for Shop Operations

1. **High Information Density & Zero Fluff:** Front desk and technicians manage multiple repairs and customers simultaneously. Layouts maximize visible data rows, badges, and status cues without unnecessary padding or empty whitespace.
2. **Speed & Minimal Clicks:** Routine tasks (Intake, Adding diagnostic findings, Searching inventory, Recording payments) use streamlined keyboard-tabbable modals with smart autofocus and autofill.
3. **No Heavy Visual Effects:** Avoid heavy background blurs (glassmorphism), slow sliding drawers, or long micro-animations. Screen updates and modal opens occur within 100ms.
4. **Search-First Workflow:** A universal search bar (`Ctrl + K` or `/`) queries Customer Phone, Job Number, Serial Number, Customer Name, or Inventory SKU in <50ms.

---

## 2. Global Navigation & Keyboard Shortcuts

```
+---------------------------------------------------------------------------------------+
| [KTech Logo] | [Global Search: Ctrl+K] | [Role: Owner / Tech] | [Theme] | [User]      |
+---------------------------------------------------------------------------------------+
|  SIDEBAR          |  MAIN WORKSPACE CONTENT AREA                                      |
|  ---------------- |  ---------------------------------------------------------------- |
|  📊 Dashboard     |  * Role-Specific Views (KPIs / Tech Queue / Counter Intake)       |
|  🛠️ Service Jobs  |  * High-Density Data Tables with Multi-Column Filters             |
|  💾 Data Recovery |  * Master-Detail Inspection Panels & Diagnostics Sheets           |
|  📦 Inventory     |  * Tabbed Workspace (Details / Parts / QC / History / Invoices)   |
|  ♻️ Salvage Hub   |                                                                   |
|  💻 Refurb Sales  |                                                                   |
|  🖥️ PC Builder    |                                                                   |
|  👥 Customers     |                                                                   |
|  🧾 Billing & GST |                                                                   |
|  🛡️ Warranties    |                                                                   |
|  📈 Reports       |                                                                   |
|  ⚙️ Settings      |                                                                   |
+---------------------------------------------------------------------------------------+
```

### 2.1 Keyboard Shortcuts Matrix

| Key Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Ctrl + K` or `/` | Open Global Search Bar | Universal |
| `F1` | Create New Service Job (Intake Modal) | Universal |
| `F2` | Create Quick Direct Sale / Invoice | Universal |
| `F3` | Quick Customer Lookup | Universal |
| `F4` | Quick Inventory & Spare Parts Lookup | Universal |
| `Ctrl + P` | Print Current Document (A4 / Thermal) | Document Views |
| `Ctrl + S` | Save / Commit Current Form | Active Forms & Editors |
| `Esc` | Close Active Modal / Clear Search | Universal |

---

## 3. Role-Specific Workspaces

### 3.1 Owner Workspace
- **Executive KPI Cards:** Today's Revenue, Monthly Revenue, Active Repairs in Shop, Pending Estimates, Low Stock Alerts, Active Warranties.
- **Financial Breakdown:** Parts Revenue vs Labor Revenue, GST Collected (CGST/SGST/IGST), Net Gross Margin.
- **Operations Oversight:** Technician workload distribution, turnaround time metrics, unresolved claims.
- **Management Portals:** Complete audit log browser, staff performance metrics, data backup/restore center, master GST/shop profile settings.

### 3.2 Reception / Front Desk Workspace
- **Counter Intake Desk:** Rapid multi-step intake modal (Customer lookup $\rightarrow$ Equipment specs $\rightarrow$ Issues & condition checklist $\rightarrow$ Advance deposit $\rightarrow$ Instant A4/Thermal slip print).
- **Active Admission Queue:** Filter by `Received`, `Waiting for Inspection`, `Estimate Prepared`, `Waiting Approval`.
- **Customer Communication Hub:** 1-Click WhatsApp estimate dispatch, explicit approval recorder (amount, date, method, notes).
- **Delivery & Cashier Desk:** Quick settlement modal, advance deduction, balance payment collection (Cash/UPI/Card), warranty certificate generation, and delivery sign-off.

### 3.3 Technician Workspace (The Tech Workbench)
- **Focused Queues:**
  - `My Assigned Jobs` (Active jobs assigned to logged-in tech)
  - `Unassigned Pool` (Devices awaiting technical diagnosis)
- **Master Diagnostic & Inspection Sheet:**
  - Power rail status toggles (No Power, Short-circuit, Normal).
  - Motherboard / IC diagnosis notes & voltage test points.
  - Spare parts selector (fetches live inventory with available stock count).
  - Labor tasks & time spent tracker.
- **Hardware Quality Check (QC) Workbench:**
  - Interactive test checkboxes (Boot Test, Screen/Display, Keyboard & Touchpad, Wi-Fi & Bluetooth, Audio & Mic, Charging & Battery, Thermal Stress).
  - Pass/Fail verification with mandatory re-test notes if failed.

### 3.4 Accounts Workspace
- **Invoicing & Settlement Desk:**
  - Filter invoices by `Unpaid`, `Partially Paid`, `Settled`, `Voided`.
  - Record payments with transaction references (UPI UTR, Card Auth, Cheque).
- **Tax & GST Center:**
  - Itemized Tax Report (B2B Tax Invoices with GSTIN, B2C Retail Bills).
  - HSN / SAC code summary report for monthly GSTR filing.
- **Outstanding Balances & Customer Ledger:**
  - Aging receivables list with one-click WhatsApp payment reminders.
