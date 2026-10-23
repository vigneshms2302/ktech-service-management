import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';

export const FaqPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';

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
    <div style={{ backgroundColor: bg, color: textMain, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <section style={{ padding: '70px 20px 40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#10a37f', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
          Got Questions?
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 50px)', fontWeight: 900, letterSpacing: '-1.2px', marginBottom: '20px' }}>
          Frequently Asked Questions
        </h1>
        <p style={{ fontSize: '16px', color: textMuted, lineHeight: 1.6, marginBottom: '30px' }}>
          Everything you need to know about K-Connect setup, subscriptions, GPay payments, and multi-workstation sync.
        </p>

        {/* Search Input */}
        <div
          style={{
            position: 'relative',
            maxWidth: '500px',
            margin: '0 auto',
          }}
        >
          <Search size={18} color={textMuted} style={{ position: 'absolute', left: '16px', top: '14px' }} />
          <input
            type="text"
            placeholder="Search questions (e.g. GST, GPay, seats, trial)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 46px',
              borderRadius: '10px',
              border: `1px solid ${borderCol}`,
              backgroundColor: cardBg,
              color: textMain,
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </section>

      {/* Accordion FAQ List */}
      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredFaqs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: textMuted }}>
              No matching questions found for "{searchQuery}". Feel free to contact our support team.
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  style={{
                    borderRadius: '12px',
                    backgroundColor: cardBg,
                    border: `1px solid ${isOpen ? '#10a37f' : borderCol}`,
                    overflow: 'hidden',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '18px 20px',
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: textMain,
                      fontSize: '15px',
                      fontWeight: 700,
                    }}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} color="#10a37f" /> : <ChevronDown size={18} color={textMuted} />}
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: '0 20px 18px',
                        fontSize: '14px',
                        color: textMuted,
                        lineHeight: 1.6,
                        borderTop: `1px solid ${isLight ? '#f3f4f6' : '#1c1c1c'}`,
                        paddingTop: '14px',
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Still Have Questions CTA */}
        <div
          style={{
            marginTop: '50px',
            padding: '30px',
            borderRadius: '14px',
            backgroundColor: isLight ? '#f9fafb' : '#141414',
            border: `1px solid ${borderCol}`,
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Still have questions?</h3>
          <p style={{ fontSize: '14px', color: textMuted, marginBottom: '20px' }}>
            Our team is available on phone and WhatsApp to answer any specific hardware questions.
          </p>
          <Link
            to="/contact"
            style={{
              padding: '10px 20px',
              backgroundColor: '#10a37f',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13.5px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Contact Sales & Support <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
};
