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
    createUser: (payload: { username: string; fullName: string; roleId: string; password?: string; pinCode?: string; phone?: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:createUser', payload),
    updateUser: (payload: { id: string; fullName?: string; roleId?: string; pinCode?: string; password?: string; phone?: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:updateUser', payload),
    toggleUserStatus: (params: { id: string; isActive: boolean }): Promise<IPCResponse> =>
      ipcRenderer.invoke('auth:toggleUserStatus', params),
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
    getTechnicianMetrics: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:getTechnicianMetrics'),
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
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:saveTechnicalInspection', payload),
    saveDiagnosis: (payload: {
      jobId: string;
      rootCauseAnalysis: string;
      faultCategory?: string;
      faultyComponentsIdentified?: string;
      voltageRailsChecked?: string;
      recommendedAction?: string;
      diagnosticOutcome?: string;
      transitionStatus?: boolean;
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:saveDiagnosis', payload),
    addRepairPlanAction: (payload: {
      jobId: string;
      serviceName: string;
      sacCode?: string;
      laborCharge?: number;
      discount?: number;
      taxRate?: number;
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:addRepairPlanAction', payload),
    deleteRepairPlanAction: (payload: { serviceId: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:deleteRepairPlanAction', payload),
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
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:addRequiredPart', payload),
    deleteRequiredPart: (payload: { partId: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:deleteRequiredPart', payload),
    addRepairActivity: (payload: {
      jobId: string;
      activityTitle: string;
      description?: string;
      timeSpentMinutes?: number;
      transitionToUnderRepair?: boolean;
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:addRepairActivity', payload),
    addTechnicalAttachment: (payload: {
      jobId: string;
      fileName: string;
      fileType?: string;
      base64Data: string;
      caption?: string;
      isPhoto?: boolean;
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:addTechnicalAttachment', payload),
    completeRepair: (payload: {
      jobId: string;
      summaryNotes: string;
      testingNotes?: string;
      recommendations?: string;
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:completeRepair', payload),
    markUnrepairable: (payload: {
      jobId: string;
      rootCause: string;
      technicalJustification: string;
      note?: string;
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:markUnrepairable', payload),
    addNote: (payload: { jobId: string; content: string; noteType?: 'INTERNAL' | 'CUSTOMER_FACING' }): Promise<IPCResponse> =>
      ipcRenderer.invoke('job:addNote', payload),
  },

  // Global Search (Ctrl+K)
  search: {
    global: (params: { query: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('search:global', params),
  },

  // Multi-Tier Inventory & Stock Management
  inventory: {
    generateSku: (params?: { categoryCode?: string }): Promise<IPCResponse<{ sku: string }>> =>
      ipcRenderer.invoke('inventory:generateSku', params),
    list: (params?: { search?: string; categoryId?: string; itemType?: string; lowStockOnly?: boolean; page?: number; limit?: number }): Promise<IPCResponse> =>
      ipcRenderer.invoke('inventory:list', params),
    getById: (params: { itemId: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('inventory:getById', params),
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
    }): Promise<IPCResponse<{ itemId: string; sku: string }>> =>
      ipcRenderer.invoke('inventory:create', payload),
    adjustStock: (payload: {
      itemId: string;
      transactionType: string;
      quantityDelta: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
    }): Promise<IPCResponse> =>
      ipcRenderer.invoke('inventory:adjustStock', payload),
    listCategories: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('inventory:listCategories'),
    listLocations: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('inventory:listLocations'),
    listSuppliers: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('inventory:listSuppliers'),
    createSupplier: (payload: {
      companyName: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      gstin?: string;
      address?: string;
    }): Promise<IPCResponse<{ supplierId: string }>> =>
      ipcRenderer.invoke('inventory:createSupplier', payload),
  },

  // Salvage Dismantling Engine
  salvage: {
    list: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('salvage:list'),
    intake: (payload: {
      originalServiceJobId?: string;
      equipmentType: string;
      brand: string;
      modelName: string;
      serialNumber?: string;
      acquisitionType: string;
      acquisitionCost?: number;
      notes?: string;
    }): Promise<IPCResponse<{ salvageId: string; salvageCode: string }>> =>
      ipcRenderer.invoke('salvage:intake', payload),
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
    }): Promise<IPCResponse<{ salvageId: string; harvestedCount: number; createdItemIds: string[] }>> =>
      ipcRenderer.invoke('salvage:harvestComponents', payload),
    getById: (params: { salvageId: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('salvage:getById', params),
  },

  // Quotations, Approvals, Billing & Payments
  billing: {
    generateQuotationNumber: (): Promise<IPCResponse<{ quotationNumber: string }>> =>
      ipcRenderer.invoke('billing:generateQuotationNumber'),
    generateInvoiceNumber: (): Promise<IPCResponse<{ invoiceNumber: string }>> =>
      ipcRenderer.invoke('billing:generateInvoiceNumber'),
    generateReceiptNumber: (): Promise<IPCResponse<{ receiptNumber: string }>> =>
      ipcRenderer.invoke('billing:generateReceiptNumber'),
    listQuotations: (params?: { jobId?: string; status?: string; search?: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('billing:listQuotations', params),
    getQuotationById: (params: { quotationId: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('billing:getQuotationById', params),
    createQuotation: (payload: {
      jobId: string;
      validityDays?: number;
      discountAmount?: number;
      isGstQuotation?: boolean;
      items: Array<{
        itemType: 'PART' | 'LABOR' | 'OTHER';
        inventoryItemId?: string;
        description: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
      }>;
    }): Promise<IPCResponse<{ quotationId: string; quotationNumber: string; totalAmount: number }>> =>
      ipcRenderer.invoke('billing:createQuotation', payload),
    toggleQuotationGst: (payload: {
      quotationId: string;
      isGst: boolean;
    }): Promise<IPCResponse<{ partsSubtotal: number; laborSubtotal: number; totalTax: number; grandTotal: number }>> =>
      ipcRenderer.invoke('billing:toggleQuotationGst', payload),
    recordApproval: (payload: {
      quotationId: string;
      approvalStatus: 'APPROVED' | 'PARTIAL_APPROVAL' | 'REJECTED';
      approvedAmount: number;
      approvalMethod: string;
      customerContactUsed: string;
      notes?: string;
    }): Promise<IPCResponse<{ approvalId: string; status: string }>> =>
      ipcRenderer.invoke('billing:recordApproval', payload),
    listInvoices: (params?: { paymentStatus?: string; customerId?: string; jobId?: string; search?: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('billing:listInvoices', params),
    getInvoiceById: (params: { invoiceId: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('billing:getInvoiceById', params),
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
    }): Promise<IPCResponse<{ invoiceId: string; invoiceNumber: string; totalAmount: number; balanceDue: number }>> =>
      ipcRenderer.invoke('billing:createInvoice', payload),
    toggleInvoiceGst: (payload: {
      invoiceId: string;
      isGst: boolean;
    }): Promise<IPCResponse<{ partsSubtotal: number; laborSubtotal: number; totalTax: number; cgst: number; sgst: number; totalAmount: number; balanceDue: number }>> =>
      ipcRenderer.invoke('billing:toggleInvoiceGst', payload),
    recordPayment: (payload: {
      invoiceId: string;
      amount: number;
      paymentMode: string;
      paymentType?: string;
      transactionReference?: string;
      markJobDelivered?: boolean;
    }): Promise<IPCResponse<{ receiptNumber: string; amountPaid: number; balanceDue: number; paymentStatus: string }>> =>
      ipcRenderer.invoke('billing:recordPayment', payload),
  },

  // Dedicated Data Recovery Subsystem
  datarecovery: {
    list: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('datarecovery:list'),
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
    }): Promise<IPCResponse<{ dataRecoveryId: string }>> =>
      ipcRenderer.invoke('datarecovery:intake', payload),
    updateAssessment: (payload: {
      dataRecoveryId: string;
      recoveredSizeGb: number;
      recoveryOutcome: string;
      notes?: string;
    }): Promise<IPCResponse<{ status: string }>> =>
      ipcRenderer.invoke('datarecovery:updateAssessment', payload),
  },

  // Refurbished Products
  refurb: {
    list: (params?: { status?: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('refurb:list', params),
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
    }): Promise<IPCResponse<{ productId: string; productCode: string }>> =>
      ipcRenderer.invoke('refurb:create', payload),
    sell: (payload: {
      productId: string;
      customerId: string;
      sellingPrice: number;
      paymentMode: string;
      warrantyMonths?: number;
    }): Promise<IPCResponse<{ saleNumber: string; productId: string }>> =>
      ipcRenderer.invoke('refurb:sell', payload),
  },

  // Custom PC Builder
  pcbuilder: {
    list: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('pcbuilder:list'),
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
    }): Promise<IPCResponse<{ buildId: string; buildNumber: string; finalQuotedPrice: number }>> =>
      ipcRenderer.invoke('pcbuilder:create', payload),
  },

  // Warranties & Claims
  warranty: {
    list: (params?: { search?: string; customerId?: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('warranty:list', params),
    createClaimJob: (payload: {
      warrantyId: string;
      reportedIssue: string;
      priority?: string;
      notes?: string;
    }): Promise<IPCResponse<{ claimJobId: string; claimJobNumber: string }>> =>
      ipcRenderer.invoke('warranty:createClaimJob', payload),
  },

  // WhatsApp Communication
  communication: {
    listTemplates: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('communication:listTemplates'),
    listMessages: (params?: { status?: string; limit?: number }): Promise<IPCResponse> =>
      ipcRenderer.invoke('communication:listMessages', params),
    queueMessage: (payload: {
      customerId: string;
      serviceJobId?: string;
      templateKey: string;
      recipientPhone: string;
      messagePayload: string;
    }): Promise<IPCResponse<{ messageId: string; dispatchStatus: string; waDeepLink: string }>> =>
      ipcRenderer.invoke('communication:queueMessage', payload),
    retryMessage: (params: { messageId: string }): Promise<IPCResponse> =>
      ipcRenderer.invoke('communication:retryMessage', params),
  },

  // Analytics & Reports
  reports: {
    getOverview: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('reports:getOverview'),
    getTechnicianPerformance: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('reports:getTechnicianPerformance'),
    getEquipmentFailureBreakdown: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('reports:getEquipmentFailureBreakdown'),
  },

  // Desktop Auto-Updates
  updater: {
    getStatus: (): Promise<IPCResponse<any>> =>
      ipcRenderer.invoke('updater:getStatus'),
    checkForUpdates: (): Promise<IPCResponse<any>> =>
      ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('updater:downloadUpdate'),
    quitAndInstall: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('updater:quitAndInstall'),
    onStatusChange: (callback: (status: any) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: any) => {
        callback(status);
      };
      ipcRenderer.on('updater:status-changed', listener);
      return () => {
        ipcRenderer.removeListener('updater:status-changed', listener);
      };
    },
  },
};

export type ElectronAPI = typeof electronAPI;

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
