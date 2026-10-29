import React from 'react';
import { ShieldCheck, FileText, RefreshCw } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="w-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200 py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20 uppercase tracking-wider mb-4">
          <ShieldCheck size={13} />
          Data Privacy Commitment
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-2">
          Privacy Policy
        </h1>
        <div className="text-xs text-[#676767] dark:text-[#b4b4b4] mb-8">Last Updated: October 2026</div>

        <div className="p-6 sm:p-8 rounded-2xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f] text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed">
          <h2 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
            1. Tenant Isolation & Zero Cross-Access
          </h2>
          <p className="mb-6">
            K-Connect is a multi-tenant platform. All repair jobs, customer names, phone numbers, hardware passcodes, and invoices entered by your shop are strictly isolated to your shop identifier. Neither other shops nor unauthorized third parties can access your data.
          </p>

          <h2 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
            2. Encrypted Hardware Passcodes
          </h2>
          <p className="mb-6">
            Customer device PINs, patterns, and Windows passwords collected during bench intake are encrypted using AES-256-GCM. Passcodes are accessible only to authorized shop technicians during active repairs and are never visible to platform administrators.
          </p>

          <h2 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
            3. Data Retention & Preservation
          </h2>
          <p className="mb-6">
            We do not sell, rent, or monetize your business records. In the event of trial expiration or subscription pause, your data remains preserved and intact. You can log in anytime to review past records or renew your licence.
          </p>

          <h2 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
            4. Contact for Privacy Inquiries
          </h2>
          <p>
            For questions regarding privacy, data export, or account deletion, contact our Data Protection Officer at <strong className="text-[#0d0d0d] dark:text-[#ececec]">billing@kconnect.cloud</strong> or +91 98422 00000.
          </p>
        </div>
      </div>
    </div>
  );
};

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="w-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200 py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20 uppercase tracking-wider mb-4">
          <FileText size={13} />
          User Agreement
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-2">
          Terms of Service
        </h1>
        <div className="text-xs text-[#676767] dark:text-[#b4b4b4] mb-8">Last Updated: October 2026</div>

        <div className="p-6 sm:p-8 rounded-2xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f] text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed">
          <h2 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
            1. SaaS Platform License
          </h2>
          <p className="mb-6">
            K-Connect grants registered repair laboratories a non-exclusive, non-transferable licence to use the service management platform for legitimate computer, electronics, and mobile repair operations for the duration of an active trial or paid annual term.
          </p>

          <h2 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
            2. 14-Day Free Trial Policy
          </h2>
          <p className="mb-6">
            New shops receive 14 days of free access starting from registration. Trial access is provided on a 1-trial-per-shop basis. Creating automated duplicate accounts to circumvent subscription renewal is strictly prohibited.
          </p>

          <h2 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
            3. Annual Subscription & GPay Verification
          </h2>
          <p className="mb-6">
            Annual subscription licences are billed in Indian Rupees (INR) at the rate configured in the active plan (₹14,999/year). Payments are collected via UPI/Google Pay and manually approved by the platform operator after verifying the 12-digit bank UTR reference. Licences run for exactly 365 days.
          </p>

          <h2 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
            4. Acceptable Bench Use
          </h2>
          <p>
            Users agree not to upload malicious payloads, reverse engineer platform source code, or attempt to compromise other tenants’ repair records.
          </p>
        </div>
      </div>
    </div>
  );
};

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="w-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200 py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20 uppercase tracking-wider mb-4">
          <RefreshCw size={13} />
          Subscription Terms
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-2">
          Refund & Cancellation Policy
        </h1>
        <div className="text-xs text-[#676767] dark:text-[#b4b4b4] mb-8">Last Updated: October 2026</div>

        <div className="p-6 sm:p-8 rounded-2xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f] text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed">
          <h2 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
            1. 14-Day Risk-Free Trial Evaluation
          </h2>
          <p className="mb-6">
            We provide an unrestricted 14-day free trial so that you can thoroughly test K-Connect on your front desk and technician benches before paying any subscription fee.
          </p>

          <h2 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
            2. 7-Day Money-Back Guarantee After Payment
          </h2>
          <p className="mb-6">
            If you purchase an annual licence and find that K-Connect does not suit your lab’s technical requirements, you may request a 100% refund within 7 calendar days of your payment approval date.
          </p>

          <h2 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
            3. How to Request a Refund
          </h2>
          <p className="mb-6">
            To initiate a refund, email <strong className="text-[#0d0d0d] dark:text-[#ececec]">billing@kconnect.cloud</strong> or message our support phone (+91 98422 00000) with your shop slug, registered phone number, and UPI ID. Approved refunds are processed directly back to your original bank account within 3-5 business days.
          </p>

          <h2 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
            4. Data Preservation After Cancellation
          </h2>
          <p>
            Upon cancellation or refund, your active operational licence is revoked, but your past repair records remain safely preserved in read-only format for your accounting and GST compliance.
          </p>
        </div>
      </div>
    </div>
  );
};
