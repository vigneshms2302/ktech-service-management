import { z } from 'zod';

// ── Auth Schemas ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  shopSlug: z.string().optional(),
  isSuperAdmin: z.boolean().optional(),
});

export const pinLoginSchema = z.object({
  shopId: z.string().min(1, 'Shop ID is required'),
  pinCode: z.string().min(1, 'PIN code is required'),
});

export const createUserSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  roleId: z.string().optional(),
  password: z.string().optional(),
  pinCode: z.string().optional(),
  phone: z.string().optional().nullable(),
});

// ── Job Schemas ──────────────────────────────────────────────────────────────
export const createJobSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  serviceCategory: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
  assignedTechnicianId: z.string().optional().nullable(),
  reportedIssue: z.string().min(1, 'Reported issue description is required'),
  accessoriesReceived: z.array(z.string()).optional(),
  physicalConditionNotes: z.string().optional().nullable(),
  estimatedCost: z.number().nonnegative().optional(),
  advanceDeposit: z.number().nonnegative().optional(),
  promisedDeliveryDate: z.string().optional().nullable(),
});

export const updateJobSchema = z.object({
  serviceCategory: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
  assignedTechnicianId: z.string().optional().nullable(),
  reportedIssue: z.string().min(1).optional(),
  accessoriesReceived: z.array(z.string()).optional(),
  physicalConditionNotes: z.string().optional().nullable(),
  estimatedCost: z.number().nonnegative().optional(),
  advanceDeposit: z.number().nonnegative().optional(),
  promisedDeliveryDate: z.string().optional().nullable(),
  actualDeliveryDate: z.string().optional().nullable(),
});

export const updateJobStatusSchema = z.object({
  newStatus: z.string().min(1, 'New status is required'),
  notes: z.string().optional(),
});

export const jobInspectionSchema = z.object({
  powerStatus: z.string().optional(),
  displayStatus: z.string().optional().nullable(),
  motherboardStatus: z.string().optional().nullable(),
  bodyCondition: z.string().optional().nullable(),
  waterDamage: z.boolean().optional(),
  shortCircuit: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export const jobDiagnosisSchema = z.object({
  rootCause: z.string().min(1, 'Root cause analysis is required'),
  voltageRails: z.record(z.string(), z.any()).optional().nullable(),
  faultyComponents: z.string().optional().nullable(),
  recommendedAction: z.string().optional().nullable(),
});

// ── Customer Schemas ─────────────────────────────────────────────────────────
export const createCustomerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  primaryPhone: z.string().min(6, 'Valid primary phone number is required'),
  secondaryPhone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  gstin: z.string().optional().nullable(),
  customerType: z.enum(['INDIVIDUAL', 'BUSINESS', 'DEALER', 'VIP']).optional(),
  notes: z.string().optional().nullable(),
});

export const updateCustomerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').optional(),
  primaryPhone: z.string().min(6, 'Valid primary phone number is required').optional(),
  secondaryPhone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  gstin: z.string().optional().nullable(),
  customerType: z.enum(['INDIVIDUAL', 'BUSINESS', 'DEALER', 'VIP']).optional(),
  notes: z.string().optional().nullable(),
});

export const addDeviceSchema = z.object({
  equipmentType: z.string().optional(),
  brand: z.string().min(1, 'Brand is required'),
  modelName: z.string().min(1, 'Model name is required'),
  serialNumber: z.string().optional().nullable(),
  colorFinish: z.string().optional().nullable(),
  passcode: z.string().optional().nullable(),
  specsSummary: z.string().optional().nullable(),
});

// ── Billing Schemas ──────────────────────────────────────────────────────────
export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  serviceJobId: z.string().optional().nullable(),
  isGstInvoice: z.boolean().optional(),
  customerGstin: z.string().optional().nullable(),
  items: z.array(
    z.object({
      itemType: z.string().optional(),
      itemRefId: z.string().optional().nullable(),
      description: z.string().min(1, 'Line item description is required'),
      hsnSacCode: z.string().optional().nullable(),
      quantity: z.number().positive('Quantity must be greater than 0').default(1),
      unitPrice: z.number().nonnegative('Unit price must be >= 0').default(0),
      discount: z.number().nonnegative().default(0),
      taxRate: z.number().nonnegative().default(18),
    })
  ).optional().default([]),
  advanceAdjusted: z.number().nonnegative().optional().default(0),
  payments: z.array(
    z.object({
      paymentMode: z.string().default('CASH'),
      amount: z.number().positive('Payment amount must be greater than 0'),
      transactionRef: z.string().optional().nullable(),
    })
  ).optional().default([]),
});

// ── Admin Schemas ────────────────────────────────────────────────────────────
export const provisionShopSchema = z.object({
  name: z.string().min(2, 'Shop name is required'),
  slug: z.string().min(2, 'Shop slug is required'),
  ownerName: z.string().min(2, 'Owner name is required'),
  phone: z.string().min(6, 'Phone is required'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  gstin: z.string().optional().nullable(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional().nullable(),
  maxSeats: z.number().int().positive().optional(),
  subscriptionPlan: z.string().optional(),
  subscriptionMonths: z.number().int().positive().optional(),
  ownerUsername: z.string().optional(),
  ownerPassword: z.string().min(6, 'Password must be at least 6 characters').optional(),
  ownerPin: z.string().optional(),
});
