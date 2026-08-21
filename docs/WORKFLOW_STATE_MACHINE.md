# KTech Computers - Workflow State Machines & Transition Rules

This document specifies the exact deterministic finite state machines, transition guards, side effects, and audit mechanisms governing service jobs, data recovery, refurbished sales, salvage, and warranty claims.

---

## 1. General Service Job State Machine (13 Primary States + 5 Alternatives)

```mermaid
stateDiagram-v2
    [*] --> RECEIVED: Equipment Intake & Slip Generated
    
    RECEIVED --> WAITING_FOR_INSPECTION: Queued for Tech Assignment
    WAITING_FOR_INSPECTION --> UNDER_INSPECTION: Tech Claims Ticket
    
    UNDER_INSPECTION --> DIAGNOSIS_COMPLETED: Inspection & Voltages Logged
    UNDER_INSPECTION --> UNREPAIRABLE: Fatal Board/Physical Damage
    
    DIAGNOSIS_COMPLETED --> ESTIMATE_PREPARED: Cost Sheet / Quotation Drafted
    ESTIMATE_PREPARED --> WAITING_FOR_CUSTOMER_APPROVAL: Estimate Dispatched
    
    WAITING_FOR_CUSTOMER_APPROVAL --> APPROVED: Explicit Approval Recorded
    WAITING_FOR_CUSTOMER_APPROVAL --> CUSTOMER_DECLINED: Customer Declines Quote
    WAITING_FOR_CUSTOMER_APPROVAL --> ON_HOLD: Awaiting Customer Passcode/Feedback
    
    ON_HOLD --> WAITING_FOR_CUSTOMER_APPROVAL: Feedback Provided
    ON_HOLD --> CANCELLED: Customer Abandons / Cancels
    
    APPROVED --> UNDER_REPAIR: Technician Begins Repair Work
    UNDER_REPAIR --> WAITING_FOR_PARTS: Required Component Out of Stock
    WAITING_FOR_PARTS --> UNDER_REPAIR: Stock Received & Allocated
    UNDER_REPAIR --> REPAIR_COMPLETED: Technical Work Finished
    UNDER_REPAIR --> UNREPAIRABLE: Secondary Failure / Fatal Component Damage
    
    REPAIR_COMPLETED --> QUALITY_CHECK: Hardware QC Testing
    QUALITY_CHECK --> READY_FOR_DELIVERY: All QC Tests Passed
    QUALITY_CHECK --> UNDER_REPAIR: QC Failed (Re-work needed)
    
    READY_FOR_DELIVERY --> DELIVERED: Final Invoice Paid & Handed Over
    
    CUSTOMER_DECLINED --> RETURNED_WITHOUT_REPAIR: Handed Back to Customer
    UNREPAIRABLE --> RETURNED_WITHOUT_REPAIR: Handed Back to Customer
    UNREPAIRABLE --> SALVAGED: Transferred to Salvage Pipeline
    CANCELLED --> RETURNED_WITHOUT_REPAIR: Handed Back to Customer
    
    DELIVERED --> [*]
    RETURNED_WITHOUT_REPAIR --> [*]
    SALVAGED --> [*]
```

### 1.1 State Transition Matrix & Guard Rules

| From State | To State | Allowed Roles | Guard Conditions / Required Inputs | Side Effects & Actions |
| :--- | :--- | :--- | :--- | :--- |
| `[*] (New)` | `RECEIVED` | Reception, Owner | Device & Customer info entered, condition & accessory checklist completed. | Generates `JOB-YYYY-XXXXX`, creates initial `job_status_history` row, dispatches WhatsApp intake slip. |
| `RECEIVED` | `WAITING_FOR_INSPECTION` | Reception, Tech, Owner | Default queue state or technician assigned. | Ticket appears in technician inspection pool. |
| `WAITING_FOR_INSPECTION`| `UNDER_INSPECTION` | Tech, Owner | `assigned_technician_id` must be assigned. | Locks ticket to tech; starts inspection timer. |
| `UNDER_INSPECTION` | `DIAGNOSIS_COMPLETED` | Tech, Owner | `job_inspections` record and `job_diagnosis` findings logged. | Generates technical diagnostic summary. |
| `DIAGNOSIS_COMPLETED` | `ESTIMATE_PREPARED` | Reception, Tech, Owner | Parts and labor items added to `quotations`. | Generates `EST-YYYY-XXXXX` draft quotation. |
| `ESTIMATE_PREPARED` | `WAITING_FOR_CUSTOMER_APPROVAL` | Reception, Owner | Quotation sent via WhatsApp or handed in person. | Dispatches WhatsApp estimate template; starts approval tracking. |
| `WAITING_FOR_CUSTOMER_APPROVAL` | `APPROVED` | Reception, Owner | `quotation_approvals` record created with method, amount, employee, and timestamp. | Reserves required inventory items; moves job to technician active queue. |
| `WAITING_FOR_CUSTOMER_APPROVAL` | `CUSTOMER_DECLINED` | Reception, Owner | Rejection reason recorded in approval record. | Releases reserved inventory; prompts for diagnostic fee collection. |
| `WAITING_FOR_CUSTOMER_APPROVAL` | `ON_HOLD` | Reception, Tech, Owner | Hold reason recorded (e.g. waiting for customer password / decision). | Pauses SLA timers. |
| `APPROVED` | `UNDER_REPAIR` | Tech, Owner | Technician acknowledges job commencement. | Logs activity timestamp. |
| `UNDER_REPAIR` | `WAITING_FOR_PARTS` | Tech, Owner | Unfulfilled inventory item linked; note entered. | Triggers low-stock / procurement alert for Reception/Owner; sends WhatsApp status update. |
| `WAITING_FOR_PARTS` | `UNDER_REPAIR` | Tech, Reception, Owner | Stock entered into inventory and allocated to job. | Resumes repair timer. |
| `UNDER_REPAIR` | `REPAIR_COMPLETED` | Tech, Owner | Repair activity logged; parts marked as consumed. | Deducts parts from inventory permanently. |
| `REPAIR_COMPLETED` | `QUALITY_CHECK` | Tech, Reception, Owner | QC checklist initialized. | Test items displayed (Boot, Display, Wi-Fi, Sound, Stress). |
| `QUALITY_CHECK` | `READY_FOR_DELIVERY` | Tech, Reception, Owner | Mandatory QC test items passed. | Dispatches WhatsApp ready-for-pickup notice with balance due. |
| `QUALITY_CHECK` | `UNDER_REPAIR` | Tech, Owner | QC item failed; failure notes logged. | Re-opens repair activity with defect explanation. |
| `READY_FOR_DELIVERY` | `DELIVERED` | Reception, Accounts, Owner | Balance payment settled or authorized, delivery acknowledgement signed. | Generates final Tax Invoice `INV-YYYY-XXXXX`, creates `warranties` record, sends WhatsApp payment confirmation. |
| `UNDER_INSPECTION` / `UNDER_REPAIR` | `UNREPAIRABLE` | Tech, Owner | Comprehensive technical failure report logged. | Unlocks options: "Return to Customer" or "Transfer to Salvage". |
| `UNREPAIRABLE` | `SALVAGED` | Owner, Tech | Customer scrap donation agreement or purchase logged. | Creates `SALV-XXXXX` record; opens Salvage Dismantling Engine. |

---

## 2. Dedicated Data Recovery State Machine

```mermaid
stateDiagram-v2
    [*] --> RECEIVED: Storage Checked In & Disclaimers Signed
    RECEIVED --> ASSESSMENT: Visual Inspection & Clean Bench Triage
    ASSESSMENT --> DIAGNOSIS: Diagnostic Tool Analysis
    DIAGNOSIS --> ESTIMATE: Recovery Complexity & Quoted Size
    ESTIMATE --> WAITING_APPROVAL: Dispatched to Customer
    
    WAITING_APPROVAL --> RECOVERY_IN_PROGRESS: Approval Received
    WAITING_APPROVAL --> CANCELLED: Customer Declines Risk / Cost
    
    RECOVERY_IN_PROGRESS --> RECOVERY_COMPLETED: 100% Target Data Extracted
    RECOVERY_IN_PROGRESS --> PARTIAL_RECOVERY: Partial Sectors / Files Extracted
    RECOVERY_IN_PROGRESS --> UNSUCCESSFUL: Platter Scratch / Fatal Degradation
    
    RECOVERY_COMPLETED --> DELIVERED: Data Written to Destination Drive
    PARTIAL_RECOVERY --> DELIVERED: Customer Accepts Partial Result
    UNSUCCESSFUL --> RETURNED_WITHOUT_REPAIR: Media Returned
    CANCELLED --> RETURNED_WITHOUT_REPAIR: Media Returned
    
    DELIVERED --> [*]
    RETURNED_WITHOUT_REPAIR --> [*]
```

---

## 3. Salvage & Inventory Restocking Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Tech as Technician
    participant Job as Service Job
    participant Salv as Salvage Engine
    participant Inv as Inventory DB
    participant Audit as Audit Log

    Job->>Salv: Mark Job as UNREPAIRABLE -> Initiate Salvage
    Salv->>Salv: Generate SALV-00042 & Log Device Specs
    Tech->>Salv: Dismantle & Test Components (RAM, LCD, Fan, Wi-Fi)
    Tech->>Salv: Register Component: 8GB DDR4 RAM (Tested Working)
    Salv->>Inv: Insert New Inventory Item (item_type: 'SALVAGED_PART', source: 'SALV-00042')
    Inv->>Inv: Increment quantity_on_hand (+1)
    Inv->>Audit: Log Transaction (SALVAGE_IN, Ref: SALV-00042)
```

---

## 4. Refurbished Product Sales Lifecycle

```mermaid
stateDiagram-v2
    [*] --> IN_STOCK: Device Acquired (Trade-in / Bulk Purchase)
    IN_STOCK --> UNDER_REFURBISHMENT: Parts / Upgrades Being Installed
    UNDER_REFURBISHMENT --> READY_FOR_SALE: Cosmetic Grading & Burn-In Test Passed
    READY_FOR_SALE --> RESERVED: Customer Token Deposit Received
    RESERVED --> READY_FOR_SALE: Reservation Expired / Cancelled
    READY_FOR_SALE --> SOLD: Retail Invoice Generated & Paid
    RESERVED --> SOLD: Balance Paid & Delivered
    SOLD --> WARRANTY: Active Shop Warranty Window (30-90 Days)
    WARRANTY --> RETURNED: RMA / Defect Return
    WARRANTY --> [*]: Warranty Expired Smoothly
```

---

## 5. Warranty Claim State Machine

```mermaid
stateDiagram-v2
    [*] --> CLAIM_RECEIVED: Customer Returns Under Active Warranty
    CLAIM_RECEIVED --> VERIFY_WARRANTY: System Checks Expiry Date & Covered Scope
    
    VERIFY_WARRANTY --> REJECTED_OUT_OF_SCOPE: Physical/Liquid Damage or Expired
    VERIFY_WARRANTY --> WARRANTY_JOB_ACTIVE: Claim Verified & Validated
    
    WARRANTY_JOB_ACTIVE --> FREE_RE_REPAIR: Technician Fixes Root Issue (Zero Cost)
    WARRANTY_JOB_ACTIVE --> PART_SWAP_RMA: Defective Part Replaced from Stock / RMA
    
    FREE_RE_REPAIR --> DELIVERED: Re-tested & Handed Back to Customer
    PART_SWAP_RMA --> DELIVERED: Re-tested & Handed Back to Customer
    REJECTED_OUT_OF_SCOPE --> [*]
    DELIVERED --> [*]
```
