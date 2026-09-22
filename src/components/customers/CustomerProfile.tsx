import React, { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Laptop,
  Wrench,
  Plus,
  ArrowLeft,
  Receipt,
  MessageSquare,
} from 'lucide-react';
import type { CustomerProfileData } from '../../types/index.ts';
import { formatPhoneDisplay } from '../../utils/phone.ts';
import { EquipmentModal } from '../equipment/EquipmentModal.tsx';
import { useShop } from '../../context/ShopContext.tsx';

interface CustomerProfileProps {
  customerId: string;
  onBack: () => void;
  onSelectJob: (jobId: string) => void;
  onSelectDevice: (deviceId: string) => void;
  onNewJobForCustomer: (customerId: string, deviceId?: string) => void;
  onAddEquipment?: (customerId: string) => void;
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({
  customerId,
  onBack,
  onSelectJob,
  onSelectDevice,
  onNewJobForCustomer,
  onAddEquipment,
}) => {
  const { shopSettings } = useShop();
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'devices' | 'jobs' | 'invoices'>('devices');
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.customers?.getById) {
        const res = await window.electronAPI.customers.getById({ customerId });
        if (res.success && res.data) {
          setProfile(res.data);
        }
      }
      if (window.electronAPI?.billing?.listInvoices) {
        const invRes = await window.electronAPI.billing.listInvoices({ customerId });
        if (invRes.success && invRes.data) {
          setCustomerInvoices(invRes.data);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading customer record...
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Customer record not found.</p>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '12px' }}>
          Back to List
        </button>
      </div>
    );
  }

  const { customer, address, devices, jobs } = profile;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'badge-info';
      case 'WAITING_FOR_INSPECTION':
      case 'UNDER_INSPECTION':
        return 'badge-warning';
      case 'REPAIR_COMPLETED':
      case 'READY_FOR_DELIVERY':
      case 'DELIVERED':
        return 'badge-success';
      default:
        return 'badge-info';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '20px' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '5px 10px' }}>
          <ArrowLeft size={14} />
          <span>Customers</span>
        </button>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>/</div>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>{customer.fullName}</span>
        <span className="badge badge-info" style={{ fontFamily: 'var(--font-mono)' }}>
          {customer.customerCode}
        </span>
      </div>

      {/* Profile Overview Card */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
        }}
      >
        {/* Left: Customer Info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                backgroundColor: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '18px',
              }}
            >
              {customer.fullName.charAt(0)}
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.2 }}>{customer.fullName}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                <span className="badge badge-info" style={{ fontSize: '10px' }}>
                  {customer.customerType}
                </span>
                {customer.gstin && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    GSTIN: {customer.gstin}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '14px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={14} color="var(--brand-primary)" />
              <strong>{formatPhoneDisplay(customer.primaryPhone)}</strong>
            </div>

            {customer.secondaryPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <Phone size={14} />
                <span>{formatPhoneDisplay(customer.secondaryPhone)} (Alt)</span>
              </div>
            )}

            {customer.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <Mail size={14} />
                <span>{customer.email}</span>
              </div>
            )}

            {address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <MapPin size={14} />
                <span>{address.addressLine1}, {address.city}</span>
              </div>
            )}
          </div>

          {customer.notes && (
            <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: 'var(--bg-app)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <strong>Notes:</strong> {customer.notes}
            </div>
          )}
        </div>

        {/* Right: Quick Stats & Actions */}
        <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'center' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--brand-primary)' }}>{devices.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Registered Devices</div>
            </div>
            <div style={{ padding: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-success)' }}>{jobs.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Total Service Jobs</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            <button
              onClick={() => {
                const cleanPhone = (customer.primaryPhone || '').replace(/[^0-9]/g, '');
                if (!cleanPhone) {
                  alert('No customer phone number found.');
                  return;
                }
                const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                const msg = `Hello ${customer.fullName}, greetings from ${shopSettings.shopName || 'KTech Computers'}!`;
                window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`, '_blank');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: '#25D366',
                color: '#ffffff',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <MessageSquare size={14} />
              <span>Chat on WhatsApp</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onNewJobForCustomer(customer.id)}
              style={{ width: '100%' }}
            >
              <Wrench size={14} />
              <span>Create New Service Job</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsEquipmentModalOpen(true);
                onAddEquipment?.(customer.id);
              }}
              style={{ width: '100%' }}
            >
              <Plus size={14} />
              <span>Register Equipment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('devices')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeTab === 'devices' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'devices' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'devices' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Registered Equipment ({devices.length})
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeTab === 'jobs' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'jobs' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'jobs' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Service Job History ({jobs.length})
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeTab === 'invoices' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'invoices' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'invoices' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Invoices & Billing ({customerInvoices.length})
        </button>
      </div>

      {/* Tab 1: Equipment Cards */}
      {activeTab === 'devices' && (
        <div>
          {devices.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
              <Laptop size={32} color="var(--text-dim)" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>No equipment registered under this customer yet.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setIsEquipmentModalOpen(true);
                  onAddEquipment?.(customer.id);
                }}
              >
                <Plus size={14} />
                <span>Add Equipment</span>
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {devices.length} {devices.length === 1 ? 'device' : 'devices'} registered
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEquipmentModalOpen(true);
                    onAddEquipment?.(customer.id);
                  }}
                  style={{ padding: '5px 12px', fontSize: '12px' }}
                >
                  <Plus size={13} />
                  <span>Register New Equipment</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {devices.map((device) => (
                  <div key={device.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>
                          {device.equipmentType}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          {device.jobCount} {device.jobCount === 1 ? 'Job' : 'Jobs'}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {device.brand} {device.modelName}
                      </h3>

                      {device.serialNumber && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                          SN: {device.serialNumber}
                        </div>
                      )}

                      {device.specsSummary && (
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
                          {device.specsSummary}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => onSelectDevice(device.id)}
                        style={{ flex: 1, fontSize: '11px' }}
                      >
                        View Details
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => onNewJobForCustomer(customer.id, device.id)}
                        style={{ flex: 1, fontSize: '11px' }}
                      >
                        <Plus size={12} />
                        <span>Intake Job</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Service Jobs Table */}
      {activeTab === 'jobs' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <Wrench size={32} color="var(--text-dim)" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>No service jobs recorded for this customer.</p>
              <button className="btn btn-primary" onClick={() => onNewJobForCustomer(customer.id)}>
                <Plus size={14} />
                <span>Create Service Job</span>
              </button>
            </div>
          ) : (
            <table className="ktech-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Equipment / Device</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Customer Reported Issue</th>
                  <th>Assigned Tech</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <strong style={{ color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                        {job.jobNumber}
                      </strong>
                    </td>
                    <td>{job.deviceBrand} {job.deviceModel}</td>
                    <td><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{job.serviceCategory}</span></td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(job.currentStatus)}`}>
                        {job.currentStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${job.priority === 'URGENT' || job.priority === 'CRITICAL' ? 'badge-danger' : 'badge-info'}`}>
                        {job.priority}
                      </span>
                    </td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.reportedIssue}
                    </td>
                    <td>{job.technicianName || <span style={{ color: 'var(--text-dim)' }}>Unassigned</span>}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => onSelectJob(job.id)}
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                      >
                        Open Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Customer Invoices & Bills */}
      {activeTab === 'invoices' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {customerInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px' }}>
              <Receipt size={32} color="var(--text-dim)" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No invoices or bills generated for this customer yet.</p>
            </div>
          ) : (
            <table className="ktech-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Job #</th>
                  <th>Date</th>
                  <th>Total Amount</th>
                  <th>Amount Paid</th>
                  <th>Balance Due</th>
                  <th>Payment Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {customerInvoices.map((inv) => (
                  <tr key={inv.id as string}>
                    <td>
                      <strong style={{ color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                        {inv.invoice_number as string}
                      </strong>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      {(inv.job_number as string) || '-'}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(inv.created_at as string).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{Number(inv.total_amount || 0).toFixed(2)}</td>
                    <td style={{ color: 'var(--color-success)' }}>₹{Number(inv.amount_paid || 0).toFixed(2)}</td>
                    <td style={{ color: Number(inv.balance_due || 0) > 0 ? '#f87171' : 'var(--text-dim)', fontWeight: 600 }}>
                      ₹{Number(inv.balance_due || 0).toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge ${inv.payment_status === 'PAID' ? 'badge-success' : inv.payment_status === 'PARTIALLY_PAID' ? 'badge-warning' : 'badge-danger'}`}>
                        {(inv.payment_status as string).replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          const cleanPhone = (customer.primaryPhone || '').replace(/[^0-9]/g, '');
                          if (cleanPhone) {
                            const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                            const shopUpper = (shopSettings.shopName || 'KTech Computers').toUpperCase();
                            const shopName = shopSettings.shopName || 'KTech Computers';
                            const shopPhone = shopSettings.phone || '+91 98400 12345';
                            const msg = `*${shopUpper} - TAX INVOICE* 🧾\n\nDear *${customer.fullName}*,\nYour invoice *${inv.invoice_number}* is ready.\n\n💰 *Total:* ₹${Number(inv.total_amount || 0).toFixed(2)}\n💵 *Paid:* ₹${Number(inv.amount_paid || 0).toFixed(2)}\n💳 *Balance:* ₹${Number(inv.balance_due || 0).toFixed(2)}\n\nThank you for choosing ${shopName}!\nSupport: ${shopPhone}`;
                            window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                          }
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Register Equipment Modal */}
      <EquipmentModal
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        customerId={customer.id}
        customerName={customer.fullName}
        onEquipmentCreated={(_device) => {
          fetchProfile();
        }}
        onSelectExisting={(deviceId) => {
          onSelectDevice(deviceId);
        }}
      />
    </div>
  );
};
