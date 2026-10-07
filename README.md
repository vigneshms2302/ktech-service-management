# K-Connect — KTech Service & Business Management

[![Electron](https://img.shields.io/badge/Electron-31.7.7-47848F?logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-LibSQL-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.38.4-C5F74F)](https://orm.drizzle.team)
[![Tests](https://img.shields.io/badge/Tests-62_Passed-22c55e)](https://vitest.dev)

A modern, high-density, offline-first desktop application engineered for **KTech Computers** to manage repair job cards, customer CRM, spare parts inventory, GST invoicing, technician workflows, and business diagnostics.

---

## 📚 Documentation Index

- **[Master System Bible & Developer Handover Guide](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/docs/MASTER_PROJECT_HANDOVER_AND_SYSTEM_BIBLE.md)** — **THE ULTIMATE MASTER FIELD MANUAL**: Complete architectural specification, 46-table database dictionary, all IPC channels, enterprise security, 15 emergency incident playbooks, remote support protocol, and AI developer instructions.
- **[Master Status & Future Roadmap](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/docs/COMPLETED_AND_PENDING_ROADMAP.md)** — Complete breakdown of all completed features, 14-point enterprise security architecture, and future pending items.
- **[Technical Architecture](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/docs/TECHNICAL_ARCHITECTURE.md)** — Core Electron IPC bridge, process isolation, and security model.
- **[Database Design & Schema](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/docs/DATABASE_DESIGN.md)** — 46 relational SQLite tables and Drizzle ORM definitions.
- **[Entity Relationship Diagram](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/docs/ER_DIAGRAM.md)** — Visual database architecture.
- **[WhatsApp Integration Architecture](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/docs/WHATSAPP_ARCHITECTURE.md)** — WhatsApp Cloud API & deep link dispatch.
- **[Workflow State Machine](file:///c:/Users/Lenovo/Documents/GitHub/ktech-service-management/docs/WORKFLOW_STATE_MACHINE.md)** — 13-stage deterministic repair ticket lifecycle.

---

## 🛠️ Tech Stack & Key Subsystems

- **Frontend:** React 18, TypeScript, Vite 5, Lucide Icons, Custom KTech CSS Design System (Dark/Light).
- **Backend Runtime:** Electron 31 with strict `contextIsolation`, `nodeIntegration: false`, and typed IPC controllers.
- **Database:** Embedded SQLite / LibSQL with WAL mode and Drizzle ORM schema migrations.
- **Security & Crypto:** Hardware-fingerprinted AES-256-GCM authenticated encryption, salted `scrypt` password hashing, in-app request whitelist firewall, and consent-based cryptographic remote support sessions.
- **Diagnostics & Logs:** Multi-level structured logger, automatic 7-day daily rolling retention, PII redaction, and 1-click PKZIP diagnostic bundle exporter.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (Node.js 20 LTS recommended)
- Windows 10/11 x64

### Development Mode
```bash
# Start local Vite dev server and launch Electron
npm run dev
```

### Running Tests
```bash
# Run the complete test suite (59 unit & integration tests)
npm test

# Run TypeScript type check
npm run lint
```

### Production Build
```bash
# Build production executable (.exe NSIS installer & portable)
npm run build
```
