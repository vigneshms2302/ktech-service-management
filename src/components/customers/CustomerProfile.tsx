import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Laptop,
  Wrench,
  Plus,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import type { CustomerProfileData } from '../../types/index.ts';
import { formatPhoneDisplay } from '../../utils/phone.ts';

interface CustomerProfileProps {
  customerId: string;
  onBack: () => void;
  onSelectJob: (jobId: string) => void;
  onSelectDevice: (deviceId: string) => void;
  onNewJobForCustomer: (customerId: string, deviceId?: string) => void;
  onAddEquipment: (customerId: string) => void;
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({
  customerId,
  onBack,
  onSelectJob,
  onSelectDevice,
  onNewJobForCustomer,
  onAddEquipment,
}) => {
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'devices' | 'jobs' | 'invoices' | 'warranties'>('devices');

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        if (window.electronAPI?.customers?.getById) {
          const res = await window.electronAPI.customers.getById({ customerId });
          if (res.success && res.data) {
            setProfile(res.data);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [customerId]);

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
              className="btn btn-primary"
              onClick={() => onNewJobForCustomer(customer.id)}
              style={{ width: '100%' }}
            >
              <Wrench size={14} />
              <span>Create New Service Job</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onAddEquipment(customer.id)}
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
            fontWeight: activeTab === 'devices' ? 600 : 500,
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
            fontWeight: activeTab === 'jobs' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Service Job History ({jobs.length})
        </button>

        {/* Extension Points for Future Phases */}
        <button
          onClick={() => setActiveTab('invoices')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeTab === 'invoices' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'invoices' ? 'var(--brand-primary)' : 'var(--text-dim)',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Invoices & GST (Phase 4)
        </button>

        <button
          onClick={() => setActiveTab('warranties')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeTab === 'warranties' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'warranties' ? 'var(--brand-primary)' : 'var(--text-dim)',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Warranties (Phase 5)
        </button>
      </div>

      {/* Tab 1: Equipment Cards */}
      {activeTab === 'devices' && (
        <div>
          {devices.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
              <Laptop size={32} color="var(--text-dim)" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>No equipment registered under this customer yet.</p>
              <button className="btn btn-primary" onClick={() => onAddEquipment(customer.id)}>
                <Plus size={14} />
                <span>Add Equipment</span>
              </button>
            </div>
          ) : (
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

      {/* Tab 3 & 4: Extension Point Placeholders */}
      {(activeTab === 'invoices' || activeTab === 'warranties') && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Clock size={32} color="var(--brand-primary)" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
            {activeTab === 'invoices' ? 'Invoices, Billing & GST Subsystem' : 'Warranty Lifecycle & Claims Subsystem'}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto' }}>
            This customer profile tab is architected and ready. Its complete billing, receipt, and warranty processing workflows will activate in dedicated subsequent phases according to the approved roadmap.
          </p>
        </div>
      )}
    </div>
  );
};
