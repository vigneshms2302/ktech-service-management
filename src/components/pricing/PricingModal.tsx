import React, { useState } from 'react';
import { X, Check, Sparkles, Building2, Zap, ShieldCheck } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const { shopSettings } = useShop();

  if (!isOpen) return null;

  const handleSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      onClose();
    }, 2200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        animation: 'fadeIn 0.15s ease-out',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          backgroundColor: '#212121',
          color: '#ececec',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.85)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'transparent',
            border: 'none',
            color: '#8e8ea0',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ececec')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#8e8ea0')}
        >
          <X size={22} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(16, 163, 127, 0.15)',
              border: '1px solid rgba(16, 163, 127, 0.3)',
              color: '#10a37f',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '10px',
            }}
          >
            <Sparkles size={14} />
            K-Connect SaaS Plans
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#f3f3f3', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Upgrade your repair shop plan
          </h2>
          <p style={{ fontSize: '14px', color: '#b4b4b4', margin: 0 }}>
            Sync counters, technicians, and invoicing across all computers with cloud reliability.
          </p>

          {/* Billing Cycle Switcher */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px',
              borderRadius: '9999px',
              backgroundColor: '#171717',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginTop: '16px',
            }}
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '6px 16px',
                borderRadius: '9999px',
                border: 'none',
                background: billingCycle === 'monthly' ? '#2f2f2f' : 'transparent',
                color: billingCycle === 'monthly' ? '#ececec' : '#8e8ea0',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              style={{
                padding: '6px 16px',
                borderRadius: '9999px',
                border: 'none',
                background: billingCycle === 'annual' ? '#10a37f' : 'transparent',
                color: billingCycle === 'annual' ? '#ffffff' : '#8e8ea0',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Annual Billing
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  backgroundColor: billingCycle === 'annual' ? 'rgba(0,0,0,0.25)' : 'rgba(16, 163, 127, 0.2)',
                  color: billingCycle === 'annual' ? '#fff' : '#10a37f',
                  fontWeight: 700,
                }}
              >
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {showSuccessToast && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 163, 127, 0.2)',
              border: '1px solid #10a37f',
              color: '#ececec',
              fontSize: '13.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '20px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <ShieldCheck size={18} color="#10a37f" />
            Plan updated to {selectedPlan}! Multi-device cloud sync enabled.
          </div>
        )}

        {/* 3-Card Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Card 1: Starter / Free */}
          <div
            style={{
              backgroundColor: '#171717',
              borderRadius: '18px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f3f3f3' }}>Starter</div>
              <div style={{ fontSize: '12px', color: '#8e8ea0', marginTop: '2px' }}>
                For single-technician shops starting out
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ececec', margin: '14px 0 16px' }}>
                ₹0
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#8e8ea0' }}> / month</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  '1 Workstation counter seat',
                  'Up to 50 active repair jobs',
                  'Basic GST & non-GST bills',
                  'Standard thermal 80mm receipts',
                  'Manual WhatsApp message preview',
                  'Local SQLite storage mode',
                ].map((feat, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#b4b4b4' }}>
                    <Check size={14} color="#8e8ea0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              disabled
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '10px 16px',
                borderRadius: '9999px',
                backgroundColor: '#262626',
                color: '#8e8ea0',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'default',
              }}
            >
              Current Plan
            </button>
          </div>

          {/* Card 2: Shop Pro (Most Popular) */}
          <div
            style={{
              backgroundColor: '#171717',
              borderRadius: '18px',
              border: '2px solid #10a37f',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: '0 8px 30px rgba(16, 163, 127, 0.15)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-11px',
                right: '20px',
                backgroundColor: '#10a37f',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '9999px',
                letterSpacing: '0.5px',
              }}
            >
              MOST POPULAR
            </div>

            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f3f3f3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Shop Pro</span>
                <Sparkles size={16} color="#10a37f" />
              </div>
              <div style={{ fontSize: '12px', color: '#8e8ea0', marginTop: '2px' }}>
                For busy repair centers with front desk & technicians
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ececec', margin: '14px 0 16px' }}>
                ₹{billingCycle === 'annual' ? '799' : '999'}
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#8e8ea0' }}> / month</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Up to 5 synced workstations & laptops',
                  'Unlimited repair jobs & device tracking',
                  'Instant 1-Click WhatsApp customer alerts',
                  'Salvage & donor chip harvest tracking',
                  'Customer live QR status lookup portal',
                  'Auto-sync with cloud database',
                  'Daily automated cloud backups',
                  'Fast telephone & remote desktop support',
                ].map((feat, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#ececec' }}>
                    <Check size={14} color="#10a37f" strokeWidth={2.5} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSelectPlan('Shop Pro')}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '11px 16px',
                borderRadius: '9999px',
                backgroundColor: '#10a37f',
                color: '#ffffff',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(16, 163, 127, 0.4)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#1a7f64')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#10a37f')}
            >
              <Zap size={15} />
              Upgrade to Pro
            </button>
          </div>

          {/* Card 3: Multi-Branch Enterprise */}
          <div
            style={{
              backgroundColor: '#171717',
              borderRadius: '18px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f3f3f3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Enterprise</span>
                <Building2 size={16} color="#8e8ea0" />
              </div>
              <div style={{ fontSize: '12px', color: '#8e8ea0', marginTop: '2px' }}>
                For multi-branch chains & corporate centers
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ececec', margin: '14px 0 16px' }}>
                ₹{billingCycle === 'annual' ? '1,999' : '2,499'}
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#8e8ea0' }}> / month</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Unlimited branch stores & counters',
                  'Dedicated PostgreSQL cloud database',
                  'White-label receipt branding & domain',
                  'Automated WhatsApp Cloud API delivery',
                  'Full audit trail & advanced financial reports',
                  'Dedicated account manager & 24/7 SLA',
                ].map((feat, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#b4b4b4' }}>
                    <Check size={14} color="#10a37f" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSelectPlan('Enterprise')}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '10px 16px',
                borderRadius: '9999px',
                backgroundColor: '#2f2f2f',
                color: '#ececec',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#383838')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#2f2f2f')}
            >
              Upgrade to Enterprise
            </button>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#8e8ea0',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '16px',
          }}
        >
          Active Shop: <strong style={{ color: '#ececec' }}>{shopSettings.shopName || 'KTech Computers'}</strong> • Cancel or switch plans anytime. All payments processed with 100% data security.
        </div>
      </div>
    </div>
  );
};
