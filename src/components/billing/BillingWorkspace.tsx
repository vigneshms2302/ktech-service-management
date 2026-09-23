import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Printer,
  Send,
  Search,
} from 'lucide-react';
import { formatPhoneDisplay } from '../../utils/phone.ts';
import {
  autoCorrectTitle,
  autoCorrectCode,
  autoCorrectGeneralText,
  handleAutoCorrectKeyDown,
} from '../../utils/autoCorrect.ts';
import { useShop } from '../../context/ShopContext.tsx';

export const BillingWorkspace: React.FC = () => {
  const { shopSettings } = useShop();
  const [activeTab, setActiveTab] = useState<'invoices' | 'quotations'>('invoices');
  const [invoices, setInvoices] = useState<Array<Record<string, unknown>>>([]);
  const [quotations, setQuotations] = useState<Array<Record<string, unknown>>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Print Preview Modal
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<{
    invoice: Record<string, unknown>;
    items: Array<Record<string, unknown>>;
    payments: Array<Record<string, unknown>>;
  } | null>(null);

  // Quotation Print Preview Modal
  const [selectedQuotationForPrint, setSelectedQuotationForPrint] = useState<{
    quotation: Record<string, unknown>;
    items: Array<Record<string, unknown>>;
    approval: Record<string, unknown> | null;
  } | null>(null);

  // Collect Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Record<string, unknown> | null>(null);
  const [payAmountStr, setPayAmountStr] = useState('');
  const payAmount = Number(payAmountStr) || 0;
  const [payMode, setPayMode] = useState<string>('UPI_QR');
  const [customPayMode, setCustomPayMode] = useState('');
  const [payRef, setPayRef] = useState('');
  const [markDelivered, setMarkDelivered] = useState(true);

  // Capture Approval Modal
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedQuotationForApproval, setSelectedQuotationForApproval] = useState<Record<string, unknown> | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'APPROVED' | 'PARTIAL_APPROVAL' | 'REJECTED'>('APPROVED');
  const [approvedAmountStr, setApprovedAmountStr] = useState('');
  const approvedAmount = Number(approvedAmountStr) || 0;
  const [approvalMethod, setApprovalMethod] = useState<string>('WHATSAPP');
  const [customApprovalMethod, setCustomApprovalMethod] = useState('');
  const [approvalContact, setApprovalContact] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  const fetchBillingData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.billing?.listInvoices) {
        const iRes = await window.electronAPI.billing.listInvoices({
          search: searchQuery.trim() || undefined,
          paymentStatus: selectedStatus || undefined,
        });
        if (iRes.success && iRes.data) setInvoices(iRes.data);
      }

      if (window.electronAPI?.billing?.listQuotations) {
        const qRes = await window.electronAPI.billing.listQuotations({
          search: searchQuery.trim() || undefined,
          status: selectedStatus || undefined,
        });
        if (qRes.success && qRes.data) setQuotations(qRes.data);
      }
    } catch (err) {
      console.error('Failed to load billing records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedStatus]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleOpenPrintPreview = async (invoiceId: string) => {
    if (!window.electronAPI?.billing?.getInvoiceById) return;
    const res = await window.electronAPI.billing.getInvoiceById({ invoiceId });
    if (res.success && res.data) {
      setSelectedInvoiceForPrint(res.data as typeof selectedInvoiceForPrint);
    }
  };

  const handleOpenQuotationPrintPreview = async (quotationId: string) => {
    if (!window.electronAPI?.billing?.getQuotationById) return;
    const res = await window.electronAPI.billing.getQuotationById({ quotationId });
    if (res.success && res.data) {
      setSelectedQuotationForPrint(res.data as typeof selectedQuotationForPrint);
    }
  };

  const handleToggleInvoiceGstInBilling = async (newGstState: boolean) => {
    if (!selectedInvoiceForPrint) return;
    try {
      if (!window.electronAPI?.billing?.toggleInvoiceGst) return;
      const res = await window.electronAPI.billing.toggleInvoiceGst({
        invoiceId: String(selectedInvoiceForPrint.invoice.id),
        isGst: newGstState,
      });
      if (res.success) {
        handleOpenPrintPreview(String(selectedInvoiceForPrint.invoice.id));
        fetchBillingData();
      } else {
        alert(res.error || 'Failed to update GST setting on invoice');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleToggleQuotationGstInBilling = async (newGstState: boolean) => {
    if (!selectedQuotationForPrint) return;
    try {
      if (!window.electronAPI?.billing?.toggleQuotationGst) return;
      const res = await window.electronAPI.billing.toggleQuotationGst({
        quotationId: String(selectedQuotationForPrint.quotation.id),
        isGst: newGstState,
      });
      if (res.success) {
        handleOpenQuotationPrintPreview(String(selectedQuotationForPrint.quotation.id));
        fetchBillingData();
      } else {
        alert(res.error || 'Failed to update GST setting on quotation');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPay || payAmount <= 0) return;

    const finalPayMode = payMode === 'OTHER' && customPayMode.trim() ? customPayMode.trim() : payMode;

    try {
      if (!window.electronAPI?.billing?.recordPayment) return;
      const res = await window.electronAPI.billing.recordPayment({
        invoiceId: selectedInvoiceForPay.id as string,
        amount: payAmount,
        paymentMode: finalPayMode as any,
        transactionReference: payRef.trim() || undefined,
        markJobDelivered: markDelivered,
      });

      if (res.success && res.data) {
        const receiptNumber = res.data.receiptNumber;
        const amt = res.data.amountPaid;
        const custName = (selectedInvoiceForPay.customer_name as string) || 'Customer';
        const custPhone = (selectedInvoiceForPay.customer_phone as string) || '';
        const invNum = (selectedInvoiceForPay.invoice_number as string) || '';
        const remaining = Math.max(0, Number(selectedInvoiceForPay.balance_due || 0) - amt);

        setShowPaymentModal(false);
        setSelectedInvoiceForPay(null);
        setCustomPayMode('');
        fetchBillingData();

        if (window.confirm(`Payment of ₹${amt} recorded successfully! (Receipt: ${receiptNumber})\n\nWould you like to send a 1-click WhatsApp payment receipt to ${custName}?`)) {
          const cleanPhone = custPhone.replace(/[^0-9]/g, '');
          if (cleanPhone) {
            const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
            const shopUpper = (shopSettings.shopName || 'KTech Computers').toUpperCase();
            const shopName = shopSettings.shopName || 'KTech Computers';
            const shopPhone = shopSettings.phone || '+91 98400 12345';
            const msg = `*${shopUpper} - PAYMENT RECEIPT* 🧾\n\nDear *${custName}*,\nWe have received your payment of *₹${Number(amt).toFixed(2)}* via ${finalPayMode}.\n\n📋 *Receipt No:* ${receiptNumber}\n📄 *Invoice No:* ${invNum}\n💳 *Remaining Balance:* ₹${remaining.toFixed(2)}\n\nThank you for choosing ${shopName}!\nSupport: ${shopPhone}`;
            window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`, '_blank');
          }
        }
      } else {
        alert(res.error || 'Failed to record payment');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleRecordApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuotationForApproval || !approvalContact.trim()) return;

    const finalApprovalMethod = approvalMethod === 'OTHER' && customApprovalMethod.trim() ? customApprovalMethod.trim() : approvalMethod;

    try {
      if (!window.electronAPI?.billing?.recordApproval) return;
      const res = await window.electronAPI.billing.recordApproval({
        quotationId: selectedQuotationForApproval.id as string,
        approvalStatus,
        approvedAmount,
        approvalMethod: finalApprovalMethod as any,
        customerContactUsed: approvalContact.trim(),
        notes: approvalNotes.trim() || undefined,
      });

      if (res.success) {
        alert(`Customer approval status updated to ${approvalStatus}! Service ticket transitioned.`);
        setShowApprovalModal(false);
        setSelectedQuotationForApproval(null);
        setCustomApprovalMethod('');
        fetchBillingData();
      } else {
        alert(res.error || 'Failed to record approval');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  // Calculations
  const totalInvoiced = invoices.reduce((acc, inv) => acc + Number(inv.total_amount || 0), 0);
  const totalCollected = invoices.reduce((acc, inv) => acc + Number(inv.amount_paid || 0), 0);
  const totalDue = invoices.reduce((acc, inv) => acc + Number(inv.balance_due || 0), 0);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
      {/* Financial KPI Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Total Invoiced</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            ₹{totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Total Collected</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-success)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            ₹{totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: totalDue > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)', border: totalDue > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: totalDue > 0 ? '#f87171' : 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Outstanding Balance Due</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: totalDue > 0 ? '#f87171' : 'var(--text-main)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            ₹{totalDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Estimates Pending Approval</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#facc15', marginTop: '4px' }}>
            {quotations.filter((q) => q.status === 'PENDING').length} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>estimates</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setActiveTab('invoices')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'invoices' ? '2px solid var(--brand-primary)' : '2px solid transparent',
              backgroundColor: activeTab === 'invoices' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
              borderRadius: '6px 6px 0 0',
              color: activeTab === 'invoices' ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'invoices' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.12s ease',
            }}
          >
            <FileText size={14} color={activeTab === 'invoices' ? 'var(--brand-primary)' : 'var(--text-dim)'} />
            Tax Invoices & Receipts ({invoices.length})
          </button>

          <button
            onClick={() => setActiveTab('quotations')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'quotations' ? '2px solid var(--brand-primary)' : '2px solid transparent',
              backgroundColor: activeTab === 'quotations' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
              borderRadius: '6px 6px 0 0',
              color: activeTab === 'quotations' ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'quotations' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.12s ease',
            }}
          >
            <Send size={14} color={activeTab === 'quotations' ? 'var(--brand-primary)' : 'var(--text-dim)'} />
            Quotations & Approvals ({quotations.length})
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search invoice #, customer name, phone, job #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '12px',
              outline: 'none',
              boxShadow: 'none',
            }}
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{
            padding: '7px 10px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            fontSize: '12px',
          }}
        >
          <option value="">All Statuses</option>
          <option value="PAID">PAID</option>
          <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
          <option value="UNPAID">UNPAID / PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      {/* TAB 1: INVOICES LIST */}
      {activeTab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px' }}>Invoice #</th>
                  <th style={{ padding: '8px 12px' }}>Customer</th>
                  <th style={{ padding: '8px 12px' }}>Linked Job</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Amount ₹</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Paid ₹</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Balance Due ₹</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      No invoices recorded yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id as string} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        {inv.invoice_number as string}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inv.customer_name as string}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{formatPhoneDisplay(inv.customer_phone as string)}</div>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {(inv.job_number as string) || '--'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                        ₹{Number(inv.total_amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>
                        ₹{Number(inv.amount_paid || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: Number(inv.balance_due || 0) > 0 ? '#f87171' : 'var(--text-dim)' }}>
                        ₹{Number(inv.balance_due || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: inv.payment_status === 'PAID' ? 'rgba(34, 197, 94, 0.15)' : inv.payment_status === 'PARTIALLY_PAID' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: inv.payment_status === 'PAID' ? 'var(--color-success)' : inv.payment_status === 'PARTIALLY_PAID' ? '#facc15' : '#f87171',
                          }}
                        >
                          {(inv.payment_status as string).replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenPrintPreview(inv.id as string)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-main)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Printer size={12} /> Print A4
                          </button>

                          <button
                            onClick={() => {
                              const cleanPhone = String(inv.customer_phone || '').replace(/[^0-9]/g, '');
                              if (!cleanPhone) {
                                alert('No customer phone number found.');
                                return;
                              }
                              const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                              const shopUpper = (shopSettings.shopName || 'KTech Computers').toUpperCase();
                              const shopName = shopSettings.shopName || 'KTech Computers';
                              const shopPhone = shopSettings.phone || '+91 98400 12345';
                              const isGst = Boolean(inv.is_gst_invoice);
                              const msg = `*${shopUpper} - ${isGst ? 'TAX INVOICE' : 'FINAL SERVICE BILL'}* 🧾\n\nDear *${inv.customer_name}*,\nYour final bill *${inv.invoice_number}* has been issued.\n\n💰 *Total Bill Amount:* ₹${Number(inv.total_amount || 0).toFixed(2)}\n💵 *Amount Paid:* ₹${Number(inv.amount_paid || 0).toFixed(2)}\n💳 *Final Balance Due:* ₹${Number(inv.balance_due || 0).toFixed(2)}\n\nThank you for choosing ${shopName}!\n📞 ${shopPhone}`;
                              window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #22c55e',
                              backgroundColor: 'rgba(34, 197, 94, 0.1)',
                              color: '#22c55e',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            📲 WhatsApp
                          </button>

                          {Number(inv.balance_due || 0) > 0 && (
                            <button
                              onClick={() => {
                                setSelectedInvoiceForPay(inv);
                                setPayAmountStr(String(inv.balance_due || ''));
                                setShowPaymentModal(true);
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--color-success)',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Collect ₹
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: QUOTATIONS LIST */}
      {activeTab === 'quotations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px' }}>Estimate #</th>
                  <th style={{ padding: '8px 12px' }}>Customer & Contact</th>
                  <th style={{ padding: '8px 12px' }}>Linked Job</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Parts ₹</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Labor ₹</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Grand Total ₹</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Approval Status</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q.id as string} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#facc15' }}>
                      {q.quotation_number as string}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{q.customer_name as string}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{formatPhoneDisplay(q.customer_phone as string)}</div>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {(q.job_number as string) || '--'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      ₹{Number(q.parts_subtotal || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      ₹{Number(q.labor_subtotal || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                      ₹{Number(q.total_amount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: q.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.15)' : q.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: q.status === 'APPROVED' ? 'var(--color-success)' : q.status === 'REJECTED' ? '#f87171' : '#facc15',
                        }}
                      >
                        {(q.status as string).replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleOpenQuotationPrintPreview(q.id as string)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-main)',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Printer size={12} /> Print A4
                        </button>

                        <button
                          onClick={() => {
                            const cleanPhone = String(q.customer_phone || '').replace(/[^0-9]/g, '');
                            if (!cleanPhone) {
                              alert('No customer phone number found.');
                              return;
                            }
                            const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                            const shopUpper = (shopSettings.shopName || 'KTech Computers').toUpperCase();
                            const shopName = shopSettings.shopName || 'KTech Computers';
                            const shopPhone = shopSettings.phone || '+91 98400 12345';
                            const msg = `*${shopUpper} - SERVICE ESTIMATE* 📋\n\nDear *${q.customer_name}*,\nHere is the estimate for your service *${q.job_number || ''}*:\n\n📄 *Estimate No:* ${q.quotation_number}\n💰 *Estimated Total:* ₹${Number(q.total_amount || 0).toFixed(2)}\n\nPlease reply *APPROVE* to authorize repair work.\n📞 ${shopPhone} | ${shopName}`;
                            window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #22c55e',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            color: '#22c55e',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          📲 WhatsApp
                        </button>

                        {q.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedQuotationForApproval(q);
                              setApprovedAmountStr(String(q.total_amount || ''));
                              setApprovalContact((q.customer_phone as string) || '');
                              setShowApprovalModal(true);
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--brand-primary)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: COLLECT PAYMENT */}
      {showPaymentModal && selectedInvoiceForPay && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', maxWidth: '420px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
              Collect Payment: {selectedInvoiceForPay.invoice_number as string}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Customer: {selectedInvoiceForPay.customer_name as string} • Balance: ₹{Number(selectedInvoiceForPay.balance_due || 0).toFixed(2)}
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Payment Amount ₹ *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={payAmountStr}
                  onChange={(e) => setPayAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '13px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                >
                  <option value="UPI_QR">UPI QR (GPay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit / Debit Card POS</option>
                  <option value="NET_BANKING">Net Banking / IMPS / NEFT</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other (Type Custom Mode...)</option>
                </select>
                {payMode === 'OTHER' && (
                  <input
                    type="text"
                    placeholder="e.g. Sodexo, Gift Card, Crypto, Store Credit"
                    value={customPayMode}
                    onChange={(e) => setCustomPayMode(e.target.value)}
                    onKeyDown={(e) => handleAutoCorrectKeyDown(e, customPayMode, setCustomPayMode)}
                    onBlur={(e) => setCustomPayMode(autoCorrectTitle(e.target.value))}
                    spellCheck={true}
                    autoCorrect="on"
                    style={{ width: '100%', marginTop: '4px', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '11px' }}
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Transaction Ref / UPI UTR #</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref 329182390192"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  onBlur={(e) => setPayRef(autoCorrectCode(e.target.value))}
                  spellCheck={false}
                  autoCorrect="off"
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-main)', cursor: 'pointer', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={markDelivered}
                  onChange={(e) => setMarkDelivered(e.target.checked)}
                />
                Mark linked repair job as DELIVERED & Handed over
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', backgroundColor: 'var(--color-success)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Confirm & Print Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAPTURE QUOTATION APPROVAL */}
      {showApprovalModal && selectedQuotationForApproval && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', maxWidth: '440px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
              Capture Customer Approval: {selectedQuotationForApproval.quotation_number as string}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Customer: {selectedQuotationForApproval.customer_name as string} • Quoted: ₹{Number(selectedQuotationForApproval.total_amount || 0).toFixed(2)}
            </div>

            <form onSubmit={handleRecordApproval} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Approval Status</label>
                <select
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value as typeof approvalStatus)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 700 }}
                >
                  <option value="APPROVED">APPROVED (Proceed with Repair)</option>
                  <option value="PARTIAL_APPROVAL">PARTIAL APPROVAL</option>
                  <option value="REJECTED">REJECTED (Decline Estimate)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Approved Amount ₹</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={approvedAmountStr}
                  onChange={(e) => setApprovedAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Communication Method</label>
                <select
                  value={approvalMethod}
                  onChange={(e) => setApprovalMethod(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                >
                  <option value="WHATSAPP">WhatsApp Message</option>
                  <option value="PHONE_CALL">Phone Call Confirmation</option>
                  <option value="IN_PERSON">In-Person Counter Agreement</option>
                  <option value="EMAIL">Email</option>
                  <option value="OTHER">Other (Type Custom Method...)</option>
                </select>
                {approvalMethod === 'OTHER' && (
                  <input
                    type="text"
                    placeholder="e.g. SMS, Telegram, Purchase Order (PO)"
                    value={customApprovalMethod}
                    onChange={(e) => setCustomApprovalMethod(e.target.value)}
                    onKeyDown={(e) => handleAutoCorrectKeyDown(e, customApprovalMethod, setCustomApprovalMethod)}
                    onBlur={(e) => setCustomApprovalMethod(autoCorrectTitle(e.target.value))}
                    spellCheck={true}
                    autoCorrect="on"
                    style={{ width: '100%', marginTop: '4px', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '11px' }}
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Contact Used (Phone / Email) *</label>
                <input
                  type="text"
                  required
                  value={approvalContact}
                  onChange={(e) => setApprovalContact(e.target.value)}
                  onBlur={(e) => setApprovalContact(autoCorrectTitle(e.target.value))}
                  spellCheck={false}
                  autoCorrect="off"
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Notes / Customer Stipulations</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Customer agreed to ₹2,500 total, requested delivery by Saturday..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  onKeyDown={(e) => handleAutoCorrectKeyDown(e, approvalNotes, setApprovalNotes)}
                  onBlur={(e) => setApprovalNotes(autoCorrectGeneralText(e.target.value))}
                  spellCheck={true}
                  autoCorrect="on"
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Approval Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: A4 INVOICE / CASH MEMO PRINT PREVIEW */}
      {selectedInvoiceForPrint && (() => {
        const isInvoiceGst = Boolean(
          selectedInvoiceForPrint.invoice.is_gst_invoice === 1 ||
          selectedInvoiceForPrint.invoice.is_gst_invoice === true
        ) && (Number(selectedInvoiceForPrint.invoice.cgst_amount || 0) + Number(selectedInvoiceForPrint.invoice.sgst_amount || 0) > 0 || Number(selectedInvoiceForPrint.invoice.tax_total || 0) > 0);

        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '8px', maxWidth: '750px', width: '100%', padding: '24px', maxHeight: '92vh', overflowY: 'auto', fontFamily: 'sans-serif', position: 'relative' }}>
              {/* Modal Controls Bar (Hidden in Print) */}
              <div className="no-print" style={{ position: 'sticky', top: '-24px', backgroundColor: '#ffffff', zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingTop: '4px', paddingBottom: '12px', borderBottom: '2px solid #f1f5f9', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'inline-flex', padding: '3px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleInvoiceGstInBilling(false)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: !isInvoiceGst ? 800 : 600,
                      backgroundColor: !isInvoiceGst ? '#ffffff' : 'transparent',
                      color: !isInvoiceGst ? '#0f172a' : '#64748b',
                      boxShadow: !isInvoiceGst ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🚫 Non-GST Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleInvoiceGstInBilling(true)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: isInvoiceGst ? 800 : 600,
                      backgroundColor: isInvoiceGst ? '#0284c7' : 'transparent',
                      color: isInvoiceGst ? '#ffffff' : '#64748b',
                      boxShadow: isInvoiceGst ? '0 1px 3px rgba(2, 132, 199, 0.3)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🧾 18% GST Invoice
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => window.print()}
                    style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Printer size={13} /> Print
                  </button>
                  <button
                    onClick={() => setSelectedInvoiceForPrint(null)}
                    style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* Header with Shop details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '12px' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.5px' }}>
                    {(shopSettings.shopName || 'KTech Computers').toUpperCase()}
                  </h1>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    {shopSettings.tagline}<br />
                    {shopSettings.address}<br />
                    Phone: {shopSettings.phone} {shopSettings.gstin ? `| GSTIN: ${shopSettings.gstin}` : ''} {shopSettings.upiId ? `| UPI: ${shopSettings.upiId}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: isInvoiceGst ? '#1e3a8a' : '#166534' }}>
                    {isInvoiceGst ? 'TAX INVOICE / BILL OF SUPPLY' : 'FINAL SERVICE BILL / CASH MEMO'}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#2563eb', fontFamily: 'monospace' }}>
                    {selectedInvoiceForPrint.invoice.invoice_number as string}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    Date: {new Date(selectedInvoiceForPrint.invoice.created_at as string).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Billed To / Job Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', margin: '14px 0', fontSize: '11px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Customer Details:</div>
                  <div style={{ fontWeight: 800, fontSize: '12px' }}>{selectedInvoiceForPrint.invoice.customer_name as string}</div>
                  <div>Phone: {formatPhoneDisplay(selectedInvoiceForPrint.invoice.customer_phone as string)}</div>
                  {selectedInvoiceForPrint.invoice.customer_gstin ? <div>GSTIN: {String(selectedInvoiceForPrint.invoice.customer_gstin)}</div> : null}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Service Device:</div>
                  <div style={{ fontWeight: 700 }}>
                    [{selectedInvoiceForPrint.invoice.equipment_type as string}] {selectedInvoiceForPrint.invoice.device_brand as string} {selectedInvoiceForPrint.invoice.device_model as string}
                  </div>
                  {selectedInvoiceForPrint.invoice.job_number ? <div>Job Ref: {String(selectedInvoiceForPrint.invoice.job_number)}</div> : null}
                  {selectedInvoiceForPrint.invoice.device_serial ? <div>Serial #: {String(selectedInvoiceForPrint.invoice.device_serial)}</div> : null}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', margin: '10px 0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e2e8f0', color: '#1e293b', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px' }}>#</th>
                    <th style={{ padding: '6px 8px' }}>Description</th>
                    {isInvoiceGst && <th style={{ padding: '6px 8px' }}>HSN/SAC</th>}
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Rate ₹</th>
                    {isInvoiceGst && <th style={{ padding: '6px 8px', textAlign: 'right' }}>GST %</th>}
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoiceForPrint.items.map((item, idx) => (
                    <tr key={item.id as string} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{item.description as string}</td>
                      {isInvoiceGst && <td style={{ padding: '6px 8px', color: '#64748b' }}>{(item.hsn_sac_code as string) || '9987'}</td>}
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{item.quantity as number}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(item.unit_price || 0).toFixed(2)}</td>
                      {isInvoiceGst && <td style={{ padding: '6px 8px', textAlign: 'right' }}>{item.tax_rate as number}%</td>}
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{Number(item.total_amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & GST Split */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px' }}>
                <div style={{ maxWidth: '300px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>Terms & Conditions:</div>
                  <div style={{ color: '#64748b', fontSize: '10px', lineHeight: 1.4 }}>
                    1. 30-Day Service Warranty on replaced chip-level components.<br />
                    2. No warranty against liquid damage, electrical surges, or burnt components.<br />
                    3. Goods once sold will not be taken back.
                  </div>
                </div>

                <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>₹{Number((Number(selectedInvoiceForPrint.invoice.subtotal_parts || 0) + Number(selectedInvoiceForPrint.invoice.subtotal_labor || 0)) || selectedInvoiceForPrint.invoice.total_amount || 0).toFixed(2)}</span>
                  </div>
                  {isInvoiceGst ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>CGST (9%):</span>
                        <span>₹{Number(selectedInvoiceForPrint.invoice.cgst_amount || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>SGST (9%):</span>
                        <span>₹{Number(selectedInvoiceForPrint.invoice.sgst_amount || 0).toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px' }}>
                      <span>GST / Tax:</span>
                      <span>₹0.00 (Non-GST)</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #0f172a', paddingTop: '4px', fontWeight: 800, fontSize: '13px' }}>
                    <span>Total Amount:</span>
                    <span>₹{Number(selectedInvoiceForPrint.invoice.total_amount || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
                    <span>Amount Paid:</span>
                    <span>₹{Number(selectedInvoiceForPrint.invoice.amount_paid || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 700 }}>
                    <span>Balance Due:</span>
                    <span>₹{Number(selectedInvoiceForPrint.invoice.balance_due || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                  onClick={() => setSelectedInvoiceForPrint(null)}
                  style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: '#e2e8f0', border: 'none', color: '#0f172a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Close Preview
                </button>
                <button
                  onClick={() => window.print()}
                  style={{ padding: '6px 16px', borderRadius: '6px', backgroundColor: '#1e3a8a', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Printer size={13} /> Print Bill (Ctrl+P)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: A4 ESTIMATE / QUOTATION PRINT PREVIEW */}
      {selectedQuotationForPrint && (() => {
        const isQuotationGst = Number(selectedQuotationForPrint.quotation.tax_total || selectedQuotationForPrint.quotation.tax_amount || 0) > 0;

        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '8px', maxWidth: '750px', width: '100%', padding: '24px', maxHeight: '92vh', overflowY: 'auto', fontFamily: 'sans-serif', position: 'relative' }}>
              {/* Modal Controls Bar (Hidden in Print) */}
              <div className="no-print" style={{ position: 'sticky', top: '-24px', backgroundColor: '#ffffff', zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingTop: '4px', paddingBottom: '12px', borderBottom: '2px solid #f1f5f9', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'inline-flex', padding: '3px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleQuotationGstInBilling(false)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: !isQuotationGst ? 800 : 600,
                      backgroundColor: !isQuotationGst ? '#ffffff' : 'transparent',
                      color: !isQuotationGst ? '#0f172a' : '#64748b',
                      boxShadow: !isQuotationGst ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🚫 Non-GST (0% Tax)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleQuotationGstInBilling(true)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: isQuotationGst ? 800 : 600,
                      backgroundColor: isQuotationGst ? '#7e22ce' : 'transparent',
                      color: isQuotationGst ? '#ffffff' : '#64748b',
                      boxShadow: isQuotationGst ? '0 1px 3px rgba(126, 34, 206, 0.3)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🧾 18% GST Tax
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => window.print()}
                    style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: '#7e22ce', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Printer size={13} /> Print
                  </button>
                  <button
                    onClick={() => setSelectedQuotationForPrint(null)}
                    style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* Header with Shop details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #6b21a8', paddingBottom: '12px' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#6b21a8', letterSpacing: '0.5px' }}>
                    {(shopSettings.shopName || 'KTech Computers').toUpperCase()}
                  </h1>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    {shopSettings.tagline}<br />
                    {shopSettings.address}<br />
                    Phone: {shopSettings.phone} {shopSettings.gstin ? `| GSTIN: ${shopSettings.gstin}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: isQuotationGst ? '#7e22ce' : '#2563eb' }}>
                    {isQuotationGst ? 'REPAIR COST ESTIMATE (WITH GST)' : 'REPAIR COST ESTIMATE (NON-GST)'}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#6b21a8', fontFamily: 'monospace' }}>
                    {selectedQuotationForPrint.quotation.quotation_number as string}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    Date: {new Date(selectedQuotationForPrint.quotation.created_at as string).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Customer / Job Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', margin: '14px 0', fontSize: '11px', backgroundColor: '#faf5ff', padding: '10px', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#7e22ce', textTransform: 'uppercase', marginBottom: '2px' }}>Customer Details:</div>
                  <div style={{ fontWeight: 800, fontSize: '12px' }}>{selectedQuotationForPrint.quotation.customer_name as string}</div>
                  <div>Phone: {formatPhoneDisplay(selectedQuotationForPrint.quotation.customer_phone as string)}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#7e22ce', textTransform: 'uppercase', marginBottom: '2px' }}>Service Device:</div>
                  <div style={{ fontWeight: 700 }}>
                    {String(selectedQuotationForPrint.quotation.device_brand || '')} {String(selectedQuotationForPrint.quotation.device_model || '')}
                  </div>
                  {selectedQuotationForPrint.quotation.job_number ? <div>Job Ref: {String(selectedQuotationForPrint.quotation.job_number)}</div> : null}
                  {selectedQuotationForPrint.quotation.reported_issue ? <div>Issue: {String(selectedQuotationForPrint.quotation.reported_issue)}</div> : null}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', margin: '10px 0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3e8ff', color: '#581c87', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px' }}>#</th>
                    <th style={{ padding: '6px 8px' }}>Type</th>
                    <th style={{ padding: '6px 8px' }}>Description / Repair Action</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Rate ₹</th>
                    {isQuotationGst && <th style={{ padding: '6px 8px', textAlign: 'right' }}>GST %</th>}
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedQuotationForPrint.items.map((item, idx) => (
                    <tr key={item.id as string || idx} style={{ borderBottom: '1px solid #f3e8ff' }}>
                      <td style={{ padding: '6px 8px' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, backgroundColor: item.item_type === 'PART' ? '#fff7ed' : '#eff6ff', color: item.item_type === 'PART' ? '#c2410c' : '#1d4ed8' }}>
                          {String(item.item_type || 'LABOR')}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{item.description as string}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{Number(item.quantity || 1)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(item.unit_price || 0).toFixed(2)}</td>
                      {isQuotationGst && <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(item.tax_rate || 0)}%</td>}
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{Number(item.total_price || item.total_amount || (Number(item.quantity || 1) * Number(item.unit_price || 0))).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px' }}>
                <div style={{ maxWidth: '300px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>Quotation Terms:</div>
                  <div style={{ color: '#64748b', fontSize: '10px', lineHeight: 1.4 }}>
                    1. Validity: 7 days from estimate date.<br />
                    2. Estimated cost is subject to change if unrepairable internal defects are found during board repair.<br />
                    3. Work begins after customer approval.
                  </div>
                </div>

                <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Parts Subtotal:</span>
                    <span>₹{Number(selectedQuotationForPrint.quotation.parts_subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Labor Subtotal:</span>
                    <span>₹{Number(selectedQuotationForPrint.quotation.labor_subtotal || 0).toFixed(2)}</span>
                  </div>
                  {isQuotationGst ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>GST (CGST + SGST):</span>
                      <span>₹{Number(selectedQuotationForPrint.quotation.tax_total || selectedQuotationForPrint.quotation.tax_amount || 0).toFixed(2)}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px' }}>
                      <span>Tax (0% Non-GST):</span>
                      <span>₹0.00</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #6b21a8', paddingTop: '4px', fontWeight: 800, fontSize: '13px', color: '#6b21a8' }}>
                    <span>Estimated Total:</span>
                    <span>₹{Number(selectedQuotationForPrint.quotation.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                  onClick={() => setSelectedQuotationForPrint(null)}
                  style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: '#e2e8f0', border: 'none', color: '#0f172a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Close Preview
                </button>
                <button
                  onClick={() => window.print()}
                  style={{ padding: '6px 16px', borderRadius: '6px', backgroundColor: '#6b21a8', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Printer size={13} /> Print Estimate (Ctrl+P)
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
