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
  email: z.string().email('Please enter a valid email address').optional().nullable().or(z.literal('')),
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
  customerType: z.enum(['INDIVIDUAL', 'BUSINESS', 'COMMERCIAL', 'DEALER', 'VIP']).optional(),
  notes: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
});

export const updateCustomerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').optional(),
  primaryPhone: z.string().min(6, 'Valid primary phone number is required').optional(),
  secondaryPhone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  gstin: z.string().optional().nullable(),
  customerType: z.enum(['INDIVIDUAL', 'BUSINESS', 'COMMERCIAL', 'DEALER', 'VIP']).optional(),
  notes: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
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

export const forgotPasswordSchema = z.object({
  mode: z.enum(['SHOP_USER', 'SUPER_ADMIN']).optional().default('SHOP_USER'),
  shopSlug: z.string().trim().optional(),
  username: z.string().trim().optional(),
  contact: z.string().trim().optional(),
}).refine(
  (data) => Boolean((data.shopSlug && (data.username || data.contact)) || data.contact || data.username),
  { message: 'Please enter your Shop ID and username, or your registered phone or email.' }
);

export const verifyResetSchema = z.object({
  token: z.string().trim().min(16).optional(),
  mode: z.enum(['SHOP_USER', 'SUPER_ADMIN']).optional().default('SHOP_USER'),
  shopSlug: z.string().trim().optional(),
  username: z.string().trim().optional(),
  contact: z.string().trim().optional(),
  otp: z.string().trim().regex(/^\d{6}$/, 'Verification code must be 6 digits').optional(),
}).refine(
  (data) => Boolean(data.token || data.otp),
  { message: 'Reset token or 6-digit verification code is required.' }
);

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(16).optional(),
  mode: z.enum(['SHOP_USER', 'SUPER_ADMIN']).optional().default('SHOP_USER'),
  shopSlug: z.string().trim().optional(),
  username: z.string().trim().optional(),
  contact: z.string().trim().optional(),
  otp: z.string().trim().regex(/^\d{6}$/, 'Verification code must be 6 digits').optional(),
  recoveryKey: z.string().trim().min(8).optional(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long').max(128),
  newPin: z.string().regex(/^\d{4,6}$/, 'Quick PIN must be 4 to 6 numeric digits').optional(),
}).refine(
  (data) => Boolean(data.token || data.otp || data.recoveryKey),
  { message: 'A valid reset link token, 6-digit verification code, or recovery key is required.' }
);

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long').max(128),
  newPin: z.string().regex(/^\d{4,6}$/, 'Quick PIN must be 4 to 6 numeric digits').optional(),
});

export const ownerResetStaffSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters long').max(128).optional(),
  newPin: z.string().regex(/^\d{4,6}$/, 'Quick PIN must be 4 to 6 numeric digits').optional(),
});
