import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Copy,
  Send,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { saasApi } from '../../api/client.ts';

export const AnnualCheckoutPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [data, setData] = useState<{
    shop: any;
    subscription: any;
    latestClaim: any;
    paymentConfig: any;
  } | null>(null);

  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await saasApi.subscription.getStatus();
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.latestClaim?.status === 'PENDING') {
          setSuccess(`Your payment claim (${res.data.latestClaim.upiTransactionId}) is currently under review by our team.`);
        }
      }
    } catch (err: unknown) {
      console.warn('Could not load subscription status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopyUpi = () => {
    const upi = data?.paymentConfig?.upiId || 'ktech@upi';
    navigator.clipboard.writeText(upi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiTransactionId.trim()) {
      setError('Please enter your 12-digit UPI / UTR Transaction Reference ID.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await saasApi.subscription.submitClaim({
        upiTransactionId: upiTransactionId.trim(),
        customerNotes: customerNotes.trim(),
        planCode: 'PRO_ANNUAL',
      });

      if (res.success) {
        setSuccess('Payment claim submitted successfully! The Super Admin will verify bank receipt and activate your licence.');
        setUpiTransactionId('');
        setCustomerNotes('');
        await fetchStatus();
      } else {
        setError(res.error || 'Failed to submit payment claim.');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Communication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';
  const inputBg = isLight ? '#f9fafb' : '#171717';

  const price = data?.paymentConfig?.annualPriceInr || 14999;
  const upiId = data?.paymentConfig?.upiId || 'ktech@upi';
  const payeeName = data?.paymentConfig?.payeeName || 'K-Connect Cloud SaaS Technologies';
  const customQrImage = data?.paymentConfig?.qrImageUrl && !data.paymentConfig.qrImageUrl.includes('/storage/gpay_qr_code.png') ? data.paymentConfig.qrImageUrl : null;

  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${price}&cu=INR&tn=${encodeURIComponent('K-Connect Annual Subscription')}`;
  const qrCodeUrl = customQrImage || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(upiUri)}`;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: bg,
        color: textMain,
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: '50px 20px',
      }}
    >
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <Link
            to="/app/dashboard"
            style={{
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#10a37f',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Return to Shop Workspace
          </Link>
          <span style={{ fontSize: '12px', color: textMuted }}>
            Shop: <strong>{data?.shop?.name || 'Your Shop'}</strong>
          </span>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(16, 163, 127, 0.12)',
              color: '#10a37f',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            <ShieldCheck size={14} /> Official GPay Annual Subscription Checkout
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Activate Your 365-Day Commercial Lab Licence
          </h1>
          <p style={{ fontSize: '14px', color: textMuted, maxWidth: '600px', margin: '0 auto' }}>
            Scan the verified Google Pay QR code below or transfer to our official UPI VPA. Submit your 12-digit transaction reference for manual verification.
          </p>
        </div>

        {/* Status Messages */}
        {success && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 163, 127, 0.12)',
              border: '1px solid #10a37f',
              color: '#10a37f',
              fontSize: '13.5px',
              marginBottom: '28px',
            }}
          >
            <CheckCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, marginBottom: '2px' }}>Payment Claim Status</div>
              <div>{success}</div>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              fontSize: '13.5px',
              marginBottom: '28px',
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Two-Column Checkout Box */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          {/* Left Column: QR Code & Payee Details */}
          <div
            style={{
              padding: '32px',
              borderRadius: '16px',
              backgroundColor: cardBg,
              border: `1px solid ${borderCol}`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>
              Amount Payable (Annual License)
            </div>
            <div style={{ fontSize: '38px', fontWeight: 900, color: textMain, marginBottom: '20px' }}>
              ₹{price.toLocaleString('en-IN')}
            </div>

            {/* Generated Scannable QR Code Card */}
            <div
              style={{
                width: '220px',
                minHeight: '220px',
                margin: '0 auto 20px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e5e7eb',
              }}
            >
              <img
                src={qrCodeUrl}
                alt="Google Pay / UPI QR Code"
                style={{ width: '160px', height: '160px', objectFit: 'contain' }}
              />
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#000000', marginTop: '6px', letterSpacing: '0.5px' }}>
                GOOGLE PAY / UPI SCAN & PAY
              </div>
            </div>

            {/* Mobile Direct Pay Action */}
            <a
              href={upiUri}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#10a37f',
                color: '#ffffff',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
                marginBottom: '16px',
              }}
            >
              📱 Tap to Pay in UPI App (GPay / PhonePe)
            </a>

            {/* Payee Info */}
            <div style={{ textAlign: 'left', backgroundColor: isLight ? '#f9fafb' : '#161616', padding: '16px', borderRadius: '10px', border: `1px solid ${borderCol}`, marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: textMuted, textTransform: 'uppercase', fontWeight: 700 }}>Payee Name</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: textMain, marginTop: '2px', marginBottom: '10px' }}>
                {payeeName}
              </div>

              <div style={{ fontSize: '11px', color: textMuted, textTransform: 'uppercase', fontWeight: 700 }}>Official UPI VPA</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: '#10a37f' }}>
                  {upiId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: isLight ? '#ffffff' : '#222222',
                    color: textMain,
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: textMuted, lineHeight: 1.5 }}>
              Accepted apps: <strong>Google Pay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, <strong>BHIM</strong>, or any Indian bank UPI application.
            </div>
          </div>

          {/* Right Column: Claim Submission Form */}
          <div
            style={{
              padding: '32px',
              borderRadius: '16px',
              backgroundColor: cardBg,
              border: `1px solid ${borderCol}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Send size={18} color="#10a37f" />
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Submit Payment Claim</h2>
            </div>
            <p style={{ fontSize: '13px', color: textMuted, lineHeight: 1.6, marginBottom: '20px' }}>
              Once you have transferred ₹{price.toLocaleString('en-IN')}, enter your 12-digit UPI Transaction / UTR ID below.
            </p>

            <form onSubmit={handleSubmitClaim} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  12-Digit UPI / UTR Transaction ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 428482910394"
                  value={upiTransactionId}
                  onChange={(e) => setUpiTransactionId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '15px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontSize: '11px', color: textMuted, marginTop: '4px', display: 'block' }}>
                  Found in your GPay receipt under "UPI transaction ID" or "Google transaction ID".
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Paid from HDFC account in name of Ramesh Kumar..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: isLight ? '#f3f4f6' : '#171717',
                  border: `1px solid ${borderCol}`,
                  fontSize: '12px',
                  color: textMuted,
                  lineHeight: 1.5,
                }}
              >
                🔒 <strong>Manual Verification Process:</strong> Our platform owner verifies bank receipt directly. Once confirmed, your subscription status updates to <strong>ACTIVE (365 Days)</strong> automatically.
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '13px',
                  backgroundColor: '#10a37f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14.5px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 163, 127, 0.3)',
                }}
              >
                {isSubmitting ? 'Submitting Claim...' : 'Submit Claim for Manual Verification'}
              </button>
            </form>
          </div>
        </div>

        {/* Support info banner */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: textMuted }}>
          Need urgent activation? Call or WhatsApp our billing desk at{' '}
          <strong style={{ color: textMain }}>{data?.paymentConfig?.supportPhone || '+91 98422 00000'}</strong>
        </div>
      </div>
    </div>
  );
};
