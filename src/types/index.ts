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
    estimatedCost: number;
    advanceDeposit: number;
    promisedDeliveryDate?: string | null;
    deviceBrand?: string;
    deviceModel?: string;
    deviceSerial?: string;
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
  matchReason: string;
}

export interface DeviceDuplicateCandidate {
  id: string;
  equipmentType: string;
  brand: string;
  modelName: string;
  serialNumber: string | null;
  matchReason: string;
}

export interface ServiceJobSummary {
  id: string;
  jobNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerCode: string;
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
  reportedIssue: string;
  accessoriesReceived?: string | null;
  estimatedCost: number;
  advanceDeposit: number;
  promisedDeliveryDate?: string | null;
  createdAt: string;
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
  timeline: Array<{
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
      search?: string;
      page?: number;
      limit?: number;
    }) => Promise<IPCResponse<{ jobs: ServiceJobSummary[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>>;
    getById: (params: { jobId: string }) => Promise<IPCResponse<JobDetailData>>;
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
