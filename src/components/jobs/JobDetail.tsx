import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  User,
  Phone,
  Clock,
  Lock,
  Unlock,
  Wrench,
  Cpu,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  Activity,
  Layers,
  Search,
  Eye,
  Camera,
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
  const { userList, currentUser, hasPermission } = useAuth();
  const [data, setData] = useState<JobDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'inspection' | 'diagnosis' | 'repair' | 'activities' | 'attachments' | 'timeline' | 'notes'
  >('overview');

  // Vault passcode unlock
  const [unlockedPasscode, setUnlockedPasscode] = useState<string | null>(null);

  // Status transitions
  const [transitionNotes, setTransitionNotes] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);

  // Inspection form states
  const [inspPowerStatus, setInspPowerStatus] = useState('NORMAL_POWER');
  const [inspDisplayStatus, setInspDisplayStatus] = useState('NORMAL');
  const [inspMotherboardStatus, setInspMotherboardStatus] = useState('NORMAL');
  const [inspBodyCondition, setInspBodyCondition] = useState('GOOD');
  const [inspWaterDamage, setInspWaterDamage] = useState(false);
  const [inspShortCircuit, setInspShortCircuit] = useState(false);
  const [inspNotes, setInspNotes] = useState('');
  const [inspVoltageRails, setInspVoltageRails] = useState<{ rail: string; expected: string; measured: string; status: string }[]>([
    { rail: '19V / DC-IN', expected: '19.5V', measured: '', status: 'NORMAL' },
    { rail: '3.3V Always-On', expected: '3.3V', measured: '', status: 'NORMAL' },
    { rail: '5.0V Always-On', expected: '5.0V', measured: '', status: 'NORMAL' },
    { rail: '1.05V PCH / SoC', expected: '1.05V', measured: '', status: 'NORMAL' },
    { rail: 'VCore / CPU', expected: '0.9V - 1.2V', measured: '', status: 'NORMAL' },
  ]);

  // Diagnosis form states
  const [diagRootCause, setDiagRootCause] = useState('');
  const [diagFaultCategory, setDiagFaultCategory] = useState('CHIP_LEVEL');
  const [diagFaultyComponents, setDiagFaultyComponents] = useState('');
  const [diagVoltageRailsChecked, setDiagVoltageRailsChecked] = useState('');
  const [diagRecommendedAction, setDiagRecommendedAction] = useState('');
  const [diagOutcome, setDiagOutcome] = useState('FAULT_IDENTIFIED');
  const [isSavingDiag, setIsSavingDiag] = useState(false);

  // Repair Plan form states
  const [planServiceName, setPlanServiceName] = useState('');
  const [planLaborCharge, setPlanLaborCharge] = useState<number>(0);

  // Required Part form states
  const [partName, setPartName] = useState('');
  const [partSerialNumber, setPartSerialNumber] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [partCost, setPartCost] = useState<number>(0);
  const [partPrice, setPartPrice] = useState<number>(0);
  const [partWarrantyMonths] = useState(3);

  // Repair Activity form states
  const [actTitle, setActTitle] = useState('');
  const [actDescription, setActDescription] = useState('');
  const [actMinutes, setActMinutes] = useState(30);

  // Attachment upload states
  const [attachCaption, setAttachCaption] = useState('');

  // Notes form
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'INTERNAL' | 'CUSTOMER_FACING'>('INTERNAL');

  const fetchJob = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.jobs?.getById) {
        const res = await window.electronAPI.jobs.getById({ jobId });
        if (res.success && res.data) {
          setData(res.data);
          // Pre-populate inspection if existing
          if (res.data.inspection) {
            setInspPowerStatus(res.data.inspection.powerStatus || 'NORMAL_POWER');
            setInspDisplayStatus(res.data.inspection.displayStatus || 'NORMAL');
            setInspMotherboardStatus(res.data.inspection.motherboardStatus || 'NORMAL');
            setInspBodyCondition(res.data.inspection.bodyCondition || 'GOOD');
            setInspWaterDamage(Boolean(res.data.inspection.waterDamageDetected));
            setInspShortCircuit(Boolean(res.data.inspection.shortCircuitDetected));
            setInspNotes(res.data.inspection.inspectionNotes || '');
          }
          // Pre-populate diagnosis if existing
          if (res.data.diagnoses && res.data.diagnoses.length > 0) {
            const latestDiag = res.data.diagnoses[0];
            setDiagRootCause(latestDiag.rootCauseAnalysis || '');
            setDiagFaultyComponents(latestDiag.faultyComponentsIdentified || '');
            setDiagVoltageRailsChecked(latestDiag.voltageRailsChecked || '');
            setDiagRecommendedAction(latestDiag.recommendedAction || '');
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handleStatusTransition = async (newStatus: string, reason?: string) => {
    setStatusError(null);
    try {
      if (window.electronAPI?.jobs?.updateStatus) {
        const res = await window.electronAPI.jobs.updateStatus({
          jobId,
          newStatus,
          reasonOrNotes: reason || transitionNotes.trim() || undefined,
        });

        if (res.success) {
          setTransitionNotes('');
          fetchJob();
        } else {
          setStatusError(res.error || 'Failed to update status');
        }
      }
    } catch (err: unknown) {
      setStatusError((err as Error).message);
    }
  };

  const handleAssignTechnician = async (techId: string) => {
    if (window.electronAPI?.jobs?.assignTechnician) {
      const res = await window.electronAPI.jobs.assignTechnician({ jobId, technicianId: techId });
      if (res.success) {
        fetchJob();
      } else {
        alert(res.error || 'Failed to assign technician');
      }
    }
  };

  const handleSaveInspection = async () => {
    try {
      if (!window.electronAPI?.jobs?.saveTechnicalInspection) return;
      const formattedMeasurements = inspVoltageRails
        .filter((r) => r.measured.trim())
        .map((r) => `${r.rail}: ${r.measured} (${r.status})`)
        .join('; ');

      const res = await window.electronAPI.jobs.saveTechnicalInspection({
        jobId,
        powerStatus: inspPowerStatus,
        displayStatus: inspDisplayStatus,
        motherboardStatus: inspMotherboardStatus,
        bodyCondition: inspBodyCondition,
        waterDamageDetected: inspWaterDamage,
        shortCircuitDetected: inspShortCircuit,
        inspectionNotes: `${inspNotes.trim()}${formattedMeasurements ? `\n[Voltages Logged]: ${formattedMeasurements}` : ''}`,
        transitionToUnderInspection: data?.job.currentStatus === 'WAITING_FOR_INSPECTION' || data?.job.currentStatus === 'RECEIVED',
      });

      if (res.success) {
        alert('Technical Inspection findings recorded successfully!');
        fetchJob();
      } else {
        alert(res.error || 'Failed to save inspection');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleSaveDiagnosis = async () => {
    if (!diagRootCause.trim()) {
      alert('Root Cause Analysis is required.');
      return;
    }

    try {
      setIsSavingDiag(true);
      if (!window.electronAPI?.jobs?.saveDiagnosis) return;

      const res = await window.electronAPI.jobs.saveDiagnosis({
        jobId,
        rootCauseAnalysis: diagRootCause.trim(),
        faultCategory: diagFaultCategory,
        faultyComponentsIdentified: diagFaultyComponents.trim() || undefined,
        voltageRailsChecked: diagVoltageRailsChecked.trim() || undefined,
        recommendedAction: diagRecommendedAction.trim() || undefined,
        diagnosticOutcome: diagOutcome,
        transitionStatus: true,
      });

      if (res.success) {
        alert('Diagnosis successfully logged and ticket status updated!');
        fetchJob();
      } else {
        alert(res.error || 'Failed to save diagnosis');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsSavingDiag(false);
    }
  };

  const handleAddRepairPlanAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planServiceName.trim()) return;

    try {
      if (!window.electronAPI?.jobs?.addRepairPlanAction) return;
      const res = await window.electronAPI.jobs.addRepairPlanAction({
        jobId,
        serviceName: planServiceName.trim(),
        laborCharge: planLaborCharge,
      });

      if (res.success) {
        setPlanServiceName('');
        setPlanLaborCharge(0);
        fetchJob();
      } else {
        alert(res.error || 'Failed to add repair plan action');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleDeleteRepairPlanAction = async (serviceId: string) => {
    if (!window.electronAPI?.jobs?.deleteRepairPlanAction) return;
    const res = await window.electronAPI.jobs.deleteRepairPlanAction({ serviceId });
    if (res.success) {
      fetchJob();
    }
  };

  const handleAddRequiredPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName.trim()) return;

    try {
      if (!window.electronAPI?.jobs?.addRequiredPart) return;
      const res = await window.electronAPI.jobs.addRequiredPart({
        jobId,
        partName: partName.trim(),
        serialNumber: partSerialNumber.trim() || undefined,
        quantity: partQuantity,
        unitCostPrice: partCost,
        unitSellingPrice: partPrice,
        warrantyMonths: partWarrantyMonths,
      });

      if (res.success) {
        setPartName('');
        setPartSerialNumber('');
        setPartQuantity(1);
        setPartCost(0);
        setPartPrice(0);
        fetchJob();
      } else {
        alert(res.error || 'Failed to add required part');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleDeleteRequiredPart = async (partId: string) => {
    if (!window.electronAPI?.jobs?.deleteRequiredPart) return;
    const res = await window.electronAPI.jobs.deleteRequiredPart({ partId });
    if (res.success) {
      fetchJob();
    }
  };

  const handleAddRepairActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) return;

    try {
      if (!window.electronAPI?.jobs?.addRepairActivity) return;
      const res = await window.electronAPI.jobs.addRepairActivity({
        jobId,
        activityTitle: actTitle.trim(),
        description: actDescription.trim() || undefined,
        timeSpentMinutes: actMinutes,
        transitionToUnderRepair: true,
      });

      if (res.success) {
        setActTitle('');
        setActDescription('');
        setActMinutes(30);
        fetchJob();
      } else {
        alert(res.error || 'Failed to add repair activity');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      if (window.electronAPI?.jobs?.addTechnicalAttachment) {
        const res = await window.electronAPI.jobs.addTechnicalAttachment({
          jobId,
          fileName: file.name,
          fileType: file.type,
          base64Data,
          caption: attachCaption.trim() || file.name,
          isPhoto: file.type.startsWith('image/'),
        });

        if (res.success) {
          setAttachCaption('');
          fetchJob();
        } else {
          alert(res.error || 'Failed to save attachment');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteRepair = async () => {
    const summary = prompt('Enter repair completion summary & bench test notes:', 'All component rework completed and stress-tested.');
    if (!summary) return;

    try {
      if (!window.electronAPI?.jobs?.completeRepair) return;
      const res = await window.electronAPI.jobs.completeRepair({
        jobId,
        summaryNotes: summary,
      });
      if (res.success) {
        alert('Repair marked as COMPLETED!');
        fetchJob();
      } else {
        alert(res.error || 'Failed to complete repair');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleMarkUnrepairable = async () => {
    const reason = prompt('Enter technical justification for UNREPAIRABLE status (e.g. SoC cracked, layered PCB trace corrosion):');
    if (!reason || !reason.trim()) return;

    try {
      if (!window.electronAPI?.jobs?.markUnrepairable) return;
      const res = await window.electronAPI.jobs.markUnrepairable({
        jobId,
        rootCause: 'Fatal Hardware Damage',
        technicalJustification: reason.trim(),
      });
      if (res.success) {
        alert('Job status updated to UNREPAIRABLE.');
        fetchJob();
      } else {
        alert(res.error || 'Failed to mark unrepairable');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
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

    if (window.electronAPI?.vault?.unlockPasscode) {
      const res = await window.electronAPI.vault.unlockPasscode({ deviceId: data.job.deviceId });
      if (res.success && res.data) {
        setUnlockedPasscode(res.data.passcode);
      } else {
        alert(res.error || 'Access Denied');
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading service job workstation...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)' }}>Service Job record could not be found.</p>
        <button onClick={onBack} className="btn-secondary" style={{ marginTop: '10px' }}>
          Back to List
        </button>
      </div>
    );
  }

  const { job, inspection, diagnoses, repairPlans, requiredParts, repairActivities, attachments, timeline, notes, photos } = data;

  const isTechnicianRole = currentUser?.roleId === 'ROLE_TECHNICIAN' || currentUser?.roleId === 'ROLE_OWNER' || hasPermission('jobs.diagnose');

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
      {/* Top Breadcrumb & Status Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onBack}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                {job.jobNumber}
              </h2>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: job.priority === 'CRITICAL' || job.priority === 'URGENT' ? '#ef4444' : 'var(--brand-primary)',
                  color: '#ffffff',
                }}
              >
                {job.priority}
              </span>
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  color: 'var(--brand-primary)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                }}
              >
                {job.currentStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
              Admitted: {new Date(job.createdAt).toLocaleString('en-IN')} by {job.creatorName}
            </div>
          </div>
        </div>

        {/* Quick Technician Assignment & Action Transition Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Tech Assignment Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-card)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <User size={13} color="var(--brand-primary)" />
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Tech:</span>
            <select
              value={job.assignedTechnicianId || ''}
              onChange={(e) => handleAssignTechnician(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: job.assignedTechnicianId ? 'var(--text-main)' : '#facc15',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <option value="">-- Unassigned --</option>
              {userList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.roleName})
                </option>
              ))}
            </select>
          </div>

          {/* Contextual Workflow Action Buttons */}
          {isTechnicianRole && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {job.currentStatus === 'WAITING_FOR_INSPECTION' && (
                <button
                  onClick={() => handleStatusTransition('UNDER_INSPECTION', 'Technician claimed and started inspection')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--brand-primary)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Search size={13} /> Start Inspection
                </button>
              )}

              {job.currentStatus === 'UNDER_INSPECTION' && (
                <button
                  onClick={() => setActiveTab('diagnosis')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#8b5cf6',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Cpu size={13} /> Record Diagnosis
                </button>
              )}

              {(job.currentStatus === 'DIAGNOSIS_COMPLETED' || job.currentStatus === 'APPROVED' || job.currentStatus === 'WAITING_FOR_PARTS') && (
                <button
                  onClick={() => handleStatusTransition('UNDER_REPAIR', 'Technician commenced repair bench work')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-success)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Wrench size={13} /> Start Repair
                </button>
              )}

              {job.currentStatus === 'UNDER_REPAIR' && (
                <>
                  <button
                    onClick={() => handleStatusTransition('WAITING_FOR_PARTS', 'Waiting for required parts/components')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(249, 115, 22, 0.2)',
                      border: '1px solid rgba(249, 115, 22, 0.5)',
                      color: '#fb923c',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Need Parts
                  </button>
                  <button
                    onClick={handleCompleteRepair}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-success)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircle2 size={13} /> Complete Repair
                  </button>
                </>
              )}

              {job.currentStatus !== 'UNREPAIRABLE' && job.currentStatus !== 'DELIVERED' && (
                <button
                  onClick={handleMarkUnrepairable}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Unrepairable
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {statusError && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '12px',
          }}
        >
          {statusError}
        </div>
      )}

      {/* Snapshot Banner: Customer, Equipment, and IMMUTABLE Customer Complaint */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Customer & Equipment Card */}
        <div
          style={{
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              onClick={() => onSelectCustomer(job.customerId)}
              style={{ fontWeight: 700, fontSize: '14px', color: 'var(--brand-primary)', cursor: 'pointer' }}
            >
              {job.customerName}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {job.customerCode}
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Phone size={12} />
            {formatPhoneDisplay(job.customerPhone)}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                onClick={() => onSelectDevice(job.deviceId)}
                style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                <span style={{ color: 'var(--brand-primary)' }}>[{job.equipmentType}]</span> {job.deviceBrand} {job.deviceModel}
              </span>
              {job.hasPasscode && (
                <button
                  onClick={handleUnlockPasscode}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {unlockedPasscode ? <Unlock size={11} color="var(--color-success)" /> : <Lock size={11} />}
                  {unlockedPasscode ? `PIN: ${unlockedPasscode}` : 'Unlock PIN'}
                </button>
              )}
            </div>
            {job.deviceSerial && (
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                S/N: {job.deviceSerial}
              </div>
            )}
          </div>
        </div>

        {/* PROMINENT CUSTOMER COMPLAINT CARD (IMMUTABLE) */}
        <div
          style={{
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(234, 179, 8, 0.05)',
            border: '1.5px solid rgba(234, 179, 8, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Customer Reported Complaint (Admission)
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                [Immutable Customer Record]
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginTop: '6px', lineHeight: 1.4 }}>
              "{job.reportedIssue}"
            </div>
          </div>

          {/* Admission accessories and condition tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
            {job.accessoriesReceived.map((acc) => (
              <span
                key={acc}
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'var(--text-muted)',
                }}
              >
                + {acc}
              </span>
            ))}
            {job.physicalConditionNotes && (
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                Cond: {job.physicalConditionNotes}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Technician Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          gap: '4px',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'overview', label: 'Workstation Overview', icon: Eye },
          { id: 'inspection', label: 'Adaptive Inspection & Voltages', icon: Search, badge: inspection ? 'Checked' : 'Pending' },
          { id: 'diagnosis', label: 'Diagnosis & Root Cause', icon: Cpu, badge: diagnoses.length > 0 ? `${diagnoses.length}` : undefined },
          { id: 'repair', label: 'Repair Plan & Parts', icon: Layers, badge: `${repairPlans.length + requiredParts.length}` },
          { id: 'activities', label: 'Repair Activities Log', icon: Activity, badge: `${repairActivities.length}` },
          { id: 'attachments', label: 'Photos & Microscope', icon: Camera, badge: `${photos.length + attachments.length}` },
          { id: 'timeline', label: 'Chronological Timeline', icon: Clock },
          { id: 'notes', label: 'Staff Notes', icon: FileText, badge: `${notes.length}` },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--brand-primary)' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} color={isActive ? 'var(--brand-primary)' : 'var(--text-dim)'} />
              {tab.label}
              {tab.badge && (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'var(--brand-primary)' : 'var(--bg-surface)',
                    color: isActive ? '#ffffff' : 'var(--text-dim)',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: WORKSTATION OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {/* Diagnostic Findings Card */}
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                <Cpu size={15} color="var(--brand-primary)" /> Latest Technical Diagnosis
              </h3>
              {diagnoses.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  By {diagnoses[0].technicianName}
                </span>
              )}
            </div>

            {diagnoses.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                No technical diagnosis recorded yet.{' '}
                <button
                  onClick={() => setActiveTab('diagnosis')}
                  style={{ color: 'var(--brand-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Record Diagnosis now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', borderLeft: '3px solid var(--color-success)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>Root Cause:</div>
                  <div style={{ color: 'var(--text-muted)' }}>{diagnoses[0].rootCauseAnalysis}</div>
                </div>

                {diagnoses[0].faultyComponentsIdentified && (
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-dim)' }}>Faulty Components: </span>
                    <span style={{ color: '#f87171', fontWeight: 600 }}>{diagnoses[0].faultyComponentsIdentified}</span>
                  </div>
                )}

                {diagnoses[0].voltageRailsChecked && (
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-dim)' }}>Voltage Observations: </span>
                    <span style={{ color: 'var(--text-main)' }}>{diagnoses[0].voltageRailsChecked}</span>
                  </div>
                )}

                {diagnoses[0].recommendedAction && (
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-dim)' }}>Recommended Action: </span>
                    <span style={{ color: 'var(--color-info)' }}>{diagnoses[0].recommendedAction}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Planned Rework & Parts Card */}
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
              <Layers size={15} color="#fb923c" /> Parts Required & Planned Rework
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Required Components ({requiredParts.length})
                </div>
                {requiredParts.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>No replacement parts logged.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {requiredParts.map((p) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-surface)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.partName} (Qty: {p.quantity})</span>
                        <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>₹{p.unitSellingPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Planned Repair Services ({repairPlans.length})
                </div>
                {repairPlans.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>No service actions listed.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {repairPlans.map((r) => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-surface)' }}>
                        <span style={{ color: 'var(--text-main)' }}>{r.serviceName}</span>
                        <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Labor: ₹{r.laborCharge.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADAPTIVE TECHNICAL INSPECTION */}
      {activeTab === 'inspection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Technical Hardware Inspection — [{job.equipmentType}]
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Record power rail behavior, physical board condition, and electronic measurements
              </div>
            </div>
            <button
              onClick={handleSaveInspection}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: 'var(--brand-primary)',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save Inspection Findings
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Power Supply Status</label>
              <select
                value={inspPowerStatus}
                onChange={(e) => setInspPowerStatus(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '7px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
              >
                <option value="NORMAL_POWER">Normal Power ON</option>
                <option value="NO_POWER_DEAD">Dead / No Power / 0A</option>
                <option value="AUTO_SHUTDOWN">Powers on then auto shutdowns</option>
                <option value="INTERMITTENT_POWER">Intermittent Power</option>
                <option value="CHARGING_ONLY">Charges battery but won't boot</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Display / Video Output</label>
              <select
                value={inspDisplayStatus}
                onChange={(e) => setInspDisplayStatus(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '7px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
              >
                <option value="NORMAL">Normal Internal & External Display</option>
                <option value="NO_DISPLAY">No Display / Caps Lock Glows</option>
                <option value="EXTERNAL_ONLY">External Display OK, Internal Panel Dead</option>
                <option value="LINES_FLICKER">Lines / Artifacts / Flickering</option>
                <option value="DIM_NO_BACKLIGHT">Dim Display / No Backlight</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Motherboard / Circuitry Condition</label>
              <select
                value={inspMotherboardStatus}
                onChange={(e) => setInspMotherboardStatus(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '7px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
              >
                <option value="NORMAL">Clean / Untouched Board</option>
                <option value="CORRODED">Corrosion / Rust Detected</option>
                <option value="BURNT_COMPONENT">Burnt IC / Exploded Component</option>
                <option value="PREVIOUSLY_WORKED">Previous Repair Attempt / Tampered</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-main)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={inspWaterDamage}
                onChange={(e) => setInspWaterDamage(e.target.checked)}
              />
              <span style={{ color: inspWaterDamage ? '#f87171' : 'var(--text-main)', fontWeight: inspWaterDamage ? 700 : 400 }}>
                Liquid / Moisture Ingress Detected
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-main)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={inspShortCircuit}
                onChange={(e) => setInspShortCircuit(e.target.checked)}
              />
              <span style={{ color: inspShortCircuit ? '#f87171' : 'var(--text-main)', fontWeight: inspShortCircuit ? 700 : 400 }}>
                Main Power Rail Short to Ground (GND)
              </span>
            </label>
          </div>

          {/* Voltage Rail Measurements Table */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              Multimeter / Bench Voltage Rail Measurements
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-dim)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Power Rail</th>
                  <th style={{ padding: '6px 8px' }}>Expected</th>
                  <th style={{ padding: '6px 8px' }}>Measured Voltage</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {inspVoltageRails.map((rail, idx) => (
                  <tr key={rail.rail} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-main)' }}>{rail.rail}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>{rail.expected}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="text"
                        placeholder="e.g. 0.2V or Short"
                        value={rail.measured}
                        onChange={(e) => {
                          const copy = [...inspVoltageRails];
                          copy[idx].measured = e.target.value;
                          setInspVoltageRails(copy);
                        }}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '12px', width: '130px' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <select
                        value={rail.status}
                        onChange={(e) => {
                          const copy = [...inspVoltageRails];
                          copy[idx].status = e.target.value;
                          setInspVoltageRails(copy);
                        }}
                        style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '11px' }}
                      >
                        <option value="NORMAL">Normal / OK</option>
                        <option value="SHORT_TO_GND">Short to GND</option>
                        <option value="MISSING_0V">Missing (0V)</option>
                        <option value="FLUCTUATING">Fluctuating</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Technician Bench Notes & Observations</label>
            <textarea
              rows={3}
              value={inspNotes}
              onChange={(e) => setInspNotes(e.target.value)}
              placeholder="e.g. Injected 1V on 5V rail, thermal cam detected heating at charging controller PU401..."
              style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
            />
          </div>
        </div>
      )}

      {/* TAB 3: DIAGNOSIS & ROOT CAUSE */}
      {activeTab === 'diagnosis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Technical Diagnosis & Root Cause Analysis
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Conclude diagnostic investigation, identify faulty components, and determine repair feasibility
              </div>
            </div>

            <button
              onClick={handleSaveDiagnosis}
              disabled={isSavingDiag}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                backgroundColor: 'var(--brand-primary)',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isSavingDiag ? 'Saving...' : 'Save Diagnosis & Update Status'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Fault Category</label>
              <select
                value={diagFaultCategory}
                onChange={(e) => setDiagFaultCategory(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '7px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
              >
                <option value="CHIP_LEVEL">Motherboard / Chip-Level Rework</option>
                <option value="HARDWARE_REPLACEMENT">Hardware Component Swap</option>
                <option value="OS_SOFTWARE">OS / Software / Firmware</option>
                <option value="POWER_ELECTRONICS">SMPS / EV Charger / Power Circuit</option>
                <option value="CONSOLE_REPAIR">Console HDMI / Power Rework</option>
                <option value="PRINTER_SERVICE">Printer Mechanism / Head</option>
                <option value="DATA_RECOVERY">Data Recovery / Storage Media</option>
                <option value="GENERAL_SERVICE">Cleaning & Thermal Service</option>
                <option value="OTHER">Other Electronic Equipment</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Diagnostic Outcome</label>
              <select
                value={diagOutcome}
                onChange={(e) => setDiagOutcome(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '7px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: diagOutcome === 'UNREPAIRABLE' ? '#f87171' : 'var(--text-main)', fontWeight: 600, fontSize: '12px' }}
              >
                <option value="FAULT_IDENTIFIED">Fault Identified & Repair Feasible</option>
                <option value="NEEDS_FURTHER_INSPECTION">Needs Further In-Depth Inspection</option>
                <option value="INTERMITTENT_FAULT">Intermittent / Hard-to-Reproduce Fault</option>
                <option value="NO_FAULT_FOUND">No Fault Found (Testing Passed)</option>
                <option value="UNREPAIRABLE">UNREPAIRABLE (Fatal Damage / Board Cracking)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>
              Root Cause Analysis * (Technical explanation of defect)
            </label>
            <textarea
              rows={3}
              value={diagRootCause}
              onChange={(e) => setDiagRootCause(e.target.value)}
              placeholder="e.g. Shorted High-Side MOSFET PQ302 on 19V rail caused charging controller PU401 to overheat and lock power delivery."
              style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Faulty Components Identified</label>
              <input
                type="text"
                value={diagFaultyComponents}
                onChange={(e) => setDiagFaultyComponents(e.target.value)}
                placeholder="e.g. PU401 (BQ24780S), PQ302 (AON7408 MOSFET), PC201"
                style={{ width: '100%', marginTop: '4px', padding: '7px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Recommended Technical Action</label>
              <input
                type="text"
                value={diagRecommendedAction}
                onChange={(e) => setDiagRecommendedAction(e.target.value)}
                placeholder="e.g. Replace MOSFET & PWM chip; verify 19V rail before boot"
                style={{ width: '100%', marginTop: '4px', padding: '7px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REPAIR PLAN & REQUIRED PARTS */}
      {activeTab === 'repair' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {/* Planned Services / Actions */}
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wrench size={15} color="var(--brand-primary)" /> Planned Repair Actions
            </h3>

            <form onSubmit={handleAddRepairPlanAction} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="e.g. Board rework / Replace IC"
                value={planServiceName}
                onChange={(e) => setPlanServiceName(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px' }}
              />
              <input
                type="number"
                placeholder="Labor ₹"
                value={planLaborCharge || ''}
                onChange={(e) => setPlanLaborCharge(Number(e.target.value))}
                style={{ width: '80px', padding: '7px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px' }}
              />
              <button
                type="submit"
                style={{ padding: '7px 12px', borderRadius: '6px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={14} />
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {repairPlans.map((plan) => (
                <div key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{plan.serviceName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Labor: ₹{plan.laborCharge.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteRepairPlanAction(plan.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Required Parts */}
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} color="#fb923c" /> Required Components & Parts
            </h3>

            <form onSubmit={handleAddRequiredPart} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Part description (e.g. 15.6 FHD Screen / BQ24780S IC)"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px' }}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(Number(e.target.value))}
                  style={{ width: '60px', padding: '7px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="Est. Cost Price ₹"
                  value={partCost || ''}
                  onChange={(e) => setPartCost(Number(e.target.value))}
                  style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px' }}
                />
                <input
                  type="number"
                  placeholder="Est. Sell Price ₹"
                  value={partPrice || ''}
                  onChange={(e) => setPartPrice(Number(e.target.value))}
                  style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px' }}
                />
                <button
                  type="submit"
                  style={{ padding: '7px 14px', borderRadius: '6px', backgroundColor: '#fb923c', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Add Part
                </button>
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {requiredParts.map((part) => (
                <div key={part.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {part.partName} <span style={{ color: 'var(--brand-primary)' }}>(Qty: {part.quantity})</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      Cost: ₹{part.unitCostPrice.toFixed(2)} | Price: ₹{part.unitSellingPrice.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRequiredPart(part.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REPAIR ACTIVITIES LOG */}
      {activeTab === 'activities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} color="var(--color-success)" /> Live Repair Activities Log
          </h3>

          <form onSubmit={handleAddRepairActivity} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Activity title (e.g. Desoldered damaged MOSFET & replaced with AON7408)"
                value={actTitle}
                onChange={(e) => setActTitle(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '12px' }}
              />
              <input
                type="number"
                placeholder="Minutes"
                value={actMinutes}
                onChange={(e) => setActMinutes(Number(e.target.value))}
                style={{ width: '80px', padding: '7px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '12px' }}
              />
            </div>

            <textarea
              rows={2}
              placeholder="Detailed technical observation or test results during this step..."
              value={actDescription}
              onChange={(e) => setActDescription(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '12px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: 'var(--color-success)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Log Repair Activity
              </button>
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {repairActivities.map((act) => (
              <div key={act.id} style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', borderLeft: '3px solid var(--color-success)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{act.activityTitle}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {act.timeSpentMinutes} mins • {new Date(act.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} by {act.technicianName}
                  </span>
                </div>
                {act.description && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {act.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PHOTOS & ATTACHMENTS */}
      {activeTab === 'attachments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={16} color="var(--brand-primary)" /> Technical Photos & Microscope Captures
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                placeholder="Photo caption (e.g. PU401 pin 16 burn mark)"
                value={attachCaption}
                onChange={(e) => setAttachCaption(e.target.value)}
                style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '11px', width: '220px' }}
              />
              <label
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={14} /> Upload Capture
                <input type="file" accept="image/*,.pdf,.bin" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {photos.map((photo) => (
              <div key={photo.id} style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '100%', height: '140px', backgroundColor: '#000', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={`file://${photo.filePath}`}
                    alt={photo.caption || 'Damage capture'}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', marginTop: '6px' }}>
                  {photo.caption || photo.photoType}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                  {new Date(photo.createdAt).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: CHRONOLOGICAL UNIFIED TIMELINE */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} color="var(--brand-primary)" /> Unified Chronological Ticket Stream
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', paddingLeft: '16px', borderLeft: '2px solid var(--border-color)' }}>
            {timeline.map((evt) => (
              <div key={evt.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-23px',
                    top: '2px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: evt.badgeColor || 'var(--brand-primary)',
                    border: '2px solid var(--bg-card)',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>{evt.title}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    {new Date(evt.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
                {evt.description && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{evt.description}</div>
                )}
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>By: {evt.authorName}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: STAFF NOTES */}
      {activeTab === 'notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Staff Notes & Remarks
          </h3>

          <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              rows={2}
              placeholder="Add internal technician note or customer communication remark..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="noteType"
                    checked={noteType === 'INTERNAL'}
                    onChange={() => setNoteType('INTERNAL')}
                  />
                  Internal Note Only
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="noteType"
                    checked={noteType === 'CUSTOMER_FACING'}
                    onChange={() => setNoteType('CUSTOMER_FACING')}
                  />
                  Customer-Facing Remark
                </label>
              </div>

              <button
                type="submit"
                style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Post Note
              </button>
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notes.map((note) => (
              <div key={note.id} style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', borderLeft: note.noteType === 'CUSTOMER_FACING' ? '3px solid var(--color-info)' : '3px solid var(--text-dim)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: note.noteType === 'CUSTOMER_FACING' ? 'var(--color-info)' : 'var(--text-dim)' }}>
                    [{note.noteType}]
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    {new Date(note.createdAt).toLocaleString('en-IN')} by {note.authorName}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '4px' }}>
                  {note.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
