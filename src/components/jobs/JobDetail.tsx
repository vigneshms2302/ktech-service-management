import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Laptop,
  Phone,
  Clock,
  Lock,
  Unlock,
  Image,
  Send,
} from 'lucide-react';
import type { JobDetailData } from '../../types/index.ts';
import { formatPhoneDisplay } from '../../utils/phone.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface JobDetailProps {
  jobId: string;
  onBack: () => void;
  onSelectCustomer: (customerId: string) => void;
  onSelectDevice: (deviceId: string) => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({
  jobId,
  onBack,
  onSelectCustomer,
  onSelectDevice,
}) => {
  const { userList } = useAuth();
  const [data, setData] = useState<JobDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'INTERNAL' | 'CUSTOMER_FACING'>('INTERNAL');
  const [unlockedPasscode, setUnlockedPasscode] = useState<string | null>(null);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'intake' | 'timeline' | 'notes' | 'quotation' | 'repair' | 'billing'>('intake');

  const fetchJob = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.jobs?.getById) {
        const res = await window.electronAPI.jobs.getById({ jobId });
        if (res.success && res.data) {
          setData(res.data);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const handleStatusTransition = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    setStatusError(null);
    try {
      if (window.electronAPI?.jobs?.updateStatus) {
        const res = await window.electronAPI.jobs.updateStatus({
          jobId,
          newStatus,
          reasonOrNotes: transitionNotes.trim() || undefined,
        });

        if (res.success) {
          setTransitionNotes('');
          fetchJob();
        } else {
          setStatusError(res.error || 'Failed to update status');
        }
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssignTechnician = async (techId: string) => {
    if (window.electronAPI?.jobs?.assignTechnician) {
      const res = await window.electronAPI.jobs.assignTechnician({ jobId, technicianId: techId });
      if (res.success) {
        fetchJob();
      }
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    if (window.electronAPI?.jobs?.addNote) {
      const res = await window.electronAPI.jobs.addNote({
        jobId,
        content: newNote.trim(),
        noteType,
      });
      if (res.success) {
        setNewNote('');
        fetchJob();
      }
    }
  };

  const handleUnlockPasscode = async () => {
    if (!data?.job.deviceId) return;
    setPasscodeError(null);

    if (window.electronAPI?.vault?.unlockPasscode) {
      const res = await window.electronAPI.vault.unlockPasscode({ deviceId: data.job.deviceId });
      if (res.success && res.data) {
        setUnlockedPasscode(res.data.passcode);
      } else {
        setPasscodeError(res.error || 'Access Denied');
      }
    }
  };

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading service ticket...</div>;
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Service job not found.</p>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '12px' }}>
          Back to List
        </button>
      </div>
    );
  }

  const { job, inspection, timeline, notes, photos } = data;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'RECEIVED': return 'badge-info';
      case 'WAITING_FOR_INSPECTION': return 'badge-warning';
      case 'UNDER_INSPECTION': return 'badge-warning';
      case 'DIAGNOSIS_COMPLETED': return 'badge-info';
      case 'REPAIR_COMPLETED':
      case 'DELIVERED': return 'badge-success';
      case 'UNREPAIRABLE':
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '20px' }}>
      {/* Top Breadcrumb & Status Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '5px 10px' }}>
            <ArrowLeft size={14} />
            <span>Jobs</span>
          </button>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>/</div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
            {job.jobNumber}
          </span>
          <span className={`badge ${getStatusBadge(job.currentStatus)}`}>
            {job.currentStatus}
          </span>
          <span className={`badge ${job.priority === 'URGENT' || job.priority === 'CRITICAL' ? 'badge-danger' : 'badge-info'}`}>
            {job.priority}
          </span>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          Admitted by <strong>{job.creatorName}</strong> on {new Date(job.createdAt).toLocaleString()}
        </div>
      </div>

      {/* Status Transition Action Bar (Phase 2 State Machine) */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          marginBottom: '16px',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '4px solid var(--brand-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--brand-primary)" />
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Workflow Action:</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Current State: <strong>{job.currentStatus}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {job.currentStatus === 'RECEIVED' && (
            <button
              className="btn btn-primary"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusTransition('WAITING_FOR_INSPECTION')}
            >
              <span>Queue for Inspection →</span>
            </button>
          )}

          {job.currentStatus === 'WAITING_FOR_INSPECTION' && (
            <button
              className="btn btn-primary"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusTransition('UNDER_INSPECTION')}
            >
              <span>Start Diagnostic Inspection →</span>
            </button>
          )}

          {job.currentStatus === 'UNDER_INSPECTION' && (
            <>
              <button
                className="btn btn-primary"
                disabled={isUpdatingStatus}
                onClick={() => handleStatusTransition('DIAGNOSIS_COMPLETED')}
              >
                <span>Diagnosis Completed →</span>
              </button>
              <button
                className="btn btn-danger"
                disabled={isUpdatingStatus}
                onClick={() => handleStatusTransition('UNREPAIRABLE')}
                style={{ fontSize: '11px' }}
              >
                Mark Unrepairable
              </button>
            </>
          )}
        </div>
      </div>

      {statusError && (
        <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '12px', marginBottom: '14px' }}>
          {statusError}
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Left Column: Intake, Condition, Accessories, Photos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Customer Reported Complaint */}
          <div className="card">
            <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
              CUSTOMER REPORTED COMPLAINT & SYMPTOMS
            </h2>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)', lineHeight: 1.5, backgroundColor: 'var(--bg-app)', padding: '12px', borderRadius: '6px' }}>
              {job.reportedIssue}
            </div>

            {job.physicalConditionNotes && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <strong>Physical Observations:</strong> {job.physicalConditionNotes}
              </div>
            )}
          </div>

          {/* Initial Admission Inspection Checks */}
          {inspection && (
            <div className="card">
              <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                INITIAL HARDWARE ADMISSION STATUS
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-app)', borderRadius: '6px', fontSize: '11px' }}>
                  <div style={{ color: 'var(--text-dim)' }}>Power Condition</div>
                  <strong style={{ color: 'var(--text-main)' }}>{inspection.powerStatus}</strong>
                </div>

                <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-app)', borderRadius: '6px', fontSize: '11px' }}>
                  <div style={{ color: 'var(--text-dim)' }}>Display Condition</div>
                  <strong style={{ color: 'var(--text-main)' }}>{inspection.displayStatus || 'N/A'}</strong>
                </div>

                <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-app)', borderRadius: '6px', fontSize: '11px' }}>
                  <div style={{ color: 'var(--text-dim)' }}>Body / Hinge</div>
                  <strong style={{ color: 'var(--text-main)' }}>{inspection.bodyCondition || 'NORMAL'}</strong>
                </div>

                {inspection.waterDamageDetected && (
                  <div style={{ padding: '8px 10px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                    ⚠️ Liquid Damage Observed
                  </div>
                )}

                {inspection.shortCircuitDetected && (
                  <div style={{ padding: '8px 10px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                    ⚡ Short Circuit Suspected
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Accessories Checklist */}
          <div className="card">
            <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
              ACCESSORIES RECEIVED ({job.accessoriesReceived.length})
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {job.accessoriesReceived.length === 0 ? (
                <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Device Only (No accessories received)</span>
              ) : (
                job.accessoriesReceived.map((acc) => (
                  <span key={acc} className="badge badge-info" style={{ fontSize: '11px', padding: '4px 8px' }}>
                    ✓ {acc}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Intake Photos */}
          {photos.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                INTAKE & DAMAGE PHOTOS ({photos.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {photos.map((p) => (
                  <div key={p.id} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'var(--bg-app)' }}>
                    <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-surface-active)' }}>
                      <Image size={24} color="var(--text-dim)" />
                    </div>
                    <div style={{ padding: '4px 6px', fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.caption || 'Photo'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Customer Card, Equipment Card, Technician, Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Customer Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                <User size={14} color="var(--brand-primary)" />
                <span>CUSTOMER</span>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => onSelectCustomer(job.customerId)}
                style={{ padding: '2px 6px', fontSize: '10px' }}
              >
                Profile
              </button>
            </div>

            <div style={{ fontSize: '14px', fontWeight: 700 }}>{job.customerName}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              <Phone size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {formatPhoneDisplay(job.customerPhone)}
            </div>
            {job.customerEmail && <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{job.customerEmail}</div>}
          </div>

          {/* Equipment Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                <Laptop size={14} color="var(--brand-primary)" />
                <span>EQUIPMENT</span>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => onSelectDevice(job.deviceId)}
                style={{ padding: '2px 6px', fontSize: '10px' }}
              >
                Details
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-info" style={{ fontSize: '9px' }}>{job.equipmentType}</span>
              <strong style={{ fontSize: '13px' }}>{job.deviceBrand} {job.deviceModel}</strong>
            </div>

            {job.deviceSerial && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                SN: {job.deviceSerial}
              </div>
            )}

            {job.hasPasscode && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Device Passcode:</span>
                  <button
                    className="btn btn-secondary"
                    onClick={handleUnlockPasscode}
                    style={{ padding: '2px 6px', fontSize: '10px' }}
                  >
                    {unlockedPasscode ? <Unlock size={10} /> : <Lock size={10} />}
                    <span>{unlockedPasscode ? unlockedPasscode : 'Decrypt'}</span>
                  </button>
                </div>
                {passcodeError && <div style={{ fontSize: '10px', color: 'var(--color-danger)', marginTop: '2px' }}>{passcodeError}</div>}
              </div>
            )}
          </div>

          {/* Technician Assignment */}
          <div className="card">
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              ASSIGNED TECHNICIAN
            </div>
            <select
              className="input-field"
              value={job.assignedTechnicianId || ''}
              onChange={(e) => handleAssignTechnician(e.target.value)}
            >
              <option value="">Unassigned Pool</option>
              {userList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.roleName})
                </option>
              ))}
            </select>
          </div>

          {/* Financial Overview (Intake Only) */}
          <div className="card">
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              INTAKE ESTIMATE & DEPOSIT
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Estimate:</span>
              <strong>₹{job.estimatedCost.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Advance Deposit:</span>
              <strong style={{ color: 'var(--color-success)' }}>₹{job.advanceDeposit.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Timeline & Status History / Internal Notes / Future Extension Tabs */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface-active)' }}>
          <button
            onClick={() => setActiveTab('timeline')}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === 'timeline' ? '2px solid var(--brand-primary)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'timeline' ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Status History Timeline ({timeline.length})
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === 'notes' ? '2px solid var(--brand-primary)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'notes' ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Staff Notes ({notes.length})
          </button>

          <button
            onClick={() => setActiveTab('quotation')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-dim)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Quotation & Approvals (Phase 3)
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-dim)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Billing & Invoices (Phase 4)
          </button>
        </div>

        {/* Tab 1: Timeline Stream */}
        {activeTab === 'timeline' && (
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {timeline.map((entry, idx) => (
                <div key={entry.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--brand-primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, backgroundColor: 'var(--bg-app)', padding: '10px 14px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${getStatusBadge(entry.newStatus)}`}>{entry.newStatus}</span>
                        {entry.previousStatus && (
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            (from {entry.previousStatus})
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '4px' }}>
                      {entry.reasonOrNotes || 'Status updated'}
                    </div>

                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Logged by <strong>{entry.changedByName}</strong> ({entry.changedByUsername})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Staff Notes Thread */}
        {activeTab === 'notes' && (
          <div style={{ padding: '20px' }}>
            <form onSubmit={handleAddNote} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                className="input-field"
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write internal staff note or technical observation..."
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <select
                  className="input-field"
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as 'INTERNAL' | 'CUSTOMER_FACING')}
                  style={{ maxWidth: '180px', fontSize: '11px' }}
                >
                  <option value="INTERNAL">Internal Note</option>
                  <option value="CUSTOMER_FACING">Customer Facing Note</option>
                </select>
                <button type="submit" className="btn btn-primary" style={{ padding: '5px 14px' }}>
                  <Send size={12} />
                  <span>Post Note</span>
                </button>
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '12px' }}>
                  No notes recorded on this ticket yet.
                </div>
              ) : (
                notes.map((n) => (
                  <div key={n.id} style={{ padding: '10px 14px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <strong>{n.authorName}</strong>
                      <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.4 }}>{n.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3 & 4: Extension Placeholders */}
        {(activeTab === 'quotation' || activeTab === 'billing') && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Clock size={32} color="var(--brand-primary)" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
              {activeTab === 'quotation' ? 'Quotation & Parts Estimation Subsystem' : 'GST Invoice & Payment Processing Subsystem'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto' }}>
              This service job workspace tab is architected. Its complete estimation, parts inventory deduction, and billing pipelines will activate in dedicated subsequent phases.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
