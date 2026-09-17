export type RoleId = 'ROLE_OWNER' | 'ROLE_RECEPTION' | 'ROLE_TECHNICIAN' | 'ROLE_ACCOUNTS';

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  roleId: RoleId;
  roleName: string;
  phone?: string | null;
  commissionPct: number;
  permissions: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
}

export interface SystemHealth {
  databaseStatus: string;
  databasePath: string;
  databaseSizeBytes: number;
  tableCount: number;
  expectedTableCount: number;
  userCount: number;
  jobCount: number;
  customerCount: number;
  auditLogCount: number;
  backupCount: number;
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string;
  username?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: string | null;
  afterState: string | null;
  ipAddress: string | null;
  createdAt: string;
}

// Simplified Equipment Types: Laptop, Computer, Mobile, and Custom Other
export type EquipmentType =
  | 'LAPTOP'
  | 'COMPUTER'
  | 'MOBILE'
  | 'DESKTOP'
  | 'OTHER'
  | string;

export interface CustomerSummary {
  id: string;
  customerCode: string;
  fullName: string;
  primaryPhone: string;
  secondaryPhone?: string | null;
  email?: string | null;
  gstin?: string | null;
  customerType: 'INDIVIDUAL' | 'COMMERCIAL';
  notes?: string | null;
  deviceCount: number;
  totalJobsCount: number;
  activeJobsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode?: string | null;
}

export interface CustomerProfileData {
  customer: {
    id: string;
    customerCode: string;
    fullName: string;
    primaryPhone: string;
    secondaryPhone?: string | null;
    email?: string | null;
    gstin?: string | null;
    customerType: 'INDIVIDUAL' | 'COMMERCIAL';
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  address: CustomerAddress | null;
  devices: Array<{
    id: string;
    customerId: string;
    equipmentType: EquipmentType;
    brand: string;
    modelName: string;
    serialNumber?: string | null;
    colorFinish?: string | null;
    specsSummary?: string | null;
    hasPasscode: boolean;
    jobCount: number;
    createdAt: string;
  }>;
  jobs: Array<{
    id: string;
    jobNumber: string;
    serviceCategory: string;
    currentStatus: string;
    priority: string;
    reportedIssue: string;
    deviceBrand: string;
    deviceModel: string;
    equipmentType: EquipmentType;
    technicianName?: string | null;
    createdAt: string;
  }>;
}

export interface CustomerDuplicateCandidate {
  id: string;
  customerCode: string;
  fullName: string;
  primaryPhone: string;
  email: string | null;
  matchType: 'EXACT_PHONE' | 'NORMALIZED_PHONE' | 'EMAIL' | 'NAME';
  matchReason: string;
}

export interface DeviceDuplicateCandidate {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  equipmentType: EquipmentType;
  brand: string;
  modelName: string;
  serialNumber: string | null;
  matchType: 'SERIAL_NUMBER' | 'MODEL_NAME';
  matchReason: string;
}

export interface ServiceJobSummary {
  id: string;
  jobNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerCode?: string;
  deviceId: string;
  equipmentType: EquipmentType;
  deviceBrand: string;
  deviceModel: string;
  deviceSerial?: string | null;
  serviceCategory: string;
  currentStatus: string;
  priority: 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL';
  assignedTechnicianId?: string | null;
  technicianName?: string | null;
  creatorName: string;
  reportedIssue: string;
  accessoriesReceived: string[];
  estimatedCost: number;
  advanceDeposit: number;
  promisedDeliveryDate?: string | null;
  createdAt: string;
}

// Phase 3 Technician Domain Interfaces
export interface JobDiagnosisData {
  id: string;
  jobId: string;
  technicianId: string;
  technicianName: string;
  rootCauseAnalysis: string;
  voltageRailsChecked?: string | null;
  faultyComponentsIdentified?: string | null;
  recommendedAction?: string | null;
  createdAt: string;
}

export interface JobRepairPlanItem {
  id: string;
  jobId: string;
  serviceName: string;
  sacCode?: string | null;
  laborCharge: number;
  discount: number;
  taxRate: number;
  createdAt: string;
}

export interface JobRequiredPart {
  id: string;
  jobId: string;
  inventoryItemId?: string | null;
  partName: string;
  serialNumber?: string | null;
  quantity: number;
  unitCostPrice: number;
  unitSellingPrice: number;
  hsnCode?: string | null;
  taxRate: number;
  warrantyMonths: number;
  createdAt: string;
}

export interface JobRepairActivity {
  id: string;
  jobId: string;
  technicianId: string;
  technicianName: string;
  activityTitle: string;
  description?: string | null;
  timeSpentMinutes: number;
  createdAt: string;
}

export interface JobAttachmentData {
  id: string;
  jobId: string;
  fileName: string;
  filePath: string;
  fileType?: string | null;
  fileSizeBytes: number;
  createdAt: string;
}

export interface JobChecklistItem {
  id: string;
  jobId: string;
  checklistItemName: string;
  isChecked: boolean;
  checkedBy?: string | null;
  checkedByName?: string | null;
  checkedAt?: string | null;
}

export interface JobTestData {
  id: string;
  jobId: string;
  testedBy: string;
  testerName: string;
  testType: string;
  result: 'PASSED' | 'FAILED' | 'NOT_APPLICABLE';
  notes?: string | null;
  createdAt: string;
}

export interface UnifiedTimelineEvent {
  id: string;
  eventType: 'STATUS_CHANGE' | 'INSPECTION' | 'DIAGNOSIS' | 'REPAIR_PLAN' | 'PART_REQUIRED' | 'REPAIR_ACTIVITY' | 'NOTE' | 'ATTACHMENT' | 'TEST';
  title: string;
  description?: string | null;
  authorName: string;
  badgeText?: string | null;
  badgeColor?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TechnicianDashboardMetrics {
  assignedToMe: number;
  waitingInspection: number;
  underInspection: number;
  diagnosisCompleted: number;
  underRepair: number;
  waitingParts: number;
  repairCompleted: number;
  unrepairable: number;
  totalActive: number;
  urgentJobs: number;
}

export interface JobDetailData {
  job: {
    id: string;
    jobNumber: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerSecondaryPhone?: string | null;
    customerEmail?: string | null;
    customerCode: string;
    deviceId: string;
    equipmentType: EquipmentType;
    deviceBrand: string;
    deviceModel: string;
    deviceSerial?: string | null;
    deviceSpecs?: string | null;
    hasPasscode: boolean;
    serviceCategory: string;
    currentStatus: string;
    priority: 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL';
    assignedTechnicianId?: string | null;
    technicianName?: string | null;
    creatorName: string;
    reportedIssue: string;
    accessoriesReceived: string[];
    physicalConditionNotes?: string | null;
    estimatedCost: number;
    advanceDeposit: number;
    promisedDeliveryDate?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  inspection: {
    id: string;
    powerStatus: string;
    displayStatus?: string | null;
    motherboardStatus?: string | null;
    bodyCondition?: string | null;
    waterDamageDetected: boolean;
    shortCircuitDetected: boolean;
    inspectionNotes?: string | null;
    inspectorName?: string | null;
    createdAt: string;
  } | null;
  diagnoses: JobDiagnosisData[];
  repairPlans: JobRepairPlanItem[];
  requiredParts: JobRequiredPart[];
  repairActivities: JobRepairActivity[];
  attachments: JobAttachmentData[];
  checklists: JobChecklistItem[];
  tests: JobTestData[];
  timeline: UnifiedTimelineEvent[];
  statusHistory: Array<{
    id: string;
    previousStatus: string | null;
    newStatus: string;
    changedByName: string;
    changedByUsername?: string;
    reasonOrNotes: string | null;
    createdAt: string;
  }>;
  notes: Array<{
    id: string;
    noteType: string;
    content: string;
    authorName: string;
    createdAt: string;
  }>;
  photos: Array<{
    id: string;
    photoType: string;
    filePath: string;
    caption?: string | null;
    createdAt: string;
  }>;
}

export interface GlobalSearchResults {
  customers: Array<{
    id: string;
    customerCode: string;
    fullName: string;
    primaryPhone: string;
    email: string | null;
  }>;
  devices: Array<{
    id: string;
    equipmentType: string;
    brand: string;
    modelName: string;
    serialNumber: string | null;
    customerId: string;
    customerName: string;
  }>;
  jobs: Array<{
    id: string;
    jobNumber: string;
    currentStatus: string;
    priority: string;
    reportedIssue: string;
    customerName: string;
    customerPhone: string;
    deviceBrand: string;
    deviceModel: string;
    deviceSerial: string;
  }>;
}

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ElectronAPI {
  auth: {
    login: (credentials: { username: string; password: string }) => Promise<IPCResponse<UserSession>>;
    pinLogin: (params: { pinCode: string }) => Promise<IPCResponse<UserSession>>;
    getCurrentUser: () => Promise<IPCResponse<UserSession | null>>;
    logout: () => Promise<IPCResponse<void>>;
    listUsers: () => Promise<IPCResponse<UserProfile[]>>;
    createUser: (payload: { username: string; fullName: string; roleId: string; password?: string; pinCode?: string; phone?: string }) => Promise<IPCResponse<{ userId: string }>>;
    updateUser: (payload: { id: string; fullName?: string; roleId?: string; password?: string; pinCode?: string; phone?: string }) => Promise<IPCResponse<void>>;
    toggleUserStatus: (params: { id: string; isActive: boolean }) => Promise<IPCResponse<void>>;
  };
  system: {
    getHealth: () => Promise<IPCResponse<SystemHealth>>;
    getAuditLogs: (params: { limit?: number }) => Promise<IPCResponse<AuditLogEntry[]>>;
    createBackup: (params: { backupType?: 'AUTO' | 'MANUAL' | 'PRE_RESTORE'; targetDir?: string }) => Promise<IPCResponse<{ backupId: string; backupPath: string; fileSizeBytes: number }>>;
    getSettings: () => Promise<IPCResponse<Record<string, string>>>;
    updateSetting: (params: { key: string; value: string }) => Promise<IPCResponse<void>>;
  };
  vault: {
    unlockPasscode: (params: { deviceId: string }) => Promise<IPCResponse<{ passcode: string }>>;
  };
  customers: {
    list: (params?: { search?: string; page?: number; limit?: number }) => Promise<IPCResponse<{ customers: CustomerSummary[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>>;
    getById: (params: { customerId: string }) => Promise<IPCResponse<CustomerProfileData>>;
    checkDuplicates: (params: { phone?: string; email?: string; fullName?: string }) => Promise<IPCResponse<CustomerDuplicateCandidate[]>>;
    create: (payload: {
      fullName: string;
      primaryPhone: string;
      secondaryPhone?: string;
      email?: string;
      gstin?: string;
      customerType?: 'INDIVIDUAL' | 'COMMERCIAL';
      notes?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      pincode?: string;
    }) => Promise<IPCResponse<{ id: string; customerCode: string; fullName: string; primaryPhone: string }>>;
    update: (payload: {
      id: string;
      fullName: string;
      primaryPhone: string;
      secondaryPhone?: string;
      email?: string;
      gstin?: string;
      customerType?: 'INDIVIDUAL' | 'COMMERCIAL';
      notes?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      pincode?: string;
    }) => Promise<IPCResponse<void>>;
    search: (params: { query: string }) => Promise<IPCResponse<Array<{ id: string; customerCode: string; fullName: string; primaryPhone: string; email: string | null; deviceCount: number }>>>;
  };
  devices: {
    list: (params?: { customerId?: string; search?: string; limit?: number }) => Promise<IPCResponse<Array<{
      id: string;
      customerId: string;
      customerName?: string;
      customerPhone?: string;
      equipmentType: EquipmentType;
      brand: string;
      modelName: string;
      serialNumber?: string | null;
      colorFinish?: string | null;
      specsSummary?: string | null;
      hasPasscode: boolean;
      jobCount: number;
      createdAt: string;
    }>>>;
    getById: (params: { deviceId: string }) => Promise<IPCResponse<{
      device: {
        id: string;
        customerId: string;
        customerName: string;
        customerPhone: string;
        customerCode: string;
        equipmentType: EquipmentType;
        brand: string;
        modelName: string;
        serialNumber?: string | null;
        colorFinish?: string | null;
        specsSummary?: string | null;
        hasPasscode: boolean;
        createdAt: string;
      };
      jobs: Array<{
        id: string;
        jobNumber: string;
        serviceCategory: string;
        currentStatus: string;
        priority: string;
        reportedIssue: string;
        technicianName?: string | null;
        createdAt: string;
      }>;
      photos: Array<{
        id: string;
        photoType: string;
        filePath: string;
        caption?: string | null;
        createdAt: string;
      }>;
    }>>;
    checkDuplicates: (params: { customerId: string; serialNumber?: string; brand?: string; modelName?: string }) => Promise<IPCResponse<DeviceDuplicateCandidate[]>>;
    create: (payload: {
      customerId: string;
      equipmentType: string;
      brand: string;
      modelName: string;
      serialNumber?: string;
      colorFinish?: string;
      securityPasscode?: string;
      specsSummary?: string;
    }) => Promise<IPCResponse<{ id: string; customerId: string; equipmentType: string; brand: string; modelName: string; serialNumber?: string }>>;
    savePhoto: (payload: {
      deviceId: string;
      jobId?: string;
      photoType?: 'INTAKE_CONDITION' | 'DAMAGE_PROOF' | 'COMPLETED_REPAIR';
      base64Data: string;
      caption?: string;
    }) => Promise<IPCResponse<{ photoId: string; filePath: string }>>;
  };
  jobs: {
    generateJobNumber: () => Promise<IPCResponse<{ jobNumber: string }>>;
    list: (params?: {
      status?: string;
      priority?: string;
      technicianId?: string;
      customerId?: string;
      equipmentType?: string;
      serviceCategory?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => Promise<IPCResponse<{ jobs: ServiceJobSummary[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>>;
    getById: (params: { jobId: string }) => Promise<IPCResponse<JobDetailData>>;
    getTechnicianMetrics: () => Promise<IPCResponse<TechnicianDashboardMetrics>>;
    create: (payload: {
      customerId: string;
      deviceId: string;
      serviceCategory: string;
      priority?: 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL';
      assignedTechnicianId?: string;
      reportedIssue: string;
      accessoriesReceived?: string[];
      physicalConditionNotes?: string;
      estimatedCost?: number;
      advanceDeposit?: number;
      promisedDeliveryDate?: string;
      powerStatus?: string;
      displayStatus?: string;
      motherboardStatus?: string;
      bodyCondition?: string;
      waterDamageDetected?: boolean;
      shortCircuitDetected?: boolean;
      inspectionNotes?: string;
      initialNote?: string;
      photosBase64?: Array<{ base64Data: string; caption?: string }>;
    }) => Promise<IPCResponse<{ id: string; jobNumber: string; currentStatus: string; savedPhotoCount: number; warning?: string }>>;
    updateStatus: (payload: {
      jobId: string;
      newStatus: string;
      reasonOrNotes?: string;
      assignedTechnicianId?: string;
    }) => Promise<IPCResponse<{ jobId: string; previousStatus: string; newStatus: string }>>;
    assignTechnician: (payload: { jobId: string; technicianId: string }) => Promise<IPCResponse<void>>;
    saveTechnicalInspection: (payload: {
      jobId: string;
      powerStatus: string;
      displayStatus?: string;
      motherboardStatus?: string;
      bodyCondition?: string;
      waterDamageDetected?: boolean;
      shortCircuitDetected?: boolean;
      inspectionNotes?: string;
      checklistItems?: Array<{ name: string; isChecked: boolean }>;
      transitionToUnderInspection?: boolean;
    }) => Promise<IPCResponse<{ inspectionId: string }>>;
    saveDiagnosis: (payload: {
      jobId: string;
      rootCauseAnalysis: string;
      faultCategory?: string;
      faultyComponentsIdentified?: string;
      voltageRailsChecked?: string;
      recommendedAction?: string;
      diagnosticOutcome?: string;
      transitionStatus?: boolean;
    }) => Promise<IPCResponse<{ diagnosisId: string; newStatus?: string }>>;
    addRepairPlanAction: (payload: {
      jobId: string;
      serviceName: string;
      sacCode?: string;
      laborCharge?: number;
      discount?: number;
      taxRate?: number;
    }) => Promise<IPCResponse<{ serviceId: string }>>;
    deleteRepairPlanAction: (payload: { serviceId: string }) => Promise<IPCResponse<void>>;
    addRequiredPart: (payload: {
      jobId: string;
      partName: string;
      serialNumber?: string;
      quantity?: number;
      unitCostPrice?: number;
      unitSellingPrice?: number;
      hsnCode?: string;
      taxRate?: number;
      warrantyMonths?: number;
      reasonOrNotes?: string;
    }) => Promise<IPCResponse<{ partId: string }>>;
    deleteRequiredPart: (payload: { partId: string }) => Promise<IPCResponse<void>>;
    addRepairActivity: (payload: {
      jobId: string;
      activityTitle: string;
      description?: string;
      timeSpentMinutes?: number;
      transitionToUnderRepair?: boolean;
    }) => Promise<IPCResponse<{ activityId: string }>>;
    addTechnicalAttachment: (payload: {
      jobId: string;
      fileName: string;
      fileType?: string;
      base64Data: string;
      caption?: string;
      isPhoto?: boolean;
    }) => Promise<IPCResponse<{ attachmentId: string; filePath: string }>>;
    completeRepair: (payload: {
      jobId: string;
      summaryNotes: string;
      testingNotes?: string;
      recommendations?: string;
    }) => Promise<IPCResponse<{ jobId: string }>>;
    markUnrepairable: (payload: {
      jobId: string;
      rootCause: string;
      technicalJustification: string;
      note?: string;
    }) => Promise<IPCResponse<{ jobId: string }>>;
    addNote: (payload: { jobId: string; content: string; noteType?: 'INTERNAL' | 'CUSTOMER_FACING' }) => Promise<IPCResponse<{ noteId: string }>>;
  };
  search: {
    global: (params: { query: string }) => Promise<IPCResponse<GlobalSearchResults>>;
  };
  inventory: {
    generateSku: (params?: { categoryCode?: string }) => Promise<IPCResponse<{ sku: string }>>;
    list: (params?: { search?: string; categoryId?: string; itemType?: string; lowStockOnly?: boolean; page?: number; limit?: number }) => Promise<IPCResponse<{
      items: Array<{
        id: string;
        sku: string;
        name: string;
        categoryId: string;
        categoryName: string;
        categoryCode: string;
        itemType: string;
        serialNumber?: string | null;
        costPrice: number;
        sellingPrice: number;
        hsnCode?: string | null;
        taxRate: number;
        quantityOnHand: number;
        minReorderLevel: number;
        locationId?: string | null;
        locationName?: string | null;
        supplierId?: string | null;
        supplierName?: string | null;
        salvageSourceId?: string | null;
        salvageCode?: string | null;
        warrantyMonths: number;
        isLowStock: boolean;
        createdAt: string;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
      metrics: { totalItems: number; totalUnits: number; totalValuation: number; lowStockCount: number; salvagePartsCount: number };
    }>>;
    getById: (params: { itemId: string }) => Promise<IPCResponse<{
      item: Record<string, unknown>;
      transactions: Array<{
        id: string;
        transactionType: string;
        quantityDelta: number;
        balanceAfter: number;
        referenceType: string;
        referenceId?: string | null;
        notes?: string | null;
        createdByName: string;
        createdAt: string;
      }>;
    }>>;
    create: (payload: {
      sku?: string;
      name: string;
      categoryId: string;
      itemType: string;
      serialNumber?: string;
      costPrice: number;
      sellingPrice: number;
      hsnCode?: string;
      taxRate?: number;
      initialQuantity?: number;
      minReorderLevel?: number;
      locationId?: string;
      supplierId?: string;
      salvageSourceId?: string;
      warrantyMonths?: number;
    }) => Promise<IPCResponse<{ itemId: string; sku: string }>>;
    adjustStock: (payload: {
      itemId: string;
      transactionType: string;
      quantityDelta: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
    }) => Promise<IPCResponse<{ itemId: string; previousQuantity: number; newQuantity: number; delta: number }>>;
    listCategories: () => Promise<IPCResponse<Array<{ id: string; name: string; code: string; description?: string }>>>;
    listLocations: () => Promise<IPCResponse<Array<{ id: string; name: string; description?: string }>>>;
    listSuppliers: () => Promise<IPCResponse<Array<{ id: string; company_name: string; contact_person?: string; phone?: string; email?: string; gstin?: string; address?: string; item_count: number }>>>;
    createSupplier: (payload: { companyName: string; contactPerson?: string; phone?: string; email?: string; gstin?: string; address?: string }) => Promise<IPCResponse<{ supplierId: string }>>;
  };
  salvage: {
    list: () => Promise<IPCResponse<Array<{
      id: string;
      salvage_code: string;
      original_service_job_id?: string;
      equipment_type: string;
      brand: string;
      model_name: string;
      serial_number?: string;
      acquisition_type: string;
      acquisition_cost: number;
      dismantled_by_name: string;
      harvested_parts_count: number;
      total_harvested_value: number;
      original_job_number?: string;
      original_customer_name?: string;
      created_at: string;
    }>>>;
    intake: (payload: {
      originalServiceJobId?: string;
      equipmentType: string;
      brand: string;
      modelName: string;
      serialNumber?: string;
      acquisitionType: string;
      acquisitionCost?: number;
      notes?: string;
    }) => Promise<IPCResponse<{ salvageId: string; salvageCode: string }>>;
    harvestComponents: (payload: {
      salvageDeviceId: string;
      harvestedParts: Array<{
        partName: string;
        categoryId: string;
        serialNumber?: string;
        testedCondition: string;
        estimatedValue: number;
        sellingPrice?: number;
        locationId?: string;
        notes?: string;
      }>;
    }) => Promise<IPCResponse<{ salvageId: string; harvestedCount: number; createdItemIds: string[] }>>;
    getById: (params: { salvageId: string }) => Promise<IPCResponse<{
      device: Record<string, unknown>;
      harvestedParts: Array<Record<string, unknown>>;
    }>>;
  };
  billing: {
    generateQuotationNumber: () => Promise<IPCResponse<{ quotationNumber: string }>>;
    generateInvoiceNumber: () => Promise<IPCResponse<{ invoiceNumber: string }>>;
    generateReceiptNumber: () => Promise<IPCResponse<{ receiptNumber: string }>>;
    listQuotations: (params?: { jobId?: string; status?: string; search?: string }) => Promise<IPCResponse<Array<Record<string, unknown>>>>;
    getQuotationById: (params: { quotationId: string }) => Promise<IPCResponse<{ quotation: Record<string, unknown>; items: Array<Record<string, unknown>>; approval: Record<string, unknown> | null }>>;
    createQuotation: (payload: {
      jobId: string;
      validityDays?: number;
      discountAmount?: number;
      items: Array<{
        itemType: 'PART' | 'LABOR' | 'OTHER';
        inventoryItemId?: string;
        description: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
      }>;
    }) => Promise<IPCResponse<{ quotationId: string; quotationNumber: string; totalAmount: number }>>;
    recordApproval: (payload: {
      quotationId: string;
      approvalStatus: 'APPROVED' | 'PARTIAL_APPROVAL' | 'REJECTED';
      approvedAmount: number;
      approvalMethod: string;
      customerContactUsed: string;
      notes?: string;
    }) => Promise<IPCResponse<{ approvalId: string; status: string }>>;
    listInvoices: (params?: { paymentStatus?: string; customerId?: string; search?: string }) => Promise<IPCResponse<Array<Record<string, unknown>>>>;
    getInvoiceById: (params: { invoiceId: string }) => Promise<IPCResponse<{ invoice: Record<string, unknown>; items: Array<Record<string, unknown>>; payments: Array<Record<string, unknown>> }>>;
    createInvoice: (payload: {
      customerId: string;
      serviceJobId?: string;
      invoiceType?: string;
      isGstInvoice?: boolean;
      customerGstin?: string;
      advanceAdjusted?: number;
      discountAmount?: number;
      items: Array<{
        itemType: string;
        itemRefId?: string;
        description: string;
        hsnSacCode?: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
        taxRate?: number;
      }>;
    }) => Promise<IPCResponse<{ invoiceId: string; invoiceNumber: string; totalAmount: number; balanceDue: number }>>;
    recordPayment: (payload: {
      invoiceId: string;
      amount: number;
      paymentMode: string;
      paymentType?: string;
      transactionReference?: string;
      markJobDelivered?: boolean;
    }) => Promise<IPCResponse<{ receiptNumber: string; amountPaid: number; balanceDue: number; paymentStatus: string }>>;
  };
  datarecovery: {
    list: () => Promise<IPCResponse<Array<Record<string, unknown>>>>;
    intake: (payload: {
      serviceJobId: string;
      storageType: string;
      capacityGb: number;
      fileSystem?: string;
      detectionStatus: string;
      damageType: string;
      recoveryComplexity: string;
      targetDataDescription?: string;
      destinationMediaType: string;
      destinationMediaDetails?: string;
      disclaimerAcknowledged: boolean;
    }) => Promise<IPCResponse<{ dataRecoveryId: string }>>;
    updateAssessment: (payload: {
      dataRecoveryId: string;
      recoveredSizeGb: number;
      recoveryOutcome: string;
      notes?: string;
    }) => Promise<IPCResponse<{ status: string }>>;
  };
  refurb: {
    list: (params?: { status?: string }) => Promise<IPCResponse<Array<Record<string, unknown>>>>;
    create: (payload: {
      productType: string;
      brand: string;
      modelName: string;
      serialNumber?: string;
      specs: string;
      cosmeticGrade: string;
      acquisitionCost: number;
      refurbCostSpent: number;
      sellingPrice: number;
      warrantyMonths?: number;
    }) => Promise<IPCResponse<{ productId: string; productCode: string }>>;
    sell: (payload: {
      productId: string;
      customerId: string;
      sellingPrice: number;
      paymentMode: string;
      warrantyMonths?: number;
    }) => Promise<IPCResponse<{ saleNumber: string; productId: string }>>;
  };
  pcbuilder: {
    list: () => Promise<IPCResponse<Array<Record<string, unknown>>>>;
    create: (payload: {
      customerId: string;
      buildName: string;
      targetBudget?: number;
      assemblyLaborFee: number;
      discountAmount?: number;
      slots: Array<{
        componentSlot: string;
        inventoryItemId?: string;
        itemName: string;
        specs?: string;
        quantity: number;
        unitCost: number;
        unitPrice: number;
        taxRate?: number;
      }>;
    }) => Promise<IPCResponse<{ buildId: string; buildNumber: string; finalQuotedPrice: number }>>;
  };
  warranty: {
    list: (params?: { search?: string; customerId?: string }) => Promise<IPCResponse<Array<Record<string, unknown>>>>;
    createClaimJob: (payload: {
      warrantyId: string;
      reportedIssue: string;
      priority?: string;
      notes?: string;
    }) => Promise<IPCResponse<{ claimJobId: string; claimJobNumber: string }>>;
  };
  communication: {
    listTemplates: () => Promise<IPCResponse<Array<{ id: string; template_key: string; name: string; template_body: string }>>>;
    listMessages: (params?: { status?: string; limit?: number }) => Promise<IPCResponse<Array<Record<string, unknown>>>>;
    queueMessage: (payload: {
      customerId: string;
      serviceJobId?: string;
      templateKey: string;
      recipientPhone: string;
      messagePayload: string;
    }) => Promise<IPCResponse<{ messageId: string; dispatchStatus: string; waDeepLink: string }>>;
    retryMessage: (params: { messageId: string }) => Promise<IPCResponse<{ status: string }>>;
  };
  reports: {
    getOverview: () => Promise<IPCResponse<{
      jobs: { total: number; active: number; intakePending: number; inRepair: number; readyForDelivery: number; delivered: number; unrepairable: number };
      finances: { totalInvoices: number; totalBilled: number; totalCollected: number; totalOutstanding: number; totalGstCollected: number };
      inventory: { totalSkus: number; totalUnitsInStock: number; stockValuation: number; lowStockAlerts: number; salvageDevicesCount: number; salvageAcquisitionsCost: number };
      crm: { totalCustomers: number; activeWarranties: number; warrantyClaimsHandled: number };
    }>>;
    getTechnicianPerformance: () => Promise<IPCResponse<Array<Record<string, unknown>>>>;
    getEquipmentFailureBreakdown: () => Promise<IPCResponse<Array<{ equipment_type: string; job_count: number }>>>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
