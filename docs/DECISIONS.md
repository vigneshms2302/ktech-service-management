# KTech Computers - Architecture Decision Records (ADRs)

This document records the foundational architectural decisions, rationale, alternatives considered, and implications for the KTech Computers internal desktop application.

---

## ADR-001: Pure Internal Desktop Application (No Customer-Facing Web Portals)
- **Status:** Accepted
- **Context:** The application is built specifically for internal staff (Owner, Reception, Technicians, Accounts).
- **Decision:** Build a standalone Electron desktop application without any customer self-service logins, public portals, or cloud hosting dependencies. Customers exist solely as business records and recipients of WhatsApp messages and generated PDF documents.
- **Consequences:** Eliminates SaaS hosting costs, public attack surfaces, user authentication for external clients, and multi-tenant security overhead.

---

## ADR-002: Generic Equipment & Service Job Domain Model
- **Status:** Accepted
- **Context:** KTech Computers repairs computers, laptops, monitors, motherboards, chip-level ICs, printers, PlayStation/Xbox consoles, power electronics (SMPS, EV chargers), and storage devices.
- **Decision:** Implement a decoupled, hierarchical domain model:
  $$\text{CUSTOMER} \longrightarrow \text{EQUIPMENT / DEVICE} \longrightarrow \text{SERVICE JOB}$$
  Equipment Type and Service Category are separate orthogonal attributes.
- **Consequences:** Allows the application to seamlessly support any electronic device or service type without hardcoded laptop assumptions.

---

## ADR-003: Relational Persistence with SQLite + Drizzle ORM (No Large JSON Stores)
- **Status:** Accepted
- **Context:** The system requires relational integrity, foreign key enforcement, transaction rollbacks for stock movements, and zero-configuration local persistence.
- **Decision:** Use SQLite 3 configured with WAL mode (`PRAGMA journal_mode = WAL;`) and Foreign Key enforcement (`PRAGMA foreign_keys = ON;`), managed through Drizzle ORM TypeScript schemas and automated migrations.
- **Consequences:** Provides lightning-fast local queries, atomic stock deductions, and structured relational integrity while maintaining a single `.sqlite` file for easy backups.

---

## ADR-004: Decoupled WhatsApp Service Abstraction with Manual Deep-Link Fallback
- **Status:** Accepted
- **Context:** Communication with customers is vital, but external APIs can be unconfigured, rate-limited, or internet may be unavailable.
- **Decision:** Introduce the `IWhatsAppService` interface. When official Cloud API credentials are present, messages dispatch over HTTPS; otherwise, the system transparently generates formatted `wa.me` deep links for one-click manual dispatch. Workflows never block on message delivery.
- **Consequences:** Guarantees 100% offline operational resilience while providing automated communication when connected.

---

## ADR-005: Dedicated Data Recovery Workflow & Risk Disclaimers
- **Status:** Accepted
- **Context:** Data recovery involves high technical risk, drive degradation, variable complexity, and specialized media destination tracking.
- **Decision:** Create a specialized `data_recovery_jobs` entity and state machine with mandatory risk disclaimer acknowledgments, detection state logging, damage classification, and recovered data size tracking.
- **Consequences:** Protects KTech legally and provides technicians with proper tooling for storage recovery jobs.

---

## ADR-006: Salvage Component Pipeline with Source Lineage
- **Status:** Accepted
- **Context:** Unrepairable or abandoned devices often contain valuable working components (RAM, SSDs, screens, fans) that enter spare parts inventory.
- **Decision:** Introduce `salvage_devices` and `salvage_parts`. Dismantled working parts automatically become `inventory_items` retaining a permanent source reference (`SALV-00042`).
- **Consequences:** Provides clear inventory provenance and tracks the cost/value recovery from scrap devices.

---

## ADR-007: First-Class Warranty Entity & Direct Claim Job Linking
- **Status:** Accepted
- **Context:** Warranty coverage needs exact start/expiry dates, terms, and direct claim handling when devices return.
- **Decision:** Model `warranties` as standalone relational records linked to invoices, jobs, and products. When a customer brings back a device, staff can click "Create Warranty Job", which links directly back to the original repair.
- **Consequences:** Eliminates warranty disputes, tracks recurring hardware failures, and accounts for warranty repair costs accurately.

---

## ADR-008: Explicit Customer Quotation Approval Tracking
- **Status:** Accepted
- **Context:** Approvals should not be inferred from a status dropdown alone; dispute prevention requires tracking who approved what, when, and how.
- **Decision:** Create a dedicated `quotation_approvals` table storing the exact approved amount, method (WhatsApp/Phone/In-person), contact used, employee who recorded it, and timestamp.
- **Consequences:** Complete auditability of customer approvals before technicians begin billable work.

---

## ADR-009: Local Headless PDF Generation & Direct Printing
- **Status:** Accepted
- **Context:** Invoices, receipts, and quotations must print reliably without internet access or third-party cloud rendering services.
- **Decision:** Use Electron's native headless Chromium `printToPDF` and direct hardware spooling with standardized print CSS templates.
- **Consequences:** Instant, 100% offline document generation for A4 Tax Invoices, Quotations, and 80mm/58mm Thermal receipts.

---

## ADR-010: High-Density, Keyboard-Driven Internal UI
- **Status:** Accepted
- **Context:** Staff members use this application all day long for fast customer turnaround and technical logging.
- **Decision:** Prioritize high information density, clear typography, instant search (`Ctrl+K`), and keyboard shortcuts (`F1`-`F4`, `Ctrl+P`, `Esc`) over heavy visual animations or excessive whitespace.
- **Consequences:** Maximizes operational speed, minimizes mouse clicks, and keeps the UI snappy and distraction-free.

---

## ADR-011: Configurable GST Tax Model with Split Parts/Labor Billing
- **Status:** Accepted
- **Context:** Indian GST compliance requires CGST/SGST/IGST breakdown, HSN/SAC codes, and tax-inclusive/exclusive pricing options.
- **Decision:** Implement a flexible tax calculator supporting GST enabled/disabled toggle, configurable tax slabs per item/service (0%, 5%, 12%, 18%, 28%), and distinct line items for spare parts vs service labor.
- **Consequences:** Fully compliant with Indian GST requirements for B2B and B2C billing while maintaining simplicity for non-GST transactions.

---

## ADR-012: Multi-Tier Automated & Safety-Snapshot Backup Strategy
- **Status:** Accepted
- **Context:** Local databases must be safeguarded against drive failure, accidental deletion, or corrupted restore files.
- **Decision:** Implement 3-tier backups: (1) Daily automated rotating snapshots, (2) User-triggered manual backups, and (3) Mandatory pre-restore snapshots taken automatically before any database restore is executed.
- **Consequences:** Zero risk of catastrophic data loss during operations or restores.
