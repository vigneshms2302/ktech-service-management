# KTech Computers - Entity Relationship (ER) Diagrams

This document visualizes the complete relational data architecture of the KTech Computers internal desktop application across all 10 domain subsystems.

---

## 1. High-Level Subsystems Overview

```mermaid
erDiagram
    USERS ||--o{ SERVICE_JOBS : "creates / assigns"
    USERS ||--o{ AUDIT_LOGS : "triggers"
    USERS ||--o{ INVOICES : "issues"
    USERS ||--o{ PAYMENTS : "collects"
    
    CUSTOMERS ||--|{ CUSTOMER_ADDRESSES : "has"
    CUSTOMERS ||--o{ DEVICES : "owns"
    CUSTOMERS ||--o{ SERVICE_JOBS : "places"
    CUSTOMERS ||--o{ INVOICES : "billed to"
    CUSTOMERS ||--o{ WARRANTIES : "holds"
    
    DEVICES ||--o{ SERVICE_JOBS : "serviced in"
    DEVICES ||--o{ DEVICE_PHOTOS : "has"
    
    SERVICE_JOBS ||--o{ JOB_INSPECTIONS : "inspects"
    SERVICE_JOBS ||--o{ JOB_DIAGNOSIS : "diagnoses"
    SERVICE_JOBS ||--o{ JOB_PARTS : "consumes"
    SERVICE_JOBS ||--o{ JOB_SERVICES : "includes"
    SERVICE_JOBS ||--o{ JOB_STATUS_HISTORY : "tracks"
    SERVICE_JOBS ||--o{ QUOTATIONS : "generates"
    SERVICE_JOBS ||--o{ INVOICES : "billed via"
    SERVICE_JOBS ||--o| DATA_RECOVERY_JOBS : "specializes in"
    SERVICE_JOBS ||--o| SALVAGE_DEVICES : "salvaged into"
    
    QUOTATIONS ||--|{ QUOTATION_ITEMS : "contains"
    QUOTATIONS ||--o{ QUOTATION_APPROVALS : "approved by"
    
    INVENTORY_ITEMS ||--o{ JOB_PARTS : "used in"
    INVENTORY_ITEMS ||--o{ INVENTORY_TRANSACTIONS : "tracked by"
    INVENTORY_ITEMS ||--o{ PC_BUILD_ITEMS : "selected in"
    
    SALVAGE_DEVICES ||--|{ SALVAGE_PARTS : "yields"
    SALVAGE_PARTS ||--|| INVENTORY_ITEMS : "becomes"
    
    INVOICES ||--|{ INVOICE_ITEMS : "contains"
    INVOICES ||--o{ PAYMENTS : "settled by"
    INVOICES ||--o{ WARRANTIES : "creates"
    
    WARRANTIES ||--o{ WARRANTY_JOBS : "claims"
    WARRANTY_JOBS ||--|| SERVICE_JOBS : "executes"
```

---

## 2. Core Service Job & Diagnostics ERD

```mermaid
erDiagram
    CUSTOMERS {
        string id PK
        string customer_code UK
        string full_name
        string primary_phone
        string email
        string gstin
        string customer_type
    }

    DEVICES {
        string id PK
        string customer_id FK
        string equipment_type
        string brand
        string model_name
        string serial_number
        string security_passcode
        string specs_summary
    }

    SERVICE_JOBS {
        string id PK
        string job_number UK
        string customer_id FK
        string device_id FK
        string service_category
        string current_status
        string priority
        string assigned_technician_id FK
        float estimated_cost
        float advance_deposit
        int is_warranty_job
        string parent_warranty_id FK
    }

    JOB_STATUS_HISTORY {
        string id PK
        string job_id FK
        string previous_status
        string new_status
        string changed_by FK
        string reason_or_notes
        datetime created_at
    }

    JOB_INSPECTIONS {
        string id PK
        string job_id FK
        string inspected_by FK
        string power_status
        string display_status
        int water_damage_detected
        int short_circuit_detected
    }

    JOB_DIAGNOSIS {
        string id PK
        string job_id FK
        string technician_id FK
        string root_cause_analysis
        string faulty_components_identified
        string recommended_action
    }

    JOB_PARTS {
        string id PK
        string job_id FK
        string inventory_item_id FK
        string part_name
        int quantity
        float unit_cost_price
        float unit_selling_price
    }

    JOB_SERVICES {
        string id PK
        string job_id FK
        string service_name
        float labor_charge
        float tax_rate
    }

    CUSTOMERS ||--o{ DEVICES : "owns"
    CUSTOMERS ||--o{ SERVICE_JOBS : "places"
    DEVICES ||--o{ SERVICE_JOBS : "serviced in"
    SERVICE_JOBS ||--o{ JOB_STATUS_HISTORY : "tracks"
    SERVICE_JOBS ||--o{ JOB_INSPECTIONS : "inspected"
    SERVICE_JOBS ||--o{ JOB_DIAGNOSIS : "diagnosed"
    SERVICE_JOBS ||--o{ JOB_PARTS : "uses"
    SERVICE_JOBS ||--o{ JOB_SERVICES : "bills"
```

---

## 3. Quotations, Customer Approvals & Invoicing ERD

```mermaid
erDiagram
    SERVICE_JOBS ||--o{ QUOTATIONS : "generates"
    QUOTATIONS ||--|{ QUOTATION_ITEMS : "lists"
    QUOTATIONS ||--o{ QUOTATION_APPROVALS : "approved by"
    
    SERVICE_JOBS ||--o{ INVOICES : "billed into"
    INVOICES ||--|{ INVOICE_ITEMS : "details"
    INVOICES ||--o{ PAYMENTS : "paid with"
    
    QUOTATIONS {
        string id PK
        string quotation_number UK
        string job_id FK
        float parts_subtotal
        float labor_subtotal
        float tax_amount
        float total_amount
        string status
    }

    QUOTATION_APPROVALS {
        string id PK
        string quotation_id FK
        string job_id FK
        float approved_amount
        string approval_status
        string approval_method
        string customer_contact_used
        string recorded_by_user_id FK
        datetime approval_timestamp
        string notes
    }

    INVOICES {
        string id PK
        string invoice_number UK
        string customer_id FK
        string service_job_id FK
        int is_gst_invoice
        float subtotal_parts
        float subtotal_labor
        float cgst_amount
        float sgst_amount
        float total_amount
        float balance_due
        string payment_status
    }

    PAYMENTS {
        string id PK
        string receipt_number UK
        string invoice_id FK
        string service_job_id FK
        string customer_id FK
        string payment_type
        string payment_mode
        float amount
        datetime payment_date
    }
```

---

## 4. Inventory, Salvage & Refurbished Products ERD

```mermaid
erDiagram
    INVENTORY_CATEGORIES ||--o{ INVENTORY_ITEMS : "categorizes"
    INVENTORY_LOCATIONS ||--o{ INVENTORY_ITEMS : "stores"
    SUPPLIERS ||--o{ INVENTORY_ITEMS : "supplies"
    INVENTORY_ITEMS ||--o{ INVENTORY_TRANSACTIONS : "logs"
    
    SERVICE_JOBS ||--o| SALVAGE_DEVICES : "unrepairable converted to"
    SALVAGE_DEVICES ||--|{ SALVAGE_PARTS : "harvested into"
    SALVAGE_PARTS ||--|| INVENTORY_ITEMS : "restocked as used part"
    
    PRODUCTS ||--o{ PRODUCT_SALES : "sold in"
    
    SALVAGE_DEVICES {
        string id PK
        string salvage_code UK
        string original_service_job_id FK
        string equipment_type
        string brand
        string model_name
        string acquisition_type
        float acquisition_cost
    }

    SALVAGE_PARTS {
        string id PK
        string salvage_device_id FK
        string inventory_item_id FK
        string part_name
        string tested_condition
        float estimated_value
    }

    INVENTORY_ITEMS {
        string id PK
        string sku UK
        string name
        string item_type
        string serial_number
        float cost_price
        float selling_price
        int quantity_on_hand
        int min_reorder_level
        string salvage_source_id FK
    }

    PRODUCTS {
        string id PK
        string product_code UK
        string product_type
        string specs
        string cosmetic_grade
        float acquisition_cost
        float selling_price
        string status
        int warranty_months
    }
```

---

## 5. Warranties & Communications ERD

```mermaid
erDiagram
    INVOICES ||--o{ WARRANTIES : "issues"
    WARRANTIES ||--o{ WARRANTY_JOBS : "invokes"
    SERVICE_JOBS ||--o{ WARRANTY_JOBS : "creates warranty repair"
    
    SERVICE_JOBS ||--o{ COMMUNICATION_MESSAGES : "notifies"
    COMMUNICATION_TEMPLATES ||--o{ COMMUNICATION_MESSAGES : "formats"
    
    WARRANTIES {
        string id PK
        string warranty_code UK
        string customer_id FK
        string device_id FK
        string original_job_id FK
        string original_invoice_id FK
        datetime start_date
        datetime expiry_date
        int duration_days
        string covered_scope
        string status
    }

    WARRANTY_JOBS {
        string id PK
        string warranty_id FK
        string warranty_claim_job_id FK
        string claim_issue_reported
        string resolution_type
    }

    COMMUNICATION_MESSAGES {
        string id PK
        string customer_id FK
        string service_job_id FK
        string channel
        string template_key
        string dispatch_status
        datetime sent_at
    }
```
