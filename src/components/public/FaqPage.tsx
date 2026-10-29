import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, ArrowRight, HelpCircle } from 'lucide-react';

export const FaqPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const allFaqs = [
    {
      category: 'Trial & Subscription',
      q: 'How does the 14-day free trial work?',
      a: 'The moment you register your shop on K-Connect, your 14-day trial starts immediately. You receive full access to all features, including unlimited job cards, inventory, GST billing, and 5 workstation seats. No credit card is required.',
    },
    {
      category: 'Trial & Subscription',
      q: 'How do I pay for the annual subscription?',
      a: 'Subscription payments are collected directly via our official Google Pay / UPI QR code. Once you make the payment of ₹14,999/year via any UPI app (GPay, PhonePe, Paytm), enter your 12-digit UTR reference ID on the checkout page. The platform owner manually verifies your bank credit and activates your 365-day licence.',
    },
    {
      category: 'Trial & Subscription',
      q: 'Will my data be deleted if my trial or subscription expires?',
      a: 'Never. Your business data is 100% preserved. If your trial or subscription expires, operational features like creating new tickets are temporarily paused, but you can always log in to view your records or complete your annual renewal to restore full bench access.',
    },
    {
      category: 'Devices & Sync',
      q: 'Can multiple computers in our shop work at the same time?',
      a: 'Yes! K-Connect includes 5 workstation seats per shop. Your front desk desktop, chip-level bench laptops, and the shop owner’s smartphone can all use K-Connect simultaneously. All job cards and inventory updates sync in real time.',
    },
    {
      category: 'Devices & Sync',
      q: 'Can I install K-Connect as an app on my desktop or mobile?',
      a: 'Yes. K-Connect is built as an installable Progressive Web App (PWA). In Google Chrome or Microsoft Edge, click the "Install App" button in the address bar to add K-Connect directly to your Windows desktop or mobile home screen.',
    },
    {
      category: 'Billing & Taxes',
      q: 'Does K-Connect support Indian GST billing?',
      a: 'Yes. K-Connect has a built-in Indian GST calculation engine supporting intra-state CGST (9%) + SGST (9%) or inter-state IGST (18%). You can print both thermal 80mm receipts and formal A4 GST tax invoices with HSN/SAC codes.',
    },
    {
      category: 'Security & Privacy',
      q: 'How are customer device passcodes protected?',
      a: 'Customer PINs, pattern locks, and BIOS passwords entered during intake are encrypted using AES-256-GCM. Passcodes are unlocked only by authorized technicians and masked upon logout. A tamper-proof audit log records every passcode access.',
    },
    {
      category: 'Security & Privacy',
      q: 'Can other repair shops see my customer records?',
      a: 'No. K-Connect enforces strict shop-level tenant isolation across all database queries. Every job card, customer, phone number, and invoice is cryptographically and logically isolated to your shop ID.',
    },
  ];

  const filteredFaqs = allFaqs.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200">
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20 uppercase tracking-wider mb-4">
          <HelpCircle size={13} />
          Got Questions?
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-base sm:text-lg text-[#676767] dark:text-[#b4b4b4] max-w-2xl mx-auto leading-relaxed mb-8">
          Everything you need to know about K-Connect setup, subscriptions, GPay payments, and multi-workstation sync.
        </p>

        {/* Search Input */}
        <div className="relative max-w-md mx-auto">
          <Search size={16} className="absolute left-3.5 top-3.5 text-[#676767] dark:text-[#b4b4b4]" />
          <input
            type="text"
            placeholder="Search questions (e.g. GST, GPay, seats)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e5e5e5] dark:border-[#2f2f2f] bg-white dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] text-sm outline-none focus:border-[#0d0d0d] dark:focus:border-[#ececec] transition-colors"
          />
        </div>
      </section>

      {/* Accordion FAQ List */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex flex-col gap-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 text-[#676767] dark:text-[#b4b4b4] text-sm">
              No matching questions found for "{searchQuery}". Feel free to contact our support team.
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] overflow-hidden transition-all shadow-sm"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left bg-transparent border-none flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#10a37f] mr-2">
                        {faq.category}
                      </span>
                      <h2 className="text-sm sm:text-base font-semibold text-[#0d0d0d] dark:text-[#ececec] mt-0.5">
                        {faq.q}
                      </h2>
                    </div>
                    <span className="text-[#676767] dark:text-[#b4b4b4] shrink-0">
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed border-t border-[#f0f0f0] dark:border-[#2a2a2a] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* CTA Banner */}
        <div className="mt-14 p-8 rounded-2xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f] text-center">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-2">
            Have more questions?
          </h3>
          <p className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] max-w-lg mx-auto mb-5">
            Our engineers and founders are available directly on WhatsApp and phone.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0d0d0d] text-white hover:bg-[#262626] dark:bg-[#ececec] dark:text-[#0d0d0d] dark:hover:bg-white rounded-xl font-medium text-xs sm:text-sm transition-colors no-underline shadow-none"
            >
              Contact Support <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
