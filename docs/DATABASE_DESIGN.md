# KTech Computers - Relational Database Design (SQLite + Drizzle ORM)

**Database Engine:** SQLite 3 (WAL Mode, Foreign Keys Enforced)  
**ORM:** Drizzle ORM (TypeScript schema definitions & migrations)  

---

## 1. Complete Entity Matrix (45 Relational Tables)

| Domain Subsystem | Tables |
| :--- | :--- |
| **1. Identity, Access & Audit** | `users`, `roles`, `permissions`, `role_permissions`, `audit_logs`, `settings`, `backups` |
| **2. Customers & Equipment** | `customers`, `customer_addresses`, `devices`, `device_photos` |
| **3. Service Jobs & Diagnostics** | `service_jobs`, `job_inspections`, `job_diagnosis`, `job_services`, `job_parts`, `job_notes`, `job_attachments`, `job_repair_activities`, `job_checklists`, `job_tests`, `job_status_history` |
| **4. Quotations & Approvals** | `quotations`, `quotation_items`, `quotation_approvals` |
| **5. Data Recovery** | `data_recovery_jobs` |
| **6. Inventory & Salvage Engine** | `inventory_categories`, `inventory_items`, `inventory_transactions`, `inventory_locations`, `suppliers`, `salvage_devices`, `salvage_parts` |
| **7. Refurbished Sales** | `products`, `product_sales`, `product_sale_items` |
| **8. Custom PC Builder** | `pc_builds`, `pc_build_items` |
| **9. Billing, Invoices & Payments** | `invoices`, `invoice_items`, `payments` |
| **10. Warranties & Communications** | `warranties`, `warranty_jobs`, `communication_messages`, `communication_templates` |

---

## 2. Table Specifications & Schema Definitions

### 2.1 Identity, Access & Audit

#### `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | UUIDv4 identifier |
| `username` | `TEXT` | `NOT NULL UNIQUE` | Staff login username |
| `password_hash` | `TEXT` | `NOT NULL` | Argon2id / bcrypt hash |
| `pin_code` | `TEXT` | `NULL` | Optional 4-6 digit quick PIN |
| `full_name` | `TEXT` | `NOT NULL` | Employee full name |
| `role_id` | `TEXT` | `NOT NULL REFERENCES roles(id)` | Role link |
| `phone` | `TEXT` | `NULL` | Contact phone |
| `is_active` | `INTEGER` | `NOT NULL DEFAULT 1` | 1=Active, 0=Disabled |
| `commission_pct` | `REAL` | `NOT NULL DEFAULT 0.0` | Labor commission incentive % |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Timestamp |
| `updated_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Timestamp |

#### `roles`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | `OWNER`, `RECEPTION`, `TECHNICIAN`, `ACCOUNTS` |
| `name` | `TEXT` | `NOT NULL UNIQUE` | Display name |
| `description` | `TEXT` | `NULL` | Role scope |

#### `permissions` & `role_permissions`
- `permissions`: `id` (`PRIMARY KEY`), `code` (`NOT NULL UNIQUE`, e.g. `jobs.create`, `invoices.void`, `inventory.adjust`), `module`, `description`.
- `role_permissions`: `role_id REFERENCES roles(id)`, `permission_id REFERENCES permissions(id)`.

#### `audit_logs`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | UUIDv4 |
| `user_id` | `TEXT` | `NULL REFERENCES users(id)` | Acting employee |
| `action` | `TEXT` | `NOT NULL` | `CREATE`, `UPDATE`, `STATUS_CHANGE`, `VOID`, `LOGIN` |
| `entity_type` | `TEXT` | `NOT NULL` | `service_job`, `invoice`, `inventory`, `customer`, `setting` |
| `entity_id` | `TEXT` | `NOT NULL` | Affected record ID |
| `before_state` | `TEXT` | `NULL` | JSON snapshot of previous data state |
| `after_state` | `TEXT` | `NULL` | JSON snapshot of modified data state |
| `ip_address` | `TEXT` | `NULL` | Workstation ID |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Timestamp |

#### `settings` & `backups`
- `settings`: `key` (`PRIMARY KEY`), `value` (`TEXT`), `category`, `is_encrypted` (`INTEGER`), `updated_at`.
- `backups`: `id` (`PRIMARY KEY`), `backup_name`, `file_path`, `file_size_bytes`, `backup_type` (`AUTO`, `MANUAL`, `PRE_RESTORE`), `status`, `created_at`.

---

### 2.2 Customers & Equipment

#### `customers`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | UUIDv4 |
| `customer_code` | `TEXT` | `NOT NULL UNIQUE` | e.g. `CUST-10024` |
| `full_name` | `TEXT` | `NOT NULL` | Customer / Company name |
| `primary_phone` | `TEXT` | `NOT NULL` | Primary mobile number (Indexed) |
| `secondary_phone`| `TEXT` | `NULL` | Alternate contact number |
| `email` | `TEXT` | `NULL` | Email address |
| `gstin` | `TEXT` | `NULL` | GSTIN for corporate / B2B clients |
| `customer_type` | `TEXT` | `NOT NULL DEFAULT 'INDIVIDUAL'` | `INDIVIDUAL` or `COMMERCIAL` |
| `notes` | `TEXT` | `NULL` | Remarks / preferences |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Registration date |
| `updated_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Last updated |

#### `customer_addresses`
- `id` (`PRIMARY KEY`), `customer_id REFERENCES customers(id)`, `address_line1`, `address_line2`, `landmark`, `city`, `state`, `pincode`, `is_default` (`INTEGER`).

#### `devices`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | UUIDv4 |
| `customer_id` | `TEXT` | `NOT NULL REFERENCES customers(id)` | Owner link |
| `equipment_type` | `TEXT` | `NOT NULL` | `LAPTOP`, `DESKTOP`, `CUSTOM_PC`, `MONITOR`, `PRINTER`, `PLAYSTATION`, `XBOX`, `GAMING_CONSOLE`, `HDD`, `SSD`, `M_2`, `PEN_DRIVE`, `SMPS`, `POWER_SUPPLY`, `EV_CHARGER`, `ADAPTER`, `MOTHERBOARD`, `OTHER` |
| `brand` | `TEXT` | `NOT NULL` | e.g. Dell, Lenovo, HP, Sony, Asus, Corsair |
| `model_name` | `TEXT` | `NOT NULL` | e.g. ThinkPad T14, PS5 Digital, SMPS 750W |
| `serial_number` | `TEXT` | `NULL` | Serial / Service Tag / IMEI (Indexed) |
| `color_finish` | `TEXT` | `NULL` | Device color |
| `encrypted_security_passcode`| `TEXT` | `NULL` | Encrypted vault storage (AES-256-GCM); access is role-gated & audit logged |
| `specs_summary` | `TEXT` | `NULL` | Specs summary string |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Intake timestamp |

#### `device_photos`
- `id` (`PRIMARY KEY`), `device_id REFERENCES devices(id)`, `job_id REFERENCES service_jobs(id)`, `photo_type` (`INTAKE_CONDITION`, `DAMAGE_PROOF`, `COMPLETED_REPAIR`), `file_path`, `caption`, `created_at`.

---

### 2.3 Service Jobs & Diagnostics

#### `service_jobs`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | UUIDv4 |
| `job_number` | `TEXT` | `NOT NULL UNIQUE` | e.g. `JOB-2026-00042` |
| `customer_id` | `TEXT` | `NOT NULL REFERENCES customers(id)` | Customer link |
| `device_id` | `TEXT` | `NOT NULL REFERENCES devices(id)` | Equipment link |
| `service_category`| `TEXT` | `NOT NULL` | `CHIP_LEVEL`, `HARDWARE_REPLACEMENT`, `OS_SOFTWARE`, `GENERAL_SERVICE`, `DATA_RECOVERY`, `POWER_ELECTRONICS`, `CONSOLE_REPAIR`, `PRINTER_SERVICE`, `CUSTOM_BUILD` |
| `current_status` | `TEXT` | `NOT NULL` | See State Machine |
| `priority` | `TEXT` | `NOT NULL DEFAULT 'NORMAL'` | `LOW`, `NORMAL`, `URGENT`, `CRITICAL` |
| `assigned_technician_id` | `TEXT` | `NULL REFERENCES users(id)` | Assigned technician |
| `reported_issue` | `TEXT` | `NOT NULL` | Customer's primary complaint |
| `accessories_received` | `TEXT` | `NULL` | JSON array (e.g. `["CHARGER", "BAG", "POWER_CORD"]`) |
| `physical_condition_notes`| `TEXT` | `NULL` | Scratches, cracks, liquid markers |
| `estimated_cost` | `REAL` | `NOT NULL DEFAULT 0.0` | Initial estimate |
| `advance_deposit` | `REAL` | `NOT NULL DEFAULT 0.0` | Deposit paid at intake |
| `promised_delivery_date` | `TEXT` | `NULL` | Commitment date |
| `actual_delivery_date` | `TEXT` | `NULL` | Handover timestamp |
| `is_warranty_job` | `INTEGER` | `NOT NULL DEFAULT 0` | 1 if claimed under warranty |
| `parent_warranty_id` | `TEXT` | `NULL REFERENCES warranties(id)` | Link to warranty |
| `created_by` | `TEXT` | `NOT NULL REFERENCES users(id)` | Intake receptionist |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Intake timestamp |
| `updated_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Last updated |

#### `job_status_history`
- `id` (`PRIMARY KEY`), `job_id REFERENCES service_jobs(id)`, `previous_status`, `new_status`, `changed_by REFERENCES users(id)`, `reason_or_notes`, `created_at`.

#### `job_inspections` & `job_diagnosis`
- `job_inspections`: `id`, `job_id REFERENCES service_jobs(id)`, `inspected_by REFERENCES users(id)`, `power_status`, `display_status`, `motherboard_status`, `body_condition`, `water_damage_detected` (`INTEGER`), `short_circuit_detected` (`INTEGER`), `inspection_notes`, `created_at`.
- `job_diagnosis`: `id`, `job_id REFERENCES service_jobs(id)`, `technician_id REFERENCES users(id)`, `root_cause_analysis`, `voltage_rails_checked` (JSON), `faulty_components_identified`, `recommended_action`, `created_at`.

#### `job_services` & `job_parts`
- `job_services`: `id`, `job_id REFERENCES service_jobs(id)`, `service_name`, `sac_code`, `labor_charge`, `discount`, `tax_rate`, `created_at`.
- `job_parts`: `id`, `job_id REFERENCES service_jobs(id)`, `inventory_item_id REFERENCES inventory_items(id)`, `part_name`, `serial_number`, `quantity`, `unit_cost_price`, `unit_selling_price`, `hsn_code`, `tax_rate`, `warranty_months`, `created_at`.

#### `job_notes`, `job_attachments`, `job_repair_activities`, `job_checklists`, `job_tests`
- `job_repair_activities`: `id`, `job_id`, `technician_id`, `activity_title`, `description`, `time_spent_minutes`, `created_at`.
- `job_notes`: `id`, `job_id`, `user_id`, `note_type` (`INTERNAL`, `CUSTOMER_FACING`), `content`, `created_at`.
- `job_attachments`: `id`, `job_id`, `file_name`, `file_path`, `file_type`, `file_size_bytes`, `created_at`.
- `job_checklists`: `id`, `job_id`, `checklist_item_name`, `is_checked` (`INTEGER`), `checked_by`, `checked_at`.
- `job_tests`: `id`, `job_id`, `tested_by`, `test_type` (`BOOT_TEST`, `STRESS_TEST`, `WIFI_TEST`, `KEYBOARD_TEST`, `AUDIO_TEST`, `CHARGING_TEST`, `PORTS_TEST`), `result` (`PASSED`, `FAILED`, `NOT_APPLICABLE`), `notes`, `created_at`.

---

### 2.4 Quotations & Explicit Approvals

#### `quotations`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | UUIDv4 |
| `quotation_number`| `TEXT` | `NOT NULL UNIQUE` | e.g. `EST-2026-00089` |
| `job_id` | `TEXT` | `NOT NULL REFERENCES service_jobs(id)` | Parent job |
| `parts_subtotal` | `REAL` | `NOT NULL DEFAULT 0.0` | Parts total |
| `labor_subtotal` | `REAL` | `NOT NULL DEFAULT 0.0` | Labor total |
| `discount_amount`| `REAL` | `NOT NULL DEFAULT 0.0` | Discount |
| `tax_amount` | `REAL` | `NOT NULL DEFAULT 0.0` | Calculated GST |
| `total_amount` | `REAL` | `NOT NULL` | Grand total estimate |
| `status` | `TEXT` | `NOT NULL DEFAULT 'PENDING'` | `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED` |
| `validity_days` | `INTEGER` | `NOT NULL DEFAULT 7` | Validity in days |
| `created_by` | `TEXT` | `NOT NULL REFERENCES users(id)` | Estimator staff |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Timestamp |

#### `quotation_items`
- `id` (`PRIMARY KEY`), `quotation_id REFERENCES quotations(id)`, `item_type` (`PART`, `LABOR`, `OTHER`), `inventory_item_id REFERENCES inventory_items(id)`, `description`, `quantity`, `unit_price`, `tax_rate`, `total_price`.

#### `quotation_approvals`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | UUIDv4 |
| `quotation_id` | `TEXT` | `NOT NULL REFERENCES quotations(id)` | Parent quotation |
| `job_id` | `TEXT` | `NOT NULL REFERENCES service_jobs(id)` | Parent job |
| `approved_amount`| `REAL` | `NOT NULL` | Exact approved figure |
| `approval_status`| `TEXT` | `NOT NULL` | `APPROVED`, `PARTIAL_APPROVAL`, `REJECTED` |
| `approval_method`| `TEXT` | `NOT NULL` | `WHATSAPP`, `PHONE_CALL`, `IN_PERSON`, `EMAIL`, `OTHER` |
| `customer_contact_used` | `TEXT` | `NOT NULL` | Phone / email communicated on |
| `recorded_by_user_id` | `TEXT` | `NOT NULL REFERENCES users(id)` | Staff member who took approval |
| `approval_timestamp` | `TEXT` | `NOT NULL` | Date/time approval was granted |
| `notes` | `TEXT` | `NULL` | Customer remarks or conditions |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Created timestamp |

---

### 2.5 Dedicated Data Recovery Subsystem

#### `data_recovery_jobs`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | UUIDv4 |
| `service_job_id` | `TEXT` | `NOT NULL UNIQUE REFERENCES service_jobs(id)` | Parent service job |
| `storage_type` | `TEXT` | `NOT NULL` | `HDD_2_5`, `HDD_3_5`, `SATA_SSD`, `NVME_SSD`, `PEN_DRIVE`, `SD_CARD`, `OTHER` |
| `capacity_gb` | `INTEGER` | `NOT NULL` | Drive capacity in GB |
| `file_system` | `TEXT` | `NULL` | NTFS, FAT32, exFAT, APFS, EXT4, RAW |
| `detection_status` | `TEXT` | `NOT NULL` | `DETECTED_NORMAL`, `DETECTED_WRONG_SIZE`, `NOT_DETECTED`, `BUSY_HANG`, `CLICKING_NOISE` |
| `damage_type` | `TEXT` | `NOT NULL` | `LOGICAL_DELETION`, `FORMATTED_RAW`, `FIRMWARE_CORRUPTION`, `BAD_SECTORS`, `PCB_FAILURE`, `HEAD_MOTOR_CRASH` |
| `recovery_complexity` | `TEXT` | `NOT NULL` | `LEVEL_1_LOGICAL`, `LEVEL_2_FIRMWARE_PCB`, `LEVEL_3_CLEANROOM_HEAD_SWAP` |
| `target_data_description`| `TEXT` | `NULL` | Priority folders / file extensions |
| `destination_media_type` | `TEXT` | `NOT NULL` | `CUSTOMER_PROVIDED_DRIVE`, `PURCHASED_NEW_DRIVE`, `CLOUD_TRANSFER` |
| `destination_media_details`| `TEXT` | `NULL` | Serial number / capacity of destination drive |
| `recovered_size_gb` | `REAL` | `NOT NULL DEFAULT 0.0` | Size of recovered data |
| `recovery_outcome` | `TEXT` | `NOT NULL DEFAULT 'ASSESSMENT'` | `ASSESSMENT`, `FULL_RECOVERY`, `PARTIAL_RECOVERY`, `UNSUCCESSFUL` |
| `disclaimer_acknowledged` | `INTEGER` | `NOT NULL DEFAULT 1` | Mandatory risk consent flag |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Intake timestamp |

---

### 2.6 Inventory & Salvage Engine

#### `inventory_categories` & `inventory_locations`
- `inventory_categories`: `id`, `name`, `code` (e.g. `RAM`, `SSD`, `PANEL`, `IC`, `KEYBOARD`, `BATTERY`, `SMPS_PART`, `CONSOLES`), `description`.
- `inventory_locations`: `id`, `name` (e.g. `Main Rack A1`, `Chip Drawer B3`, `Salvage Bin 2`), `description`.

#### `inventory_items`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | UUIDv4 |
| `sku` | `TEXT` | `NOT NULL UNIQUE` | Stock Keeping Unit |
| `name` | `TEXT` | `NOT NULL` | Item description |
| `category_id` | `TEXT` | `NOT NULL REFERENCES inventory_categories(id)` | Category link |
| `item_type` | `TEXT` | `NOT NULL` | `NEW_SPARE_PART`, `USED_PART`, `SALVAGED_PART`, `FINISHED_PRODUCT`, `CONSUMABLE` |
| `serial_number` | `TEXT` | `NULL` | Serial number (if serialized) |
| `cost_price` | `REAL` | `NOT NULL DEFAULT 0.0` | Acquisition cost |
| `selling_price` | `REAL` | `NOT NULL DEFAULT 0.0` | Retail/service price |
| `hsn_code` | `TEXT` | `NULL` | GST HSN code |
| `tax_rate` | `REAL` | `NOT NULL DEFAULT 18.0` | GST % |
| `quantity_on_hand`| `INTEGER` | `NOT NULL DEFAULT 0` | Available stock count |
| `min_reorder_level`| `INTEGER` | `NOT NULL DEFAULT 2` | Low-stock threshold |
| `location_id` | `TEXT` | `NULL REFERENCES inventory_locations(id)` | Physical bin location |
| `supplier_id` | `TEXT` | `NULL REFERENCES suppliers(id)` | Supplier reference |
| `salvage_source_id`| `TEXT` | `NULL REFERENCES salvage_devices(id)` | If recovered from salvage |
| `warranty_months`| `INTEGER` | `NOT NULL DEFAULT 0` | Supplier warranty duration |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Created timestamp |

#### `inventory_transactions`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | UUIDv4 |
| `item_id` | `TEXT` | `NOT NULL REFERENCES inventory_items(id)` | Item reference |
| `transaction_type`| `TEXT` | `NOT NULL` | `PURCHASE_IN`, `JOB_CONSUMPTION`, `DIRECT_SALE`, `SALVAGE_IN`, `RETURN_TO_SUPPLIER`, `DEFECTIVE_SCRAP`, `AUDIT_ADJUSTMENT` |
| `quantity_delta` | `INTEGER` | `NOT NULL` | Positive or negative delta |
| `balance_after` | `INTEGER` | `NOT NULL` | Resulting stock balance |
| `reference_type` | `TEXT` | `NOT NULL` | `SERVICE_JOB`, `INVOICE`, `SALVAGE_DEVICE`, `SUPPLIER_PURCHASE`, `MANUAL` |
| `reference_id` | `TEXT` | `NULL` | Associated ID |
| `notes` | `TEXT` | `NULL` | Reason / remarks |
| `created_by` | `TEXT` | `NOT NULL REFERENCES users(id)` | Staff member |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Timestamp |

#### `suppliers`, `salvage_devices`, `salvage_parts`
- `suppliers`: `id`, `company_name`, `contact_person`, `phone`, `email`, `gstin`, `address`, `created_at`.
- `salvage_devices`: `id`, `salvage_code` (`NOT NULL UNIQUE`, e.g. `SALV-00042`), `original_service_job_id REFERENCES service_jobs(id)`, `equipment_type`, `brand`, `model_name`, `serial_number`, `acquisition_type`, `acquisition_cost`, `dismantled_by REFERENCES users(id)`, `notes`, `created_at`.
- `salvage_parts`: `id`, `salvage_device_id REFERENCES salvage_devices(id)`, `inventory_item_id REFERENCES inventory_items(id)`, `part_name`, `serial_number`, `tested_condition`, `estimated_value`, `created_at`.

---

### 2.7 Refurbished Products & Sales

#### `products`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | UUIDv4 |
| `product_code` | `TEXT` | `NOT NULL UNIQUE` | e.g. `REFURB-LAP-0012` |
| `product_type` | `TEXT` | `NOT NULL` | `REFURBISHED_LAPTOP`, `REFURBISHED_DESKTOP`, `REFURBISHED_MONITOR`, `REFURBISHED_CONSOLE`, `RETAIL_COMPONENT` |
| `brand` | `TEXT` | `NOT NULL` | Brand |
| `model_name` | `TEXT` | `NOT NULL` | Model name |
| `serial_number` | `TEXT` | `NULL` | Serial / Service Tag |
| `specs` | `TEXT` | `NOT NULL` | Detailed specs (RAM/Storage/GPU) |
| `cosmetic_grade` | `TEXT` | `NOT NULL DEFAULT 'GRADE_A'` | `GRADE_A_EXCELLENT`, `GRADE_B_GOOD`, `GRADE_C_FAIR` |
| `acquisition_cost`| `REAL` | `NOT NULL DEFAULT 0.0` | Purchase cost |
| `refurb_cost_spent`| `REAL` | `NOT NULL DEFAULT 0.0` | Cost of parts/labor spent refurbishing |
| `selling_price` | `REAL` | `NOT NULL` | Retail selling price |
| `status` | `TEXT` | `NOT NULL DEFAULT 'IN_STOCK'` | `IN_STOCK`, `UNDER_REFURBISHMENT`, `READY_FOR_SALE`, `RESERVED`, `SOLD`, `RETURNED` |
| `warranty_months`| `INTEGER` | `NOT NULL DEFAULT 3` | Warranty in months |
| `sold_to_customer_id` | `TEXT` | `NULL REFERENCES customers(id)` | Purchaser link |
| `sales_invoice_id` | `TEXT` | `NULL REFERENCES invoices(id)` | Sales invoice link |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Intake date |

#### `product_sales` & `product_sale_items`
- `product_sales`: `id`, `sale_number` (`NOT NULL UNIQUE`), `customer_id REFERENCES customers(id)`, `invoice_id REFERENCES invoices(id)`, `total_amount`, `created_at`.
- `product_sale_items`: `id`, `sale_id REFERENCES product_sales(id)`, `product_id REFERENCES products(id)`, `inventory_item_id REFERENCES inventory_items(id)`, `unit_price`, `quantity`, `tax_rate`, `total_amount`.

---

### 2.8 Custom PC Builder Module

#### `pc_builds` & `pc_build_items`
- `pc_builds`:
  - `id` (`PRIMARY KEY`), `build_number` (`NOT NULL UNIQUE`, e.g. `BUILD-2026-00015`), `customer_id REFERENCES customers(id)`, `build_name` (e.g. "Core i7 RTX 4070 Gaming Rig"), `target_budget`, `parts_cost`, `parts_price`, `assembly_labor_fee`, `discount_amount`, `tax_amount`, `final_quoted_price`, `status` (`DRAFT`, `QUOTED`, `APPROVED_ASSEMBLING`, `TESTING`, `DELIVERED`, `CANCELLED`), `created_by REFERENCES users(id)`, `created_at`.
- `pc_build_items`:
  - `id` (`PRIMARY KEY`), `pc_build_id REFERENCES pc_builds(id)`, `component_slot` (`CPU`, `MOTHERBOARD`, `RAM`, `GPU`, `SSD`, `HDD`, `PSU`, `CABINET`, `COOLER`, `MONITOR`, `KEYBOARD`, `MOUSE`, `OS`, `OTHER`), `inventory_item_id REFERENCES inventory_items(id)`, `item_name`, `specs`, `quantity`, `unit_cost`, `unit_price`, `tax_rate`, `created_at`.

---

### 2.9 Billing, Invoices & Payments

#### `invoices`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | UUIDv4 |
| `invoice_number` | `TEXT` | `NOT NULL UNIQUE` | e.g. `INV-2026-00145` |
| `invoice_type` | `TEXT` | `NOT NULL` | `SERVICE_REPAIR`, `RETAIL_SALE`, `PC_BUILD`, `DATA_RECOVERY` |
| `customer_id` | `TEXT` | `NOT NULL REFERENCES customers(id)` | Customer link |
| `service_job_id` | `TEXT` | `NULL REFERENCES service_jobs(id)` | Associated job if service |
| `is_gst_invoice` | `INTEGER` | `NOT NULL DEFAULT 1` | 1=Tax Invoice, 0=Bill of Supply |
| `customer_gstin` | `TEXT` | `NULL` | Customer GSTIN |
| `subtotal_parts` | `REAL` | `NOT NULL DEFAULT 0.0` | Parts total |
| `subtotal_labor` | `REAL` | `NOT NULL DEFAULT 0.0` | Labor total |
| `discount_amount`| `REAL` | `NOT NULL DEFAULT 0.0` | Discount |
| `cgst_amount` | `REAL` | `NOT NULL DEFAULT 0.0` | Central GST |
| `sgst_amount` | `REAL` | `NOT NULL DEFAULT 0.0` | State GST |
| `igst_amount` | `REAL` | `NOT NULL DEFAULT 0.0` | Integrated GST |
| `total_amount` | `REAL` | `NOT NULL` | Grand total payable |
| `advance_adjusted`| `REAL` | `NOT NULL DEFAULT 0.0` | Deducted advance deposit |
| `amount_paid` | `REAL` | `NOT NULL DEFAULT 0.0` | Total settled |
| `balance_due` | `REAL` | `NOT NULL DEFAULT 0.0` | Remaining unpaid balance |
| `payment_status` | `TEXT` | `NOT NULL DEFAULT 'UNPAID'` | `UNPAID`, `PARTIALLY_PAID`, `PAID`, `REFUNDED` |
| `is_void` | `INTEGER` | `NOT NULL DEFAULT 0` | 1 if voided |
| `void_reason` | `TEXT` | `NULL` | Reason if voided |
| `created_by` | `TEXT` | `NOT NULL REFERENCES users(id)` | Staff member |
| `created_at` | `TEXT` | `NOT NULL DEFAULT (CURRENT_TIMESTAMP)` | Invoice date |

#### `invoice_items` & `payments`
- `invoice_items`: `id`, `invoice_id REFERENCES invoices(id)`, `item_type` (`SERVICE_LABOR`, `SPARE_PART`, `REFURBISHED_PRODUCT`, `PC_COMPONENT`), `item_ref_id`, `description`, `hsn_sac_code`, `quantity`, `unit_price`, `discount`, `tax_rate`, `tax_amount`, `total_amount`.
- `payments`: `id` (`PRIMARY KEY`), `receipt_number` (`NOT NULL UNIQUE`), `invoice_id REFERENCES invoices(id)`, `service_job_id REFERENCES service_jobs(id)`, `customer_id REFERENCES customers(id)`, `payment_type` (`ADVANCE_DEPOSIT`, `INVOICE_SETTLEMENT`, `PARTIAL_PAYMENT`, `REFUND`), `payment_mode` (`CASH`, `UPI_QR`, `CREDIT_CARD`, `DEBIT_CARD`, `BANK_TRANSFER`), `transaction_reference`, `amount`, `received_by REFERENCES users(id)`, `payment_date`.

---

### 2.10 Warranties & Communications

#### `warranties` & `warranty_jobs`
- `warranties`:
  - `id` (`PRIMARY KEY`), `warranty_code` (`NOT NULL UNIQUE`, e.g. `WAR-2026-00054`), `customer_id REFERENCES customers(id)`, `device_id REFERENCES devices(id)`, `original_job_id REFERENCES service_jobs(id)`, `original_invoice_id REFERENCES invoices(id)`, `product_id REFERENCES products(id)`, `warranty_type` (`SERVICE_REPAIR_WARRANTY`, `SPARE_PART_WARRANTY`, `REFURBISHED_PRODUCT_WARRANTY`), `start_date` (`NOT NULL`), `expiry_date` (`NOT NULL`), `duration_days` (`NOT NULL`), `covered_scope` (`NOT NULL`), `terms_and_exclusions`, `status` (`ACTIVE`, `EXPIRED`, `VOIDED_TAMPERED`), `created_at`.
- `warranty_jobs`:
  - `id` (`PRIMARY KEY`), `warranty_id REFERENCES warranties(id)`, `warranty_claim_job_id REFERENCES service_jobs(id)`, `claim_date`, `claim_issue_reported`, `resolution_type` (`FREE_RE_REPAIR`, `PART_REPLACEMENT_RMA`, `REJECTED_OUT_OF_SCOPE`), `notes`, `created_at`.

#### `communication_messages` & `communication_templates`
- `communication_templates`: `id`, `template_key` (`ADMISSION_SLIP`, `ESTIMATE_QUOTE`, `APPROVAL_REQUEST`, `REPAIR_UPDATE`, `WAITING_PARTS`, `READY_FOR_PICKUP`, `INVOICE_BILL`), `name`, `template_body`, `variables_json`, `is_active`.
- `communication_messages`: `id`, `customer_id REFERENCES customers(id)`, `service_job_id REFERENCES service_jobs(id)`, `channel` (`WHATSAPP_API`, `WHATSAPP_DEEP_LINK`, `SMS`), `recipient_phone`, `template_key`, `message_payload`, `dispatch_status` (`PENDING`, `SENDING`, `SENT`, `DELIVERED`, `FAILED`), `retry_count`, `last_error`, `sent_at`, `created_at`.
