import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  ArrowRight,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { saasApi } from '../../api/client.ts';

export const PricingPage: React.FC = () => {
  const [platformSettings, setPlatformSettings] = useState<{
    annualPriceInr: number;
    payeeName: string;
    upiId: string;
    trialDurationDays: number;
  }>({
    annualPriceInr: 14999,
    payeeName: 'K-Connect Cloud SaaS Technologies',
    upiId: 'ktech@upi',
    trialDurationDays: 14,
  });

  useEffect(() => {
    saasApi.public.getSettings().then((res) => {
      if (res.success && res.data) {
        setPlatformSettings({
          annualPriceInr: res.data.annualPriceInr || 14999,
          payeeName: res.data.payeeName || 'K-Connect Cloud SaaS Technologies',
          upiId: res.data.upiId || 'ktech@upi',
          trialDurationDays: res.data.trialDurationDays || 14,
        });
      }
    });
  }, []);

  const faqs = [
    {
      q: 'How does the 14-day free trial work?',
      a: 'When you register your shop, your 14-day trial starts immediately with full access to all features, multi-device cloud sync, and 5 seats. No credit card or payment is required upfront.',
    },
    {
      q: 'How do I pay for the annual subscription?',
      a: `Payments are made directly via Google Pay, PhonePe, Paytm, or any UPI app by scanning our verified official QR code or sending to ${platformSettings.upiId}. Once you submit your 12-digit UTR reference, our team manually verifies the bank credit and activates your 365-day licence.`,
    },
    {
      q: 'What happens to my data after the 14-day trial expires?',
      a: 'All your customer data, job cards, inventory records, and invoices remain completely preserved and safe. You will never lose records. Simply complete the annual renewal to resume full operational access.',
    },
    {
      q: 'Can multiple computers in my shop use K-Connect at the same time?',
      a: 'Yes! Your annual plan includes 5 concurrent staff seats. Your front desk reception desktop, technician bench laptops, and shop owner mobile browser can all work simultaneously on the same live database.',
    },
    {
      q: 'Do you charge transaction fees on customer payments?',
      a: 'Zero transaction fees. K-Connect does not touch or cut fees from your customer payments. When customers pay your shop via your shop UPI QR code, 100% goes directly to your bank account.',
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200">
      {/* Header */}
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20 uppercase tracking-wider mb-4">
          <ShieldCheck size={13} />
          Predictable Pricing
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-4">
          One Plan. Full Power. No Hidden Fees.
        </h1>
        <p className="text-base sm:text-lg text-[#676767] dark:text-[#b4b4b4] max-w-2xl mx-auto leading-relaxed">
          Start with a risk-free {platformSettings.trialDurationDays}-day trial. Upgrade to an annual licence via convenient Google Pay QR verification.
        </p>
      </section>

      {/* Main Pricing Box */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-2xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          {/* Header Bar */}
          <div className="p-6 sm:p-8 bg-[#f9f9f9] dark:bg-[#171717] border-b border-[#e5e5e5] dark:border-[#2f2f2f] flex justify-between items-center flex-wrap gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#10a37f]">
                Full Commercial Lab License
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0d0d0d] dark:text-[#ececec] mt-1">
                K-Connect Professional Annual
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#0d0d0d] text-white dark:bg-[#ececec] dark:text-[#0d0d0d]">
              Includes {platformSettings.trialDurationDays}-Day Free Trial
            </span>
          </div>

          <div className="p-6 sm:p-8">
            {/* Price Display */}
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0d0d0d] dark:text-[#ececec]">
                ₹{platformSettings.annualPriceInr.toLocaleString('en-IN')}
              </span>
              <span className="text-base text-[#676767] dark:text-[#b4b4b4]">/ year</span>
              <span className="text-xs sm:text-sm font-semibold text-[#10a37f] ml-2">
                (₹{Math.round(platformSettings.annualPriceInr / 12).toLocaleString('en-IN')}/month)
              </span>
            </div>

            <p className="text-sm text-[#676767] dark:text-[#b4b4b4] mb-8 leading-relaxed">
              Full commercial licence for 1 shop location. Includes 5 workstation seats, unlimited service tickets, automated GST reporting, and priority technical support.
            </p>

            {/* Included features list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
              {[
                'Unlimited computer, laptop & mobile repair jobs',
                '13-stage diagnostic state machine',
                'Multi-tier spare parts & scrap salvage lineage',
                'Customer WhatsApp estimates & status tracking',
                'Indian GST tax invoices (CGST/SGST/IGST)',
                'Encrypted hardware passcode vault (AES-256)',
                'Thermal 80mm intake receipt slip printing',
                '5 concurrent staff workstation seats',
                'Daily automated cloud data backup',
                'Direct phone & WhatsApp technical support',
              ].map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-[#0d0d0d] dark:text-[#ececec]">
                  <CheckCircle size={15} className="text-[#10a37f] shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#e5e5e5] dark:border-[#2f2f2f]">
              <Link
                to="/signup"
                className="flex-1 py-3 px-5 bg-[#0d0d0d] text-white hover:bg-[#262626] dark:bg-[#ececec] dark:text-[#0d0d0d] dark:hover:bg-white rounded-xl font-medium text-sm text-center no-underline flex items-center justify-center gap-2 transition-colors shadow-none"
              >
                Start 14-Day Free Trial <ArrowRight size={15} />
              </Link>
              <Link
                to="/checkout/annual"
                className="py-3 px-5 bg-transparent text-[#0d0d0d] dark:text-[#ececec] border border-[#e5e5e5] dark:border-[#2f2f2f] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl font-medium text-sm text-center no-underline flex items-center justify-center gap-2 transition-colors"
              >
                <QrCode size={15} /> View GPay Payment Details
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Process Explanation */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <div className="p-6 sm:p-8 rounded-2xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f]">
          <h3 className="text-lg font-bold text-[#0d0d0d] dark:text-[#ececec] mb-4">
            How Annual GPay Activation Works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4]">
            <div>
              <div className="font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-1">
                1. Start 14-Day Free Trial
              </div>
              Register your shop in 30 seconds. Test all features on your bench with zero payment.
            </div>
            <div>
              <div className="font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-1">
                2. Scan Official GPay QR
              </div>
              Pay ₹{platformSettings.annualPriceInr.toLocaleString('en-IN')} using Google Pay, PhonePe, or UPI to {platformSettings.upiId}.
            </div>
            <div>
              <div className="font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-1">
                3. Verified & Activated
              </div>
              Submit your 12-digit UTR ID. The platform owner manually verifies your payment and activates your 365-day licence.
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="text-2xl font-bold tracking-tight text-center text-[#0d0d0d] dark:text-[#ececec] mb-8">
          Frequently Asked Questions
        </h2>
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="p-5 rounded-xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f]"
            >
              <div className="text-sm sm:text-base font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-1.5">
                {faq.q}
              </div>
              <div className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed">
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
