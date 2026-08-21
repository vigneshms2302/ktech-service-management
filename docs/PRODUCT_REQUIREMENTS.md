# KTech Computers - Product Requirements Document (PRD)

**Document Version:** 2.1.0  
**Target Platform:** Standalone Internal Desktop Application (Windows / Linux / macOS)  
**Primary Users:** Owner, Reception / Front Desk, Technicians, Accounts Staff  
**Architecture:** Electron (Secure Sandbox) + React 18 (TypeScript) + SQLite + Drizzle ORM  

---

## 1. System Definition & Scope Boundary

KTech Computers is a multi-disciplinary technical repair, chip-level diagnostics, data recovery, power electronics servicing, refurbished hardware sales, and custom PC assembly business.

This software is an **internal-only desktop management system**.

### Strict Operational Boundaries:
- **Zero Customer-Facing Web Surfaces:** No customer portals, logins, dashboards, or self-service tracking websites exist. Customers exist exclusively as database records and recipients of branded physical/PDF documents and WhatsApp updates.
- **Local-First & Offline Operations:** All core business capabilities (job intake, technical diagnostics, stock adjustments, invoicing, PDF generation, backup) operate with 100% functionality without internet connectivity.
- **Role-Gated Workspaces:** The interface strictly isolates functionalities by staff roles (`Owner`, `Reception`, `Technician`, `Accounts`).

---

## 2. Business Domain & Service Spectrum

Operations are modeled under a generic three-tier entity structure:
$$\text{CUSTOMER} \longrightarrow \text{EQUIPMENT / DEVICE} \longrightarrow \text{SERVICE JOB / ACTIVITY}$$

### 2.1 Equipment Types (Generic Device Catalog)
The system treats equipment generically without hardcoding assumptions:
1. `Laptop` (Ultrabooks, Gaming laptops, MacBooks, Chromebooks)
2. `Desktop` (Branded towers, All-in-Ones, Mini PCs)
3. `Custom PC` (Assembled gaming/workstation rigs)
4. `Monitor` (LCD, LED, Curved, Gaming displays)
5. `Printer` (Laser, Inkjet, Thermal, Dot Matrix, Multi-function)
6. `PlayStation` (PS4, PS4 Pro, PS5 Digital, PS5 Disc)
7. `Xbox` (Xbox One, Xbox Series S, Xbox Series X)
8. `Gaming Console` (Nintendo Switch, Steam Deck, Handhelds, Retro)
9. `HDD` (2.5" / 3.5" Mechanical SATA/IDE Hard Drives)
10. `SSD` (2.5" SATA Solid State Drives)
11. `M.2` (NVMe PCIe / SATA M.2 Storage Blades)
12. `Pen Drive` (USB Flash Drives, OTG Drives)
13. `SMPS` (Standard ATX, SFX, Server Power Supplies)
14. `Power Supply` (Variable bench supplies, Industrial PSUs)
15. `EV Charger` (Electric Vehicle charging units, control boxes)
16. `Adapter` (High-wattage laptop chargers, power bricks)
17. `Motherboard` (Standalone laptop/desktop boards submitted for chip-level repair)
18. `Other Electronic Equipment` (PCB boards, inverters, audio controllers, specialized hardware)

### 2.2 Service Types (Orthogonal to Equipment)
Service types are independent of equipment:
- `Chip-Level / Motherboard Repair` (Power circuit, charging IC, short-circuit, no-power, no-display, BIOS flashing, BGA rework)
- `Hardware Replacement` (Panels, keyboards, batteries, DC jacks, cooling fans, hinges, ports)
- `General Servicing & Maintenance` (Thermal paste, liquid metal, internal cleaning, lubrication)
- `OS & Software Installation` (Windows/Linux OS setup, drivers, firmware updates)
- `Data Recovery` (Dedicated logical, firmware, clean-bench, bad sector recovery)
- `Power Electronics Repair` (MOSFETs, capacitors, transformers, voltage calibration, load testing)
- `Console Repair` (HDMI port replacement, APU thermal rework, controller repair)
- `Printer Service` (Roller replacement, head cleaning, logic board fixing, power unit overhaul)
- `Custom PC Assembly & Tuning` (Component assembly, cable management, BIOS configuration, burn-in stress testing)
- `Upgrade Service` (RAM/SSD installation, CPU/GPU upgrades)

---

## 3. Core Functional Modules

### 3.1 Customer CRM & Generic Equipment Management
- Record individual and commercial clients (Name, Primary Phone, Alt Phone, Email, Address, GSTIN, Notes).
- Device ownership log: Multi-device support per customer with serial numbers, service tags, OS passcodes, specifications, and physical intake condition photos.

### 3.2 Service Job Lifecycle & Inspection Engine
- Deterministic 13-stage primary state machine + 5 alternative branch states with full audit tracking.
- Equipment-specific inspection checklists (Power rails, short circuits, liquid damage indicators, physical cosmetic condition).
- Diagnostic sheet logging root cause, measured voltages, identified faulty components/ICs, and proposed solutions.

### 3.3 Quotations & Explicit Customer Approval Entity
- Itemized quotations separating spare parts and labor charges.
- **Explicit Approval Record**: Captures Quotation ID, Approved Amount, Approval Status (`APPROVED`, `PARTIAL_APPROVAL`, `REJECTED`), Method (`WhatsApp`, `Phone Call`, `In Person`, `Email`), Employee who recorded it, Customer Contact Used, and Timestamp.

### 3.4 Dedicated Data Recovery Module
- Specialized technical tracking: Storage Type (HDD 2.5/3.5, SSD, M.2, Pen Drive), Detection Status (Detected Normal, Wrong Size, Not Detected, Busy/Hang, Clicking Noise), Damage Category (Logical, Firmware, Bad Sectors, PCB, Mechanical Crash), Recovery Difficulty Grade.
- Destination media tracking (Customer Provided Drive vs Purchased New Drive with serials).
- Recovered data size tracking (GB/TB) and outcome (`FULL_RECOVERY`, `PARTIAL_RECOVERY`, `UNSUCCESSFUL`).
- Mandatory legal risk disclaimer consent record prior to diagnostic attempts.

### 3.5 Salvage & Scrap Recovery Pipeline
- Allows unrepairable or abandoned equipment to be formally salvaged (`SALV-XXXXX`).
- Technicians dismantle and bench-test reusable parts (RAM, SSD, LCD, fans, Wi-Fi modules, chassis).
- Harvested components automatically enter active inventory with `Condition: Salvaged / Used` and traceable source lineage (`Source: SALV-00042`).

### 3.6 Refurbished Product Sales Management
- Complete product lifecycle: `ACQUIRED` $\rightarrow$ `UNDER_REFURBISHMENT` $\rightarrow$ `READY_FOR_SALE` $\rightarrow$ `RESERVED` $\rightarrow$ `SOLD` $\rightarrow$ `WARRANTY_ACTIVE` $\rightarrow$ `RETURNED`.
- Tracks hardware specifications, cosmetic grade (Grade A/B/C), acquisition cost, refurbishment parts/labor spent, selling price, and shop warranty duration.

### 3.7 Custom PC Builder Module
- Dedicated configurator across standard components (CPU, Motherboard, RAM, GPU, Storage, PSU, Case, Cooler, Peripherals, OS).
- Real-time cost vs selling margin calculation, assembly labor, discount, and GST breakdown.
- One-click generation of branded **A4 PC Build Proposals** and formatted WhatsApp messages.

### 3.8 Multi-Tier Inventory & Auditable Stock Movements
- Categorized stock tiers: `New Spare Parts`, `Used Parts`, `Salvage Parts`, `Finished / Refurbished Products`, `Consumables`.
- Auditable transaction movements: `Purchase In`, `Used in Repair`, `Sold`, `Salvaged In`, `Returned to Supplier`, `Damaged / Lost`, `Audit Adjustment`.
- Enforces strict atomic deductions with zero-negative-stock validation.

### 3.9 Configurable Billing, GST & Multi-Mode Invoicing
- Configurable GST engine: GST enabled/disabled toggle, CGST/SGST/IGST breakdown, per-item HSN/SAC codes, and tax-inclusive/exclusive calculations.
- Split invoicing for parts and labor charges.
- Payment tracking: Advance deposits, invoice settlements, partial payments, multiple modes (Cash, UPI QR, Credit/Debit Card, Bank Transfer).

### 3.10 Warranty Management & Linked Claim Jobs
- Dedicated `warranties` entity recording Start Date, Expiry Date, Covered Services/Parts, and Exclusions.
- **1-Click "Create Warranty Job"**: When equipment returns under warranty, creates a linked repair job tied to the parent warranty and original service invoice.

### 3.11 Abstracted WhatsApp Communication Service
- Pluggable `WhatsAppService` interface supporting the official WhatsApp Business / Cloud API with automated status tracking (`PENDING`, `SENT`, `DELIVERED`, `FAILED`).
- Built-in manual deep-link fallback (`wa.me`) for offline or unconfigured environments. Non-blocking design ensures business operations never fail on network issues.

### 3.12 Comprehensive Local Document & PDF Engine
- Generates 100% local, high-resolution branded documents:
  1. Admission Receipt / Job Card
  2. Estimate / Quotation
  3. PC Build Quotation
  4. Data Recovery Assessment & Estimate
  5. GST / Non-GST Tax Invoice
  6. Payment Receipt
  7. Delivery Receipt & Acceptance Slip
  8. Warranty Certificate
  9. Customer Service History Report
  10. Business Analytics, Inventory & GST Reports
- Secondary support for 80mm / 58mm POS thermal slips.

### 3.13 Role-Based Security, Audit Logs & Disaster Recovery
- Tailored workspaces for `Owner`, `Reception`, `Technician`, `Accounts`.
- Immutable append-only `audit_logs` tracking all mutations.
- Multi-tier backup engine: automated daily rotating snapshots, 1-click manual backups, and mandatory pre-restore safety snapshots.
