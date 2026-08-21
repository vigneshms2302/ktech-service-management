import { contextBridge, ipcRenderer } from 'electron';

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const electronAPI = {
  // Authentication & Roles
  auth: {
    login: (credentials: { username: string; password: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:login', credentials),
    pinLogin: (params: { pinCode: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:pinLogin', params),
    getCurrentUser: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:getCurrentUser'),
    logout: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:logout'),
    listUsers: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:listUsers'),
  },

  // System & Health
  system: {
    getHealth: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:getHealth'),
    getAuditLogs: (params: { limit?: number }): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:getAuditLogs', params),
    createBackup: (params: { backupType?: 'AUTO' | 'MANUAL' | 'PRE_RESTORE'; targetDir?: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:createBackup', params),
    getSettings: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:getSettings'),
    updateSetting: (params: { key: string; value: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('system:updateSetting', params),
  },

  // Secure Vault
  vault: {
    unlockPasscode: (params: { deviceId: string }): Promise<IPCResponse<{ passcode: string }>> =>
      ipcRenderer.invoke('vault:unlockPasscode', params),
  },

  // Customer CRM
  customers: {
    list: (params?: { search?: string; page?: number; limit?: number }): Promise<IPCResponse> =>
      ipcRenderer.invoke('customer:list', params),
    getById: (params: { customerId: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('customer:getById', params),
    checkDuplicates: (params: { phone?: string; email?: string; fullName?: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('customer:checkDuplicates', params),
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
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('customer:create', payload),
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
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('customer:update', payload),
    search: (params: { query: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('customer:search', params),
  },

  // Equipment / Devices
  devices: {
    list: (params?: { customerId?: string; search?: string; limit?: number }): Promise<IPCResponse> =>
      ipcRenderer.invoke('device:list', params),
    getById: (params: { deviceId: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('device:getById', params),
    checkDuplicates: (params: { customerId: string; serialNumber?: string; brand?: string; modelName?: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('device:checkDuplicates', params),
    create: (payload: {
      customerId: string;
      equipmentType: string;
      brand: string;
      modelName: string;
      serialNumber?: string;
      colorFinish?: string;
      securityPasscode?: string;
      specsSummary?: string;
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('device:create', payload),
    savePhoto: (payload: {
      deviceId: string;
      jobId?: string;
      photoType?: 'INTAKE_CONDITION' | 'DAMAGE_PROOF' | 'COMPLETED_REPAIR';
      base64Data: string;
      caption?: string;
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('device:savePhoto', payload),
  },

  // Service Jobs
  jobs: {
    generateJobNumber: (): Promise<IPCResponse<{ jobNumber: string }>> =>
      ipcRenderer.invoke('job:generateJobNumber'),
    list: (params?: {
      status?: string;
      priority?: string;
      technicianId?: string;
      customerId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:list', params),
    getById: (params: { jobId: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:getById', params),
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
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:create', payload),
    updateStatus: (payload: {
      jobId: string;
      newStatus: string;
      reasonOrNotes?: string;
      assignedTechnicianId?: string;
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:updateStatus', payload),
    assignTechnician: (payload: { jobId: string; technicianId: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:assignTechnician', payload),
    addNote: (payload: { jobId: string; content: string; noteType?: 'INTERNAL' | 'CUSTOMER_FACING' }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:addNote', payload),
  },

  // Global Search (Ctrl+K)
  search: {
    global: (params: { query: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('search:global', params),
  },
};

export type ElectronAPI = typeof electronAPI;

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
