# KTech Computers - WhatsApp Communication Architecture

This document defines the decoupled, multi-provider communication architecture used by the KTech Computers internal desktop application.

---

## 1. Architectural Philosophy & Decoupling

The communication engine operates as an **asynchronous, non-blocking subsystem**:
1. **Zero Core-Blocking:** Application workflows (job creation, status changes, invoice generation) are decoupled from message dispatch. If the internet is down, an API rate limit is reached, or a customer number is invalid, the primary business action **always succeeds**.
2. **Pluggable Provider Pattern:** The application code interacts only with the abstract `IWhatsAppService` interface. The underlying driver (Official Cloud API, Manual Deep-Link Fallback, or SMS) is injected transparently at runtime based on configured credentials.
3. **Audit & Traceability:** Every message is recorded with payload, timestamp, and status in `communication_messages` (`PENDING`, `SENDING`, `SENT`, `DELIVERED`, `FAILED`).
4. **Asynchronous Queue & Retry:** If offline or API is unavailable, the message remains in `PENDING` status for background retry or manual fallback, ensuring zero interruption to the business workflow.

```
+-------------------------------------------------------------------------+
|                       Application Business Layer                        |
|        (Job Intake, Diagnosis, Quotation, QC, Billing, Delivery)        |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  IWhatsAppService (Abstract Gateway)                    |
|                                                                         |
|  * sendAdmission()             * sendWaitingParts()                     |
|  * sendEstimate()              * sendReadyNotification()                |
|  * sendApprovalRequest()       * sendInvoice()                          |
|  * sendRepairUpdate()          * sendPaymentConfirmation()              |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                      Provider Resolution Engine                         |
+-------------------------------------------------------------------------+
        |                                                 |
  [API Configured & Online]                   [Offline / Unconfigured]
        |                                                 |
        v                                                 v
+-----------------------------+           +-----------------------------+
|   Official Meta Cloud API   |           |    WhatsApp Web / Desktop   |
|   HTTPS Direct Template     |           |    Deep-Link Fallback       |
+-----------------------------+           +-----------------------------+
        |                                                 |
        +-----------------------+-------------------------+
                                |
                                v
+-------------------------------------------------------------------------+
|           Database Log (`communication_messages` Table)                |
|     Status: PENDING ──> SENDING ──> SENT ──> DELIVERED / FAILED         |
+-------------------------------------------------------------------------+
```

---

## 2. Service Interface Definition

```typescript
export interface CommunicationResult {
  success: boolean;
  messageId: string;
  channel: 'WHATSAPP_API' | 'WHATSAPP_DEEP_LINK' | 'SMS';
  status: 'PENDING' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  rawResponse?: unknown;
  errorMessage?: string;
  fallbackUrl?: string; // Generated wa.me URL for manual launching if needed
}

export interface IWhatsAppService {
  sendAdmission(data: {
    customerName: string;
    phone: string;
    jobNumber: string;
    equipment: string;
    reportedIssue: string;
    estimatedCost: number;
    advancePaid: number;
  }): Promise<CommunicationResult>;

  sendEstimate(data: {
    customerName: string;
    phone: string;
    jobNumber: string;
    quotationNumber: string;
    equipment: string;
    diagnosisSummary: string;
    partsTotal: number;
    laborTotal: number;
    grandTotal: number;
  }): Promise<CommunicationResult>;

  sendApprovalRequest(data: {
    customerName: string;
    phone: string;
    jobNumber: string;
    quotedAmount: number;
    requiredParts: string[];
  }): Promise<CommunicationResult>;

  sendRepairUpdate(data: {
    customerName: string;
    phone: string;
    jobNumber: string;
    equipment: string;
    newStatus: string;
    statusNotes?: string;
  }): Promise<CommunicationResult>;

  sendWaitingParts(data: {
    customerName: string;
    phone: string;
    jobNumber: string;
    partName: string;
    expectedEtaDays?: number;
  }): Promise<CommunicationResult>;

  sendReadyNotification(data: {
    customerName: string;
    phone: string;
    jobNumber: string;
    equipment: string;
    totalAmount: number;
    advanceAdjusted: number;
    balanceDue: number;
    shopAddress: string;
    shopTimings: string;
  }): Promise<CommunicationResult>;

  sendInvoice(data: {
    customerName: string;
    phone: string;
    invoiceNumber: string;
    jobNumber?: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    warrantyDurationDays: number;
  }): Promise<CommunicationResult>;

  sendPaymentConfirmation(data: {
    customerName: string;
    phone: string;
    receiptNumber: string;
    amount: number;
    paymentMode: string;
    remainingBalance: number;
  }): Promise<CommunicationResult>;
}
```

---

## 3. Communication Templates & Message Formatting

### 3.1 Admission Receipt Template (`ADMISSION_SLIP`)
```text
🔧 *KTech Computers - Service Admission Receipt*

Hello *{{customer_name}}*,
We have received your device for technical inspection and repair:

📋 *Job Card:* {{job_number}}
💻 *Equipment:* {{equipment_type}} - {{brand}} {{model}}
⚠️ *Reported Issue:* {{reported_issue}}
💰 *Estimated Cost:* ₹{{estimated_cost}}
💵 *Advance Paid:* ₹{{advance_deposit}}

Our technicians will perform a comprehensive diagnostic inspection. You will receive an update once diagnosis is complete.

📍 *KTech Computers*, 123 Tech Square, Main Road
📞 *Helpline:* +91 98765 43210
```

### 3.2 Quotation & Approval Request Template (`APPROVAL_REQUEST`)
```text
📊 *KTech Computers - Repair Estimate & Approval Request*

Hello *{{customer_name}}*,
Diagnosis for your *{{equipment_type}}* (*{{job_number}}*) is complete:

🔍 *Diagnostic Findings:* {{diagnosis_summary}}
⚙️ *Parts Required:* {{parts_list}}
💵 *Parts Total:* ₹{{parts_total}}
🛠️ *Labor / Service:* ₹{{labor_total}}
🏷️ *Grand Total Estimate:* *₹{{grand_total}}*

👉 *Please reply with "APPROVED" or call us at +91 98765 43210 to authorize repair.*
```

### 3.3 Ready for Delivery Template (`READY_FOR_PICKUP`)
```text
✅ *KTech Computers - Device Ready for Pickup!*

Hello *{{customer_name}}*,
Good news! Your *{{equipment_type}}* (*{{job_number}}*) has completed testing and is ready for collection:

📋 *Job Card:* {{job_number}}
✔️ *Status:* Quality Check Passed (All tests OK)
💰 *Total Bill:* ₹{{total_amount}}
💵 *Advance Adjusted:* ₹{{advance_adjusted}}
💳 *Balance Due:* *₹{{balance_due}}*

You can collect your device during shop hours (10:00 AM - 8:30 PM). Payment accepted via Cash / UPI / Card.

📍 *KTech Computers* | 📞 +91 98765 43210
```
