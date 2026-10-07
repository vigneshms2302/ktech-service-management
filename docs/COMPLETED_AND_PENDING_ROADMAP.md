# KTech Service Management — Master Project Status & Comprehensive Roadmap

**Application Name:** K-Connect (KTech Service & Business Management Desktop Application)  
**Version:** 1.1.0  
**Stack:** Electron 31, Vite 5, React 18, TypeScript 5.5, SQLite / LibSQL, Drizzle ORM  
**Architecture Model:** Zero-Config Offline-First Desktop Application with Hardware-Bound Security  

---

## 1. Executive Summary

This document serves as the **single source of truth** for all capabilities built, enterprise security subsystems deployed, architectural justifications, and pending future enhancements for **KTech Computers**.

---

## 2. Completed Features & Architecture (What is Done)

### Phase 1: Core Shell, Database & Security Foundation
- [x] **Electron 31 + Vite 5 + React 18 Framework:** High-performance, isolated desktop shell with typed IPC communication (`electron/preload.ts`).
- [x] **Embedded SQLite / LibSQL with Drizzle ORM:** 46 relational tables operating completely offline with zero installation or database server configuration needed.
- [x] **Dynamic Hardware-Bound Cryptography (`electron/security/crypto.ts`):** 
  - AES-256-GCM authenticated encryption for sensitive passcodes and tokens.
  - Machine entropy derived dynamically from CPU model, MAC address, hostname, and OS platform — zero hardcoded master keys.
  - Salted `scrypt` password hashing with timing-safe comparisons.
- [x] **Role-Based Access Control (RBAC):** 4 core roles (Shop Owner, Receptionist, Repair Technician, Accounts/Billing) with fine-grained permission flags and fast numeric PIN switching.
- [x] **Dark & Light Theme Design System:** High-density desktop UI with customizable themes and micro-animations.

---

### Phase 2: CRM & Service Job Card Lifecycle
- [x] **Customer Directory & Phone Autocomplete:** Duplicate phone/email detection, commercial/GST customer profiling, and repair history timeline.
- [x] **18 Distinct Equipment Profile Models:** Custom spec sheets for Laptops, Desktops, MacBooks, Servers, GPUs, Consoles, Printers, SMPS, and Storage Drives.
- [x] **13-Stage Deterministic Repair State Machine:** 
  - `RECEIVED` $\rightarrow$ `DIAGNOSIS` $\rightarrow$ `ESTIMATE_PENDING` $\rightarrow$ `WAITING_APPROVAL` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `QC_TESTING` $\rightarrow$ `READY_FOR_PICKUP` $\rightarrow$ `DELIVERED` / `UNREPAIRABLE` / `CANCELLED`.
  - Immutable state transition audit trail with timestamps and technician IDs.
- [x] **Technician Diagnostic Workspace:** Multi-point hardware checklist (Boot, Display, Audio, Wi-Fi, Thermal), IC component identification, and repair activity logs.
- [x] **Accessory & Condition Inspection Intake:** Checks charger, bag, power cables, physical scratches, and intake photos.

---

### Phase 3: Quotations, Invoicing, Tax Engine & Local Printing
- [x] **Split Quotations & Formal Customer Approval Tracking:** Separate parts vs. labor costing; approval logging (Method: WhatsApp, Call, In-Person; approved amount; timestamp).
- [x] **GST & Non-GST Billing Engine:** Dynamic CGST (9%), SGST (9%), IGST (18%), custom HSN/SAC codes, advance deposit adjustments, split payments (Cash, UPI QR, Card), and balance tracking.
- [x] **Local Print Engine:** 
  - Pixel-perfect A4 GST Tax Invoices, Quotations, and Gate Passes.
  - 80mm & 58mm POS Thermal Admission Slips and Cash Receipts.
- [x] **Secure Credential Vault:** Encrypted storage for client device lock patterns, BIOS passwords, and Windows credentials.

---

### Phase 4: Multi-Tier Inventory, Stock Movements & Salvage Lineage
- [x] **Inventory Master:** Tracks New parts, Used/Tested parts, Salvaged components, Consumables, and Retail products.
- [x] **Transactional Stock Auditing:** Purchase In, Repair Job Consumption, Direct Over-the-Counter Sales, Defective Scrap, and Inventory Adjustments.
- [x] **Automatic Stock Depletion & Low-Stock Alerts:** Automatically claims parts upon repair completion with zero-negative-stock protection.
- [x] **Salvage & Component Harvesting Engine:** Convert unrepairable "dead" customer/shop devices into usable tested parts (`SALV-XXXXX`) while maintaining parent device lineage.

---

### Phase 5: Specialized Business Modules
- [x] **Data Recovery Studio:** 10-stage forensic workflow, media health triage (Head crash, Bad sectors, Firmware failure, Water damage), donor drive matching, destination drive verification, and legal waiver generation.
- [x] **Custom PC Builder:** Interactive component slot configurator (Processor, Motherboard, GPU, RAM, PSU, Cooler, Storage), dynamic watt estimation, real-time margin calculator, and formal build proposals.
- [x] **Refurbished Device Sales:** Purchase used machines, log refurbishment work, grade cosmetics (Grade A/B/C), and sell with standalone shop warranties.
- [x] **Warranty Management & 1-Click Claim Jobs:** Automatic warranty card generation on invoices; 1-click claim ticket intake linking back to the original repair.

---

### Phase 6: WhatsApp Center, Backups & Initial Setup
- [x] **WhatsApp Communication Center:** Template-driven dispatch (Job Intake Confirmation, Quotation Approval Request, Ready for Pickup, Invoice PDF link) via WhatsApp Cloud API or WhatsApp Desktop/Web deep-link fallback.
- [x] **Multi-Tier Database Backups:** Automated daily snapshots, manual on-demand backups, and pre-restore safety backups stored in `storage/backups/`.
- [x] **First-Time Setup Wizard & Day-Zero Factory Reset:** Clean onboarding for new shop deployments with automated data wiping.

---

### Phase 7: Enterprise Security, Logging, Licensing & Remote Support (The 14-Point Architecture)
- [x] **Enterprise Dynamic Logging Framework (`electron/utils/logger.ts`):**
  - Multi-level logging (`DEBUG`, `INFO`, `WARN`, `ERROR`, `AUDIT`, `EXCEPTION`).
  - Automated 7-day rolling daily log rotation (`ktech-YYYY-MM-DD.log` & `error-YYYY-MM-DD.log`).
  - Automatic daily cleanup worker purging logs older than retention threshold (configurable dynamically).
  - Global process exception capturing for `uncaughtException` and `unhandledRejection`.
- [x] **Automatic PII & Sensitive Data Redactor:** Regex engine scrubs passwords, passcodes, PINs, credit card numbers, and auth tokens before logs are persisted.
- [x] **1-Click Diagnostics & PKZIP Archive Packager (`electron/utils/diagnosticPackager.ts`):** Generates compressed `ktech-diagnostics-[timestamp].zip` containing 7-day logs, SQLite DB integrity reports, table row statistics, and OS metrics for instant troubleshooting.
- [x] **Consent-Based Cryptographic Remote Support ("Safe Superadmin" - `electron/security/supportSession.ts`):**
  - Dynamic 15-minute challenge code (OTP) generated on client workstation.
  - HMAC-SHA256 response token verification unlocks a 2-hour elevated session.
  - Grants access to deep repairs: Index rebuild (`REINDEX`), storage vacuuming (`VACUUM`), foreign key integrity self-healing, and orphan record cleanup.
  - Completely eliminates dangerous hardcoded backdoors or RAT risks.
- [x] **Zero-Cost Offline KTech Support Engineer Command Portal (`tools/ktech-support-generator.html`):**
  - Standalone single-file HTML5/JS tool running 100% free with zero hosting or server costs.
  - Enables KTech engineers to calculate HMAC-SHA256 unlock tokens on any mobile browser or laptop in 1 click.
- [x] **Workstation Node Licensing & Device Seat Restriction (`electron/security/workstationLicense.ts`):**
  - Caps installations to an authorized number of active computers (default: 4 seats, dynamically configurable).
  - Hardware machine ID fingerprinting prevents unauthorized multi-PC copying without license seats.
  - Deactivation & reactivation management in Shop Settings to easily replace old/decommissioned computers.
  - Startup lock screen blocks access on unauthorized 5th+ machines with clear recovery steps.
- [x] **In-App Network Guard & Request Whitelist Firewall (`electron/security/firewall.ts`):** Enforces strict session whitelisting for Meta WhatsApp APIs, GitHub update servers, and loopback connections, blocking unauthorized outbound data leaks.
- [x] **Anti-Reverse Engineering & Production Hardening (`vite.config.ts`, `electron-builder.json`):**
  - Production ASAR bundling with source map stripping.
  - DevTools disabled in production packages.
  - Navigation window sandboxing preventing malicious redirects.
- [x] **Desktop Auto-Updater (`electron-updater`):** Background GitHub releases check, update download notifications, and 1-click silent install.

---

## 3. Pending & Future Roadmap Items (What is Left to Do)

The remaining items are strategic operational enhancements for future milestones as KTech expands:

### Priority 1: High (Next Release Polish)
1. **Windows Authenticode Code Signing Certificate (EV Token):**
   * *Status:* Pending acquisition of a digital certificate (e.g., DigiCert / Sectigo).
   * *Purpose:* Eliminates the Windows SmartScreen *"Unknown Publisher"* warning banner when clients run the `.exe` installer.

### Priority 2: Medium (Business Scaling)
2. **Direct USB Thermal ESC/POS Raw Driver Support:**
   * *Status:* Planned.
   * *Purpose:* Direct byte-stream printing to USB thermal receipt printers (Epson, TVS, Xprinter) bypassing the standard OS print dialog.
3. **Automated Scheduled Cloud Backup (Google Drive / OneDrive / AWS S3):**
   * *Status:* Planned.
   * *Purpose:* Allow shop owners to link their personal Google Drive or OneDrive to auto-upload encrypted SQLite backup archives daily.
4. **Customer Web Portal / Status Lookup Widget:**
   * *Status:* Planned.
   * *Purpose:* A lightweight web page where customers can enter their Job Card # and phone number to see live repair status without calling the shop.

### Priority 3: Low (Long-Term Multi-Branch Expansion)
5. **Multi-Counter LAN Sync or LibSQL / Turso Cloud Sync:**
   * *Status:* Architecture ready (Drizzle ORM abstraction allows seamless transition).
   * *Purpose:* For large service centers with 5+ front-desk receptionists connecting to a shared central database over local LAN or private cloud.
6. **SMS Gateway Integration (MSG91 / Fast2SMS):**
   * *Status:* Planned as alternative fallback for customers without WhatsApp.

---

## 4. Database Architectural Decision Record (ADR)

### Why SQLite / LibSQL + Drizzle ORM is retained over Standalone MySQL:

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│       SQLite / LibSQL (Active)       │       Standalone MySQL Server        │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ Zero installer dependencies          │ 1-2 GB MySQL Server installation     │
│ Zero background Windows services     │ Requires Windows service management  │
│ Uses < 15 MB RAM                     │ Uses 300MB - 1GB RAM idle            │
│ 1-Click backup: copy ktech.sqlite    │ Requires mysqldump and SQL scripts   │
│ In-process native C-speed execution  │ TCP/socket network overhead          │
│ Used by VS Code, Apple, WhatsApp     │ Designed for central cloud web apps  │
└──────────────────────────────────────┴──────────────────────────────────────┘
```
