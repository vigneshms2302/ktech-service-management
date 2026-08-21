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

// 18 Approved Equipment Types
export type EquipmentType =
  | 'LAPTOP'
  | 'DESKTOP'
  | 'CUSTOM_PC'
  | 'MONITOR'
  | 'PRINTER'
  | 'PLAYSTATION'
  | 'XBOX'
  | 'GAMING_CONSOLE'
  | 'HDD'
  | 'SSD'
  | 'M_2'
  | 'PEN_DRIVE'
  | 'SMPS'
  | 'POWER_SUPPLY'
  | 'EV_CHARGER'
  | 'ADAPTER'
  | 'MOTHERBOARD'
  | 'OTHER';

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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
