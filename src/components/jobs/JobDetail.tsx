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
  AlertTriangle,
  MessageSquare,
  Printer,
  Receipt,
  Check,
  Tag,
  ChevronDown,
  CreditCard,
} from 'lucide-react';
import type { JobDetailData } from '../../types/index.ts';
import { formatPhoneDisplay } from '../../utils/phone.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useShop } from '../../context/ShopContext.tsx';
import {
  autoCorrectFaultText,
  autoCorrectHardwareText,
  autoCorrectTitle,
  autoCorrectGeneralText,
  handleAutoCorrectKeyDown,
} from '../../utils/autoCorrect.ts';

export const FAULT_CATEGORY_PRESETS = [
  'Motherboard / Chip-Level',
  'Power Rail / MOSFET Short',
  'Display / Backlight / EDP',
  'RAM / Memory Module',
  'Storage / SSD / Bad Sectors',
  'BIOS / EC Firmware Corrupt',
  'Liquid Ingress / Corrosion',
  'Charging / DC Jack / Type-C',
  'Keyboard / Trackpad Defect',
  'Thermal Overheating / Fan Stalled',
  'Audio / Speaker / Mic IC',
  'Wi-Fi / Bluetooth Module',
  'OS / Driver / Blue Screen',
  'SMPS / High-Voltage Circuit',
  'Physical Casing / Hinge Damage',
];

export const DIAGNOSTIC_OUTCOME_PRESETS = [
  'Primary Fault Identified & Repairable',
  'Secondary Short Circuit Found',
  'Component Replacement Required',
  'Board Track / Pad Rework Required',
  'BIOS / Firmware Re-flash Needed',
  'Thermal Pad / Paste Renewal Needed',
  'Needs Extended Stress Testing',
  'Intermittent / Hard-to-Reproduce Fault',
  'Beyond Economic Repair (BER / Unrepairable)',
  'Testing Passed / No Fault Found',
];

export const LABOR_SERVICE_PRESETS = [
  'Motherboard BGA Rework',
  'Charging IC / Power Rail Repair',
  'Display Replacement Labor',
  'BIOS / EC Chip Reprogramming',
  'Keyboard Replacement Labor',
  'OS & Driver Installation',
  'Thermal Servicing & Fan Cleaning',
  'Liquid Damage Ultrasonic Cleaning',
];

export const REPAIR_PART_PRESETS = [
  '15.6" FHD 30-Pin IPS Screen',
  '14.0" FHD IPS Screen',
  'BQ24780S Charging Controller IC',
  'ISL95520 Buck Controller IC',
  '512GB M.2 NVMe SSD',
  '8GB DDR4 3200MHz RAM',
  'Replacement Internal Battery',
  'Backlit Laptop Keyboard',
  'DC Power Jack Harness',
];

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
  const { shopSettings } = useShop();
  const [data, setData] = useState<JobDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
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
  const [inspCustomPowerStatus, setInspCustomPowerStatus] = useState('');
  const [inspDisplayStatus, setInspDisplayStatus] = useState('NORMAL');
  const [inspCustomDisplayStatus, setInspCustomDisplayStatus] = useState('');
  const [inspMotherboardStatus, setInspMotherboardStatus] = useState('NORMAL');
  const [inspCustomMotherboardStatus, setInspCustomMotherboardStatus] = useState('');
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

  // Diagnosis form states (Multi-Select Supported)
  const [diagRootCause, setDiagRootCause] = useState('');
  const [diagFaultCategories, setDiagFaultCategories] = useState<string[]>(['Motherboard / Chip-Level']);
  const [customFaultCategory, setCustomFaultCategory] = useState('');
  const [diagFaultyComponents, setDiagFaultyComponents] = useState('');
  const [diagVoltageRailsChecked, setDiagVoltageRailsChecked] = useState('');
  const [diagRecommendedAction, setDiagRecommendedAction] = useState('');
  const [diagOutcomes, setDiagOutcomes] = useState<string[]>(['Primary Fault Identified & Repairable']);
  const [customOutcome, setCustomOutcome] = useState('');
  const [isSavingDiag, setIsSavingDiag] = useState(false);

  // Discovered fault / sub-issue logger state (post-inspection discovery)
  const [newDiscoveredFault, setNewDiscoveredFault] = useState('');
  const [newDiscoveredSeverity, setNewDiscoveredSeverity] = useState<'CRITICAL' | 'MODERATE' | 'COSMETIC' | 'ADVISORY'>('MODERATE');
  const [isLoggingDiscoveredFault, setIsLoggingDiscoveredFault] = useState(false);

  // Unified Repair Plan & Parts item builder state
  const [planItemType, setPlanItemType] = useState<'LABOR' | 'PART'>('LABOR');
  const [planItemDescription, setPlanItemDescription] = useState('');
  const [planItemQuantity, setPlanItemQuantity] = useState(1);
  const [planItemPriceStr, setPlanItemPriceStr] = useState('');
  const [planItemCostStr, setPlanItemCostStr] = useState('');
  const [planItemSerial, setPlanItemSerial] = useState('');
  const [isAddingPlanItem, setIsAddingPlanItem] = useState(false);
  const [isGstEnabled, setIsGstEnabled] = useState(false);

  // Modals & Action States
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [showPrintSlipModal, setShowPrintSlipModal] = useState(false);
  const [estimateModalData, setEstimateModalData] = useState<{
    quotation: Record<string, unknown>;
    items: Array<Record<string, unknown>>;
    approval?: Record<string, unknown> | null;
  } | null>(null);
  const [invoiceModalData, setInvoiceModalData] = useState<{
    invoice: Record<string, unknown>;
    items: Array<Record<string, unknown>>;
    payments: Array<Record<string, unknown>>;
  } | null>(null);
  const [isCreatingQuotation, setIsCreatingQuotation] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [showQuickPaymentInJob, setShowQuickPaymentInJob] = useState(false);
  const [quickPayAmountStr, setQuickPayAmountStr] = useState('');
  const [quickPayMode, setQuickPayMode] = useState('UPI_QR');
  const [quickPayRef, setQuickPayRef] = useState('');

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
    setFetchError(null);
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
        } else {
          setFetchError(res?.error || `Service Job record for identifier "${jobId}" could not be found.`);
        }
      } else {
        setFetchError('Electron jobs API is unavailable in this environment.');
      }
    } catch (err: unknown) {
      setFetchError((err as Error).message);
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

      const finalPowerStatus = (inspPowerStatus === 'OTHER' && inspCustomPowerStatus.trim())
        ? inspCustomPowerStatus.trim()
        : inspPowerStatus;
      const finalDisplayStatus = (inspDisplayStatus === 'OTHER' && inspCustomDisplayStatus.trim())
        ? inspCustomDisplayStatus.trim()
        : inspDisplayStatus;
      const finalMotherboardStatus = (inspMotherboardStatus === 'OTHER' && inspCustomMotherboardStatus.trim())
        ? inspCustomMotherboardStatus.trim()
        : inspMotherboardStatus;

      const res = await window.electronAPI.jobs.saveTechnicalInspection({
        jobId,
        powerStatus: finalPowerStatus,
        displayStatus: finalDisplayStatus,
        motherboardStatus: finalMotherboardStatus,
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

  const toggleFaultCategory = (cat: string) => {
    setDiagFaultCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAddCustomFaultCategory = () => {
    const trimmed = customFaultCategory.trim();
    if (trimmed && !diagFaultCategories.includes(trimmed)) {
      setDiagFaultCategories((prev) => [...prev, trimmed]);
      setCustomFaultCategory('');
    }
  };

  const toggleDiagnosticOutcome = (outcome: string) => {
    setDiagOutcomes((prev) =>
      prev.includes(outcome) ? prev.filter((o) => o !== outcome) : [...prev, outcome]
    );
  };

  const handleAddCustomOutcome = () => {
    const trimmed = customOutcome.trim();
    if (trimmed && !diagOutcomes.includes(trimmed)) {
      setDiagOutcomes((prev) => [...prev, trimmed]);
      setCustomOutcome('');
    }
  };

  const handleLogDiscoveredFault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscoveredFault.trim()) return;

    try {
      setIsLoggingDiscoveredFault(true);
      if (!window.electronAPI?.jobs?.addNote) return;

      const faultContent = `[DISCOVERED FAULT - ${newDiscoveredSeverity}]: ${newDiscoveredFault.trim()}`;
      const res = await window.electronAPI.jobs.addNote({
        jobId,
        content: faultContent,
        noteType: 'INTERNAL',
      });

      if (res.success) {
        setNewDiscoveredFault('');
        fetchJob();
      } else {
        alert(res.error || 'Failed to log discovered fault');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsLoggingDiscoveredFault(false);
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

      const isUnrepairable = diagOutcomes.some(
        (o) => o.toLowerCase().includes('unrepairable') || o.includes('BER')
      );
      const combinedOutcome = diagOutcomes.length > 0 ? diagOutcomes.join(', ') : 'Primary Fault Identified & Repairable';
      const combinedCategories = diagFaultCategories.length > 0 ? diagFaultCategories.join(', ') : 'Motherboard / Chip-Level';

      const res = await window.electronAPI.jobs.saveDiagnosis({
        jobId,
        rootCauseAnalysis: diagRootCause.trim(),
        faultCategory: combinedCategories,
        faultyComponentsIdentified: diagFaultyComponents.trim() || undefined,
        voltageRailsChecked: diagVoltageRailsChecked.trim() || undefined,
        recommendedAction: diagRecommendedAction.trim() || undefined,
        diagnosticOutcome: isUnrepairable ? 'UNREPAIRABLE' : combinedOutcome,
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

  const renderDiscoveredFaultsSection = () => {
    const discoveredFaultNotes = (data?.notes || []).filter(
      (n) => n.content.startsWith('[DISCOVERED FAULT') || n.content.includes('[DISCOVERED FAULT')
    );

    return (
      <div
        style={{
          marginTop: '10px',
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px dashed var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={15} color="#eab308" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
              Post-Inspection Discovered Faults & Sub-Issues
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '4px' }}>
              ({discoveredFaultNotes.length} logged)
            </span>
          </div>
        </div>

        {discoveredFaultNotes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {discoveredFaultNotes.map((n) => {
              const isCritical = n.content.includes('CRITICAL');
              const isCosmetic = n.content.includes('COSMETIC');
              const isAdvisory = n.content.includes('ADVISORY');
              const badgeBg = isCritical ? 'var(--color-danger-bg)' : isCosmetic ? 'var(--color-info-bg)' : isAdvisory ? 'var(--color-purple-bg)' : 'var(--color-warning-bg)';
              const badgeColor = isCritical ? 'var(--color-danger)' : isCosmetic ? 'var(--color-info)' : isAdvisory ? 'var(--color-purple)' : 'var(--color-warning)';

              return (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: badgeBg,
                        color: badgeColor,
                      }}
                    >
                      {isCritical ? 'CRITICAL' : isCosmetic ? 'COSMETIC' : isAdvisory ? 'ADVISORY' : 'MODERATE'}
                    </span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                      {n.content.replace(/^\[DISCOVERED FAULT\s*-\s*[A-Z]+\]:\s*/i, '')}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    by {n.authorName || 'Technician'} • {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleLogDiscoveredFault} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newDiscoveredFault}
            onChange={(e) => setNewDiscoveredFault(e.target.value)}
            onBlur={() => setNewDiscoveredFault(autoCorrectFaultText(newDiscoveredFault))}
            placeholder="e.g. Found damaged trace near PU401 / Broken hinge mount during teardown..."
            spellCheck={true}
            autoCorrect="on"
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '12px',
            }}
          />
          <select
            value={newDiscoveredSeverity}
            onChange={(e) => setNewDiscoveredSeverity(e.target.value as any)}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <option value="CRITICAL">🔴 Critical (Blocks Repair)</option>
            <option value="MODERATE">🟡 Moderate (Secondary Fault)</option>
            <option value="COSMETIC">🔵 Cosmetic / Body Damage</option>
            <option value="ADVISORY">🟣 Advisory (Customer Note)</option>
          </select>
          <button
            type="submit"
            disabled={isLoggingDiscoveredFault || !newDiscoveredFault.trim()}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              border: 'none',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: !newDiscoveredFault.trim() ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={13} /> {isLoggingDiscoveredFault ? 'Logging...' : 'Log Discovered Fault'}
          </button>
        </form>
      </div>
    );
  };

  const handleUnifiedAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planItemDescription.trim()) return;
    setIsAddingPlanItem(true);

    try {
      if (planItemType === 'LABOR') {
        if (!window.electronAPI?.jobs?.addRepairPlanAction) return;
        const laborCharge = Number(planItemPriceStr) || 0;
        const res = await window.electronAPI.jobs.addRepairPlanAction({
          jobId,
          serviceName: planItemDescription.trim(),
          laborCharge,
        });

        if (res.success) {
          setPlanItemDescription('');
          setPlanItemPriceStr('');
          fetchJob();
        } else {
          alert(res.error || 'Failed to add repair plan action');
        }
      } else {
        if (!window.electronAPI?.jobs?.addRequiredPart) return;
        const unitSellingPrice = Number(planItemPriceStr) || 0;
        const unitCostPrice = Number(planItemCostStr) || 0;
        const res = await window.electronAPI.jobs.addRequiredPart({
          jobId,
          partName: planItemDescription.trim(),
          serialNumber: planItemSerial.trim() || undefined,
          quantity: Math.max(1, planItemQuantity),
          unitCostPrice,
          unitSellingPrice,
          warrantyMonths: 3,
        });

        if (res.success) {
          setPlanItemDescription('');
          setPlanItemSerial('');
          setPlanItemQuantity(1);
          setPlanItemCostStr('');
          setPlanItemPriceStr('');
          fetchJob();
        } else {
          alert(res.error || 'Failed to add required part');
        }
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsAddingPlanItem(false);
    }
  };

  const handleDeleteRepairPlanAction = async (serviceId: string) => {
    if (!window.electronAPI?.jobs?.deleteRepairPlanAction) return;
    const res = await window.electronAPI.jobs.deleteRepairPlanAction({ serviceId });
    if (res.success) {
      fetchJob();
    }
  };

  const handleDeleteRequiredPart = async (partId: string) => {
    if (!window.electronAPI?.jobs?.deleteRequiredPart) return;
    const res = await window.electronAPI.jobs.deleteRequiredPart({ partId });
    if (res.success) {
      fetchJob();
    }
  };

  const handleCreateOrViewQuotation = async () => {
    if (!data) return;
    setIsCreatingQuotation(true);
    try {
      if (!window.electronAPI?.billing) {
        alert('Billing API not available');
        return;
      }

      // Check if quotation already exists for this job
      const listRes = await window.electronAPI.billing.listQuotations({ jobId: data.job.id });
      if (listRes.success && listRes.data && listRes.data.length > 0) {
        const latestQ = listRes.data[0];
        const qDetail = await window.electronAPI.billing.getQuotationById({ quotationId: latestQ.id as string });
        if (qDetail.success && qDetail.data) {
          setEstimateModalData(qDetail.data);
          return;
        }
      }

      // Build items from repair plans and required parts
      const items: Array<{
        itemType: 'PART' | 'LABOR';
        inventoryItemId?: string;
        description: string;
        quantity: number;
        unitPrice: number;
        taxRate: number;
      }> = [];

      if (data.repairPlans && data.repairPlans.length > 0) {
        data.repairPlans.forEach((p) => {
          items.push({
            itemType: 'LABOR',
            description: p.serviceName,
            quantity: 1,
            unitPrice: p.laborCharge,
            taxRate: isGstEnabled ? (p.taxRate || 18) : 0,
          });
        });
      }

      if (data.requiredParts && data.requiredParts.length > 0) {
        data.requiredParts.forEach((part) => {
          items.push({
            itemType: 'PART',
            inventoryItemId: part.inventoryItemId || undefined,
            description: part.partName + (part.serialNumber ? ` (S/N: ${part.serialNumber})` : ''),
            quantity: part.quantity || 1,
            unitPrice: part.unitSellingPrice || 0,
            taxRate: isGstEnabled ? (part.taxRate || 18) : 0,
          });
        });
      }

      if (items.length === 0) {
        items.push({
          itemType: 'LABOR',
          description: `${data.job.deviceBrand} ${data.job.deviceModel} - Service & Repair Charges`,
          quantity: 1,
          unitPrice: data.job.estimatedCost > 0 ? data.job.estimatedCost : 500,
          taxRate: isGstEnabled ? 18 : 0,
        });
      }

      const res = await window.electronAPI.billing.createQuotation({
        jobId: data.job.id,
        isGstQuotation: isGstEnabled,
        items,
      });

      if (res.success && res.data) {
        const qDetail = await window.electronAPI.billing.getQuotationById({ quotationId: res.data.quotationId });
        if (qDetail.success && qDetail.data) {
          setEstimateModalData(qDetail.data);
        }
        fetchJob();
      } else {
        alert(res.error || 'Failed to generate quotation estimate');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsCreatingQuotation(false);
    }
  };

  const handleApproveQuotationDirectly = async (quotationId: string, approvedAmount: number) => {
    if (!data) return;
    try {
      if (!window.electronAPI?.billing?.recordApproval) return;
      const res = await window.electronAPI.billing.recordApproval({
        quotationId,
        approvalStatus: 'APPROVED',
        approvedAmount,
        approvalMethod: 'WHATSAPP',
        customerContactUsed: data.job.customerPhone,
        notes: 'Approved by customer via Estimate Workspace',
      });

      if (res.success) {
        const qDetail = await window.electronAPI.billing.getQuotationById({ quotationId });
        if (qDetail.success && qDetail.data) {
          setEstimateModalData(qDetail.data);
        }
        fetchJob();
      } else {
        alert(res.error || 'Failed to record customer approval');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleRejectQuotationDirectly = async (quotationId: string) => {
    if (!data) return;
    const reason = window.prompt('Enter customer reason for declining estimate:', 'Too expensive / Customer decided not to repair');
    if (reason === null) return;

    try {
      if (!window.electronAPI?.billing?.recordApproval) return;
      const res = await window.electronAPI.billing.recordApproval({
        quotationId,
        approvalStatus: 'REJECTED',
        approvedAmount: 0,
        approvalMethod: 'PHONE_CALL',
        customerContactUsed: data.job.customerPhone,
        notes: reason || 'Customer rejected estimate',
      });

      if (res.success) {
        const qDetail = await window.electronAPI.billing.getQuotationById({ quotationId });
        if (qDetail.success && qDetail.data) {
          setEstimateModalData(qDetail.data);
        }
        fetchJob();
      } else {
        alert(res.error || 'Failed to record rejection');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleToggleEstimateGst = async (newGstState: boolean) => {
    if (!estimateModalData) return;
    setIsGstEnabled(newGstState);
    try {
      if (!window.electronAPI?.billing?.toggleQuotationGst) return;
      const res = await window.electronAPI.billing.toggleQuotationGst({
        quotationId: String(estimateModalData.quotation.id),
        isGst: newGstState,
      });
      if (res.success) {
        const qDetail = await window.electronAPI.billing.getQuotationById({ quotationId: String(estimateModalData.quotation.id) });
        if (qDetail.success && qDetail.data) {
          setEstimateModalData(qDetail.data);
        }
        fetchJob();
      } else {
        alert(res.error || 'Failed to update GST setting on estimate');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleToggleInvoiceGst = async (newGstState: boolean) => {
    if (!invoiceModalData) return;
    setIsGstEnabled(newGstState);
    try {
      if (!window.electronAPI?.billing?.toggleInvoiceGst) return;
      const res = await window.electronAPI.billing.toggleInvoiceGst({
        invoiceId: String(invoiceModalData.invoice.id),
        isGst: newGstState,
      });
      if (res.success) {
        const invDetail = await window.electronAPI.billing.getInvoiceById({ invoiceId: String(invoiceModalData.invoice.id) });
        if (invDetail.success && invDetail.data) {
          setInvoiceModalData(invDetail.data);
        }
        fetchJob();
      } else {
        alert(res.error || 'Failed to update GST setting on invoice');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleCreateOrViewInvoice = async () => {
    if (!data) return;
    setIsCreatingInvoice(true);
    try {
      if (!window.electronAPI?.billing) {
        alert('Billing API not available');
        return;
      }

      // Check if invoice already exists for this job
      const listRes = await window.electronAPI.billing.listInvoices({ jobId: data.job.id });
      if (listRes.success && listRes.data && listRes.data.length > 0) {
        const latestInv = listRes.data[0];
        const invDetail = await window.electronAPI.billing.getInvoiceById({ invoiceId: latestInv.id as string });
        if (invDetail.success && invDetail.data) {
          setInvoiceModalData(invDetail.data);
          return;
        }
      }

      // Build items from repair plans and required parts
      const items: Array<{
        itemType: string;
        itemRefId?: string;
        description: string;
        quantity: number;
        unitPrice: number;
        taxRate: number;
      }> = [];

      if (data.repairPlans && data.repairPlans.length > 0) {
        data.repairPlans.forEach((p) => {
          items.push({
            itemType: 'LABOR',
            description: p.serviceName,
            quantity: 1,
            unitPrice: p.laborCharge,
            taxRate: isGstEnabled ? (p.taxRate || 18) : 0,
          });
        });
      }

      if (data.requiredParts && data.requiredParts.length > 0) {
        data.requiredParts.forEach((part) => {
          items.push({
            itemType: 'PART',
            itemRefId: part.inventoryItemId || undefined,
            description: part.partName + (part.serialNumber ? ` (S/N: ${part.serialNumber})` : ''),
            quantity: part.quantity || 1,
            unitPrice: part.unitSellingPrice || 0,
            taxRate: isGstEnabled ? (part.taxRate || 18) : 0,
          });
        });
      }

      if (items.length === 0) {
        items.push({
          itemType: 'LABOR',
          description: `${data.job.deviceBrand} ${data.job.deviceModel} - Service & Labor Charges`,
          quantity: 1,
          unitPrice: data.job.estimatedCost > 0 ? data.job.estimatedCost : 500,
          taxRate: isGstEnabled ? 18 : 0,
        });
      }

      const res = await window.electronAPI.billing.createInvoice({
        customerId: data.job.customerId,
        serviceJobId: data.job.id,
        invoiceType: 'SERVICE_REPAIR',
        isGstInvoice: isGstEnabled,
        advanceAdjusted: data.job.advanceDeposit || 0,
        items,
      });

      if (res.success && res.data) {
        const invDetail = await window.electronAPI.billing.getInvoiceById({ invoiceId: res.data.invoiceId });
        if (invDetail.success && invDetail.data) {
          setInvoiceModalData(invDetail.data);
        }
        fetchJob();
      } else {
        alert(res.error || 'Failed to generate tax invoice');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleRecordQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceModalData) return;
    const inv = invoiceModalData.invoice;
    const amount = Number(quickPayAmountStr) || 0;
    if (amount <= 0) return;

    try {
      if (!window.electronAPI?.billing?.recordPayment) return;
      const res = await window.electronAPI.billing.recordPayment({
        invoiceId: inv.id as string,
        amount,
        paymentMode: quickPayMode,
        transactionReference: quickPayRef.trim() || undefined,
        markJobDelivered: true,
      });

      if (res.success) {
        const invDetail = await window.electronAPI.billing.getInvoiceById({ invoiceId: inv.id as string });
        if (invDetail.success && invDetail.data) {
          setInvoiceModalData(invDetail.data);
        }
        setShowQuickPaymentInJob(false);
        setQuickPayAmountStr('');
        setQuickPayRef('');
        fetchJob();
      } else {
        alert(res.error || 'Failed to record payment');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleSendWhatsApp = (type: 'intake' | 'estimate' | 'ready' | 'delivery') => {
    if (!data) return;
    const j = data.job;
    const cleanPhone = (j.customerPhone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert('No valid customer phone number found.');
      return;
    }
    const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    const shopUpper = (shopSettings.shopName || 'KTech Computers').toUpperCase();
    const shopName = shopSettings.shopName || 'KTech Computers';
    const shopPhone = shopSettings.phone || '+91 98400 12345';
    const shopAddress = shopSettings.address || '1st Floor, Gandhi Road';

    let msg = '';
    if (type === 'intake') {
      msg = `*${shopUpper} - SERVICE INTAKE RECEIPT* 🛠️\n\nDear *${j.customerName}*,\nWe have received your device for repair service.\n\n📋 *Job Number:* ${j.jobNumber}\n💻 *Device:* ${j.deviceBrand} ${j.deviceModel}\n🔍 *Reported Issue:* ${j.reportedIssue}\n💰 *Est. Cost:* ₹${j.estimatedCost.toFixed(2)}\n💵 *Advance Paid:* ₹${j.advanceDeposit.toFixed(2)}\n\nOur certified technician is inspecting your device. You will receive diagnosis updates shortly!\n\n📍 *${shopName}*, ${shopAddress}\n📞 Support: ${shopPhone}`;
    } else if (type === 'estimate') {
      const diagText = data.diagnoses?.[0]?.rootCauseAnalysis || 'Inspection and circuit test completed';
      msg = `*${shopUpper} - ESTIMATE APPROVAL REQUIRED* 📋\n\nDear *${j.customerName}*,\nDiagnosis is complete for your *${j.deviceBrand} ${j.deviceModel}* (Job: ${j.jobNumber}).\n\n🔍 *Diagnosis:* ${diagText}\n💰 *Total Estimate:* ₹${j.estimatedCost.toFixed(2)}\n\nPlease reply *APPROVE* to authorize repair work or call us if you have any questions.\n\n📞 ${shopPhone} | ${shopName}`;
    } else if (type === 'ready') {
      const isInvoiceAvailable = Boolean(invoiceModalData?.invoice);
      const isGst = isInvoiceAvailable ? Boolean(invoiceModalData?.invoice?.is_gst_invoice) : false;
      const totalBill = isInvoiceAvailable
        ? Number(invoiceModalData?.invoice?.total_amount || invoiceModalData?.invoice?.totalAmount || j.estimatedCost)
        : j.estimatedCost;
      const advance = isInvoiceAvailable
        ? Number(invoiceModalData?.invoice?.advance_adjusted || invoiceModalData?.invoice?.advanceAdjusted || j.advanceDeposit)
        : j.advanceDeposit;
      const balance = isInvoiceAvailable
        ? Number(invoiceModalData?.invoice?.balance_due ?? invoiceModalData?.invoice?.balanceDue ?? Math.max(0, totalBill - advance))
        : Math.max(0, j.estimatedCost - j.advanceDeposit);
      const billNoStr = invoiceModalData?.invoice?.invoice_number ? `\n📄 *Bill No:* ${invoiceModalData.invoice.invoice_number}` : '';

      msg = `*${shopUpper} - ${isGst ? 'TAX INVOICE' : 'FINAL SERVICE BILL'}* 🧾\n\nDear *${j.customerName}*,\nGreat news! Your *${j.deviceBrand} ${j.deviceModel}* (Job: ${j.jobNumber}) is fully repaired and ready for collection.${billNoStr}\n\n💰 *Total Bill Amount:* ₹${totalBill.toFixed(2)}\n💵 *Advance Deducted:* ₹${advance.toFixed(2)}\n💳 *Final Balance Payable:* ₹${balance.toFixed(2)}\n\n⏰ Pickup Hours: 10:00 AM - 9:00 PM\n📍 ${shopName}, ${shopAddress}\n📞 Support: ${shopPhone}`;
    } else if (type === 'delivery') {
      msg = `*${shopUpper} - THANK YOU & WARRANTY* 🤝\n\nDear *${j.customerName}*,\nThank you for collecting your *${j.deviceBrand} ${j.deviceModel}* (Job: ${j.jobNumber}).\n\nWe appreciate your business! All repairs are backed by our service warranty.\nNeed any assistance in future? Contact us anytime at ${shopPhone}.`;
    }

    const url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setShowWhatsAppMenu(false);
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
    const isNotFound = fetchError?.toLowerCase().includes('not found') || !fetchError;
    return (
      <div
        style={{
          padding: '30px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          maxWidth: '600px',
          margin: '40px auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <AlertTriangle size={36} color="var(--color-danger)" />
        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
          {isNotFound ? 'Service Job Record Not Found' : 'Unable to Load Job Details'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {isNotFound
            ? 'Could not locate a service job matching the identifier:'
            : 'A database or system error occurred while loading this service job record:'}
          <div style={{ marginTop: '6px', fontFamily: 'var(--font-mono)', color: 'var(--brand-primary)', fontWeight: 600, fontSize: '13px' }}>
            {jobId}
          </div>
          {fetchError && !isNotFound && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#f87171', fontFamily: 'var(--font-mono)' }}>
              Diagnostic: {fetchError}
            </div>
          )}
        </div>
        <button
          onClick={onBack}
          style={{
            marginTop: '8px',
            padding: '7px 16px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back to List
        </button>
      </div>
    );
  }

  const { job, inspection, diagnoses, repairPlans, requiredParts, repairActivities, attachments, timeline, notes, photos } = data;
  const accessoriesList = Array.isArray(job.accessoriesReceived) ? job.accessoriesReceived : [];
  const isTechnicianRole = currentUser?.roleId === 'ROLE_TECHNICIAN' || currentUser?.roleId === 'ROLE_OWNER' || hasPermission('jobs.diagnose');

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
      {/* Top Breadcrumb & Status Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
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
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
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

              {/* Step: Quotation / Estimate generation & Quick Approval */}
              {(job.currentStatus === 'DIAGNOSIS_COMPLETED' || job.currentStatus === 'WAITING_FOR_APPROVAL') && (
                <>
                  <button
                    onClick={handleCreateOrViewQuotation}
                    disabled={isCreatingQuotation}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#8b5cf6',
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
                    <FileText size={13} /> {isCreatingQuotation ? 'Opening...' : '📋 View / Send Estimate'}
                  </button>

                  {job.currentStatus === 'WAITING_FOR_APPROVAL' && (
                    <button
                      onClick={() => handleStatusTransition('UNDER_REPAIR', 'Customer gave approval via phone/WhatsApp')}
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
                      <CheckCircle2 size={13} /> ✅ Customer Approved (Start Repair)
                    </button>
                  )}
                </>
              )}

              {/* Step: Final Bill / Tax Invoice generation */}
              {(job.currentStatus === 'REPAIR_COMPLETED' || job.currentStatus === 'UNDER_REPAIR' || job.currentStatus === 'READY_FOR_DELIVERY' || job.currentStatus === 'DELIVERED' || job.currentStatus === 'CLOSED') && (
                <button
                  onClick={handleCreateOrViewInvoice}
                  disabled={isCreatingInvoice}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--brand-primary)',
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
                  <Receipt size={13} /> {isCreatingInvoice ? 'Opening...' : (job.currentStatus === 'DELIVERED' || job.currentStatus === 'CLOSED' ? '🧾 View Final Bill' : '🧾 View / Generate Final Bill')}
                </button>
              )}

              {/* Step: Handover & Deliver */}
              {job.currentStatus === 'READY_FOR_DELIVERY' && (
                <button
                  onClick={() => handleStatusTransition('DELIVERED', 'Device handed over to customer and final payment settled')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#10b981',
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
                  <CheckCircle2 size={13} /> 🤝 Deliver to Customer
                </button>
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

          {/* 1-Click Integrated WhatsApp Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#25D366',
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
              <MessageSquare size={13} /> 📲 WhatsApp
            </button>
            {showWhatsAppMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  padding: '6px',
                  zIndex: 50,
                  minWidth: '220px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <button
                  onClick={() => handleSendWhatsApp('intake')}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  📄 Admission / Intake Slip
                </button>
                <button
                  onClick={() => handleSendWhatsApp('estimate')}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  📋 Estimate Approval Request
                </button>
                <button
                  onClick={() => handleSendWhatsApp('ready')}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  ✅ Ready for Pickup Alert
                </button>
                <button
                  onClick={() => handleSendWhatsApp('delivery')}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  🤝 Delivery & Warranty Receipt
                </button>
              </div>
            )}
          </div>

          {/* 🖨️ Print Slips Multi-Document Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPrintMenu(!showPrintMenu)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Printer size={13} /> 🖨️ Print Slips <ChevronDown size={12} />
            </button>
            {showPrintMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  padding: '6px',
                  zIndex: 50,
                  minWidth: '240px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <button
                  onClick={() => {
                    setShowPrintSlipModal(true);
                    setShowPrintMenu(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📄 1. Device Intake Slip
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                    Counter handover receipt given at admission
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowPrintMenu(false);
                    handleCreateOrViewQuotation();
                  }}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ fontWeight: 700, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📋 2. Cost Estimate Slip
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                    Quotation sheet with parts & labor pricing
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowPrintMenu(false);
                    handleCreateOrViewInvoice();
                  }}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ fontWeight: 700, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🧾 3. GST Tax Invoice / Final Bill
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                    Final delivery bill with or without GST breakdown
                  </span>
                </button>
              </div>
            )}
          </div>
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
          flexShrink: 0,
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
            backgroundColor: 'rgba(234, 179, 8, 0.08)',
            border: '1.5px solid rgba(234, 179, 8, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Customer Reported Complaint (Admission)
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                [Immutable Customer Record]
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '6px', lineHeight: 1.4 }}>
              "{job.reportedIssue}"
            </div>
          </div>

          {/* Admission accessories and condition tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            {accessoriesList.map((acc) => (
              <span
                key={acc}
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontWeight: 500,
                }}
              >
                + {acc}
              </span>
            ))}
            {job.physicalConditionNotes && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Cond: {job.physicalConditionNotes}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Technician Tabs Navigation */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 15,
          backgroundColor: 'var(--bg-app)',
          paddingTop: '6px',
          paddingBottom: '2px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'thin',
          flexShrink: 0,
          minHeight: '44px',
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
                backgroundColor: isActive ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                borderRadius: '6px 6px 0 0',
                color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s ease',
                flexShrink: 0,
              }}
            >
              <Icon size={14} color={isActive ? 'var(--brand-primary)' : 'var(--text-dim)'} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'var(--brand-primary)' : 'var(--bg-surface)',
                    color: isActive ? '#ffffff' : 'var(--text-dim)',
                    border: isActive ? 'none' : '1px solid var(--border-color)',
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px', flexShrink: 0 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
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
                <option value="OTHER">Other (Type Custom...)</option>
              </select>
              {inspPowerStatus === 'OTHER' && (
                <input
                  type="text"
                  placeholder="Specify power behavior..."
                  value={inspCustomPowerStatus}
                  onChange={(e) => setInspCustomPowerStatus(e.target.value)}
                  style={{ width: '100%', marginTop: '6px', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--brand-primary)', color: 'var(--text-main)', fontSize: '12px' }}
                  autoFocus
                />
              )}
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
                <option value="OTHER">Other (Type Custom...)</option>
              </select>
              {inspDisplayStatus === 'OTHER' && (
                <input
                  type="text"
                  placeholder="Specify display behavior..."
                  value={inspCustomDisplayStatus}
                  onChange={(e) => setInspCustomDisplayStatus(e.target.value)}
                  style={{ width: '100%', marginTop: '6px', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--brand-primary)', color: 'var(--text-main)', fontSize: '12px' }}
                  autoFocus
                />
              )}
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
                <option value="OTHER">Other (Type Custom...)</option>
              </select>
              {inspMotherboardStatus === 'OTHER' && (
                <input
                  type="text"
                  placeholder="Specify motherboard condition..."
                  value={inspCustomMotherboardStatus}
                  onChange={(e) => setInspCustomMotherboardStatus(e.target.value)}
                  style={{ width: '100%', marginTop: '6px', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--brand-primary)', color: 'var(--text-main)', fontSize: '12px' }}
                  autoFocus
                />
              )}
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
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', width: '130px' }}
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
                        style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '11px', outline: 'none', cursor: 'pointer' }}
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
              onKeyDown={(e) => handleAutoCorrectKeyDown(e, inspNotes, setInspNotes)}
              onBlur={() => setInspNotes(autoCorrectGeneralText(inspNotes))}
              placeholder="e.g. Injected 1V on 5V rail, thermal cam detected heating at charging controller PU401..."
              spellCheck={true}
              autoCorrect="on"
              style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
            />
          </div>

          {/* Post-Inspection Discovered Faults Card in Inspection Tab */}
          {renderDiscoveredFaultsSection()}
        </div>
      )}

      {/* TAB 3: DIAGNOSIS & ROOT CAUSE */}
      {activeTab === 'diagnosis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
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

          {/* Fault Categories (Multi-select) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={13} color="var(--brand-primary)" />
                Fault Categories ({diagFaultCategories.length} selected)
              </label>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Click tags to toggle multiple faults</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {FAULT_CATEGORY_PRESETS.map((cat) => {
                const isSelected = diagFaultCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleFaultCategory(cat)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '16px',
                      border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--brand-primary)' : 'var(--bg-surface)',
                      color: isSelected ? '#ffffff' : 'var(--text-dim)',
                      fontSize: '11px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected && <Check size={12} />}
                    {cat}
                  </button>
                );
              })}
              {diagFaultCategories.filter(c => !FAULT_CATEGORY_PRESETS.includes(c)).map((customCat) => (
                <button
                  key={customCat}
                  type="button"
                  onClick={() => toggleFaultCategory(customCat)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '16px',
                    border: '1px solid var(--brand-primary)',
                    backgroundColor: 'var(--brand-primary)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={12} />
                  {customCat}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px', maxWidth: '360px' }}>
              <input
                type="text"
                placeholder="+ Add custom fault tag..."
                value={customFaultCategory}
                onChange={(e) => setCustomFaultCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomFaultCategory();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomFaultCategory}
                disabled={!customFaultCategory.trim()}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Diagnostic Outcomes (Multi-select) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={13} color="var(--brand-primary)" />
                Diagnostic Findings & Outcomes ({diagOutcomes.length} selected)
              </label>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Select all applicable findings</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {DIAGNOSTIC_OUTCOME_PRESETS.map((outcome) => {
                const isSelected = diagOutcomes.includes(outcome);
                const isUnrepairable = outcome.includes('BER') || outcome.includes('Unrepairable');
                const activeBg = isUnrepairable ? '#dc2626' : 'var(--brand-primary)';
                const activeBorder = isUnrepairable ? '#ef4444' : 'var(--brand-primary)';

                return (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => toggleDiagnosticOutcome(outcome)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '16px',
                      border: isSelected ? `1px solid ${activeBorder}` : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? activeBg : 'var(--bg-surface)',
                      color: isSelected ? '#ffffff' : isUnrepairable ? '#f87171' : 'var(--text-dim)',
                      fontSize: '11px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected && <Check size={12} />}
                    {outcome}
                  </button>
                );
              })}
              {diagOutcomes.filter(o => !DIAGNOSTIC_OUTCOME_PRESETS.includes(o)).map((customOut) => (
                <button
                  key={customOut}
                  type="button"
                  onClick={() => toggleDiagnosticOutcome(customOut)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '16px',
                    border: '1px solid var(--brand-primary)',
                    backgroundColor: 'var(--brand-primary)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={12} />
                  {customOut}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px', maxWidth: '360px' }}>
              <input
                type="text"
                placeholder="+ Add custom outcome tag..."
                value={customOutcome}
                onChange={(e) => setCustomOutcome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomOutcome();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomOutcome}
                disabled={!customOutcome.trim()}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Add
              </button>
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
              onKeyDown={(e) => handleAutoCorrectKeyDown(e, diagRootCause, setDiagRootCause)}
              onBlur={() => setDiagRootCause(autoCorrectGeneralText(diagRootCause))}
              placeholder="e.g. Shorted High-Side MOSFET PQ302 on 19V rail caused charging controller PU401 to overheat and lock power delivery."
              spellCheck={true}
              autoCorrect="on"
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
                onKeyDown={(e) => handleAutoCorrectKeyDown(e, diagFaultyComponents, setDiagFaultyComponents)}
                onBlur={() => setDiagFaultyComponents(autoCorrectHardwareText(diagFaultyComponents))}
                placeholder="e.g. PU401 (BQ24780S), PQ302 (AON7408 MOSFET), PC201"
                spellCheck={true}
                autoCorrect="on"
                style={{ width: '100%', marginTop: '4px', padding: '7px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Recommended Technical Action</label>
              <input
                type="text"
                value={diagRecommendedAction}
                onChange={(e) => setDiagRecommendedAction(e.target.value)}
                onKeyDown={(e) => handleAutoCorrectKeyDown(e, diagRecommendedAction, setDiagRecommendedAction)}
                onBlur={() => setDiagRecommendedAction(autoCorrectGeneralText(diagRecommendedAction))}
                placeholder="e.g. Replace MOSFET & PWM chip; verify 19V rail before boot"
                spellCheck={true}
                autoCorrect="on"
                style={{ width: '100%', marginTop: '4px', padding: '7px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
              />
            </div>
          </div>

          {/* Post-Inspection Discovered Faults Card in Diagnosis Tab */}
          {renderDiscoveredFaultsSection()}
        </div>
      )}

      {/* TAB 4: REPAIR PLAN & REQUIRED PARTS */}
      {activeTab === 'repair' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0 }}>
          {/* Unified Container Card */}
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Header with Title and Real-Time Total Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={16} color="var(--brand-primary)" />
                  <Layers size={16} color="#fb923c" />
                  Repair Plan, Labor & Required Parts
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Unified workspace to define repair services, replacement hardware, and generate estimates or invoices.
                </div>
              </div>

              {/* Real-time Total Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>Total Items:</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>{repairPlans.length + requiredParts.length}</span>
                <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>Plan Total:</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                  ₹{(repairPlans.reduce((s, p) => s + (p.laborCharge || 0), 0) + requiredParts.reduce((s, p) => s + ((p.unitSellingPrice || 0) * (p.quantity || 1)), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* GST Configuration Toggle Bar (Unchecked by default for local/retail repairs) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: isGstEnabled ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-surface)',
                border: isGstEnabled ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border-color)',
                transition: 'all 0.15s ease',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={isGstEnabled}
                  onChange={(e) => setIsGstEnabled(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
                />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: isGstEnabled ? 'var(--brand-primary)' : 'var(--text-main)' }}>
                    {isGstEnabled ? '🧾 Apply GST (18% - CGST 9% + SGST 9%)' : '🚫 Standard Retail (No GST / 0% Tax)'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {isGstEnabled
                      ? 'Official Tax Invoice mode enabled. 18% GST with HSN/SAC will be applied to quotations and final bills.'
                      : 'Unchecked for local shops / retail repairs. Quotations & final bills will be generated with exact amounts without GST.'}
                  </div>
                </div>
              </label>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: isGstEnabled ? 'var(--brand-primary)' : 'var(--bg-card)',
                  color: isGstEnabled ? '#ffffff' : 'var(--text-dim)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {isGstEnabled ? 'GST 18% ACTIVE' : 'NON-GST / 0% TAX'}
              </span>
            </div>

            {/* Unified Add Item Form */}
            <form onSubmit={handleUnifiedAddItem} style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Type Switcher Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginRight: '4px' }}>ITEM TYPE:</span>
                <button
                  type="button"
                  onClick={() => {
                    setPlanItemType('LABOR');
                    setPlanItemQuantity(1);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: planItemType === 'LABOR' ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                    backgroundColor: planItemType === 'LABOR' ? 'rgba(2, 132, 199, 0.15)' : 'var(--bg-card)',
                    color: planItemType === 'LABOR' ? 'var(--brand-accent)' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Wrench size={13} /> Planned Service / Labor
                </button>

                <button
                  type="button"
                  onClick={() => setPlanItemType('PART')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: planItemType === 'PART' ? '1px solid #fb923c' : '1px solid var(--border-color)',
                    backgroundColor: planItemType === 'PART' ? 'rgba(251, 146, 60, 0.15)' : 'var(--bg-card)',
                    color: planItemType === 'PART' ? '#fb923c' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Layers size={13} /> Hardware Component / Spare Part
                </button>
              </div>

              {/* Form Input Grid (Clean Responsive Layout with No Overflow) */}
              <div style={{ display: 'grid', gridTemplateColumns: planItemType === 'PART' ? 'minmax(200px, 3fr) 75px minmax(95px, 1fr) minmax(110px, 1fr) auto' : 'minmax(220px, 3fr) minmax(130px, 1fr) auto', gap: '8px', alignItems: 'center' }}>
                
                {/* Description Input */}
                <input
                  type="text"
                  placeholder={planItemType === 'LABOR' ? "Service description (e.g. Board rework / Replace IC / Screen Fitting)" : "Part description (e.g. 15.6 FHD IPS Screen / BQ24780S IC)"}
                  value={planItemDescription}
                  onChange={(e) => setPlanItemDescription(e.target.value)}
                  onKeyDown={(e) => handleAutoCorrectKeyDown(e, planItemDescription, setPlanItemDescription)}
                  onBlur={() => setPlanItemDescription(planItemType === 'LABOR' ? autoCorrectTitle(planItemDescription) : autoCorrectHardwareText(planItemDescription))}
                  spellCheck={true}
                  autoCorrect="on"
                  required
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    width: '100%',
                    outline: 'none',
                  }}
                />

                {/* Part Qty */}
                {planItemType === 'PART' && (
                  <input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={planItemQuantity}
                    onChange={(e) => setPlanItemQuantity(Math.max(1, Number(e.target.value)))}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      textAlign: 'center',
                      outline: 'none',
                      width: '100%',
                    }}
                    title="Quantity"
                  />
                )}

                {/* Part Cost Price */}
                {planItemType === 'PART' && (
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Cost ₹ (Opt)"
                    value={planItemCostStr}
                    onChange={(e) => setPlanItemCostStr(e.target.value.replace(/[^0-9.]/g, ''))}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                      width: '100%',
                    }}
                    title="Unit Cost Price"
                  />
                )}

                {/* Labor Charge or Selling Price */}
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={planItemType === 'LABOR' ? "Labor Charge ₹" : "Selling Price ₹"}
                  value={planItemPriceStr}
                  onChange={(e) => setPlanItemPriceStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  required
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    outline: 'none',
                    width: '100%',
                  }}
                  title={planItemType === 'LABOR' ? "Labor Charge" : "Selling Price"}
                />

                {/* Submit Add Button */}
                <button
                  type="submit"
                  disabled={isAddingPlanItem}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: planItemType === 'LABOR' ? 'var(--brand-primary)' : '#fb923c',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    boxShadow: planItemType === 'LABOR' ? '0 2px 6px rgba(2, 132, 199, 0.3)' : '0 2px 6px rgba(251, 146, 60, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Plus size={14} />
                  {planItemType === 'LABOR' ? 'Add Service' : 'Add Part'}
                </button>
              </div>

              {/* Quick Tags row for fast entry */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', paddingTop: '2px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginRight: '4px' }}>Quick Presets:</span>
                {(planItemType === 'LABOR' ? LABOR_SERVICE_PRESETS : REPAIR_PART_PRESETS).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPlanItemDescription(preset)}
                    style={{
                      fontSize: '10.5px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </form>

            {/* Unified Items Table */}
            <div style={{ borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 12px', width: '110px' }}>Type</th>
                    <th style={{ padding: '8px 12px' }}>Item / Service Description</th>
                    <th style={{ padding: '8px 12px', width: '70px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '8px 12px', width: '120px', textAlign: 'right' }}>Unit Rate</th>
                    <th style={{ padding: '8px 12px', width: '120px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '8px 12px', width: '50px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {repairPlans.length === 0 && requiredParts.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                        No repair services or parts added to this job yet. Use the form above to add billable items.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Labor Services */}
                      {repairPlans.map((plan) => (
                        <tr key={plan.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.1s ease' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(2, 132, 199, 0.15)', color: 'var(--brand-accent)', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                              <Wrench size={11} /> Labor
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {plan.serviceName}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            1
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            ₹{plan.laborCharge.toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                            ₹{plan.laborCharge.toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteRepairPlanAction(plan.id)}
                              title="Delete service action"
                              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Required Parts */}
                      {requiredParts.map((part) => (
                        <tr key={part.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.1s ease' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(251, 146, 60, 0.15)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
                              <Layers size={11} /> Part
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-main)' }}>
                            <div style={{ fontWeight: 600 }}>{part.partName}</div>
                            {part.serialNumber && (
                              <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                S/N: {part.serialNumber}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-main)' }}>
                            {part.quantity}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            ₹{part.unitSellingPrice.toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                            ₹{(part.unitSellingPrice * part.quantity).toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteRequiredPart(part.id)}
                              title="Delete part"
                              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Subtotal Breakdown & Grand Total Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '12px 16px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Total Labor: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>₹{repairPlans.reduce((s, p) => s + (p.laborCharge || 0), 0).toFixed(2)}</strong> ({repairPlans.length})
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Total Parts: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>₹{requiredParts.reduce((s, p) => s + ((p.unitSellingPrice || 0) * (p.quantity || 1)), 0).toFixed(2)}</strong> ({requiredParts.length})
                </span>
                {isGstEnabled && (
                  <span style={{ color: '#0284c7' }}>
                    GST (18%): <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{((repairPlans.reduce((s, p) => s + (p.laborCharge || 0), 0) + requiredParts.reduce((s, p) => s + ((p.unitSellingPrice || 0) * (p.quantity || 1)), 0)) * 0.18).toFixed(2)}</strong>
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {isGstEnabled ? 'ESTIMATED TOTAL (INCL. GST):' : 'ESTIMATED TOTAL (NO GST):'}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                  ₹{(
                    (repairPlans.reduce((s, p) => s + (p.laborCharge || 0), 0) + requiredParts.reduce((s, p) => s + ((p.unitSellingPrice || 0) * (p.quantity || 1)), 0)) *
                    (isGstEnabled ? 1.18 : 1.0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quick Conversion Banner */}
            <div style={{ padding: '14px 18px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  Ready to Quote or Bill this Service?
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Convert the repair services & replacement parts above into an official document with 1 click:
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleCreateOrViewQuotation}
                  disabled={isCreatingQuotation}
                  style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#8b5cf6', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileText size={14} /> {isCreatingQuotation ? 'Opening...' : '📋 Generate & View Estimate Slip'}
                </button>
                <button
                  type="button"
                  onClick={handleCreateOrViewInvoice}
                  disabled={isCreatingInvoice}
                  style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Receipt size={14} /> {isCreatingInvoice ? 'Opening...' : '🧾 Generate & View Final Bill / Invoice'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 5: REPAIR ACTIVITIES LOG */}
      {activeTab === 'activities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
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
                onKeyDown={(e) => handleAutoCorrectKeyDown(e, actTitle, setActTitle)}
                onBlur={() => setActTitle(autoCorrectTitle(actTitle))}
                spellCheck={true}
                autoCorrect="on"
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
              onKeyDown={(e) => handleAutoCorrectKeyDown(e, actDescription, setActDescription)}
              onBlur={() => setActDescription(autoCorrectGeneralText(actDescription))}
              spellCheck={true}
              autoCorrect="on"
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
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

      {/* Printable Job Intake Counter Slip Modal */}
      {showPrintSlipModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '12px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
            }}
          >
            {/* Modal Controls (Hidden in Print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#334155' }}>
                📄 Device Intake Counter Slip Preview
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Printer size={15} /> Print Slip
                </button>
                <button
                  onClick={() => setShowPrintSlipModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div id="printable-intake-slip" style={{ fontFamily: 'system-ui, sans-serif' }}>
              {/* Slip Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '12px' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', color: '#0f172a' }}>
                    {(shopSettings.shopName || 'KTech Computers').toUpperCase()}
                  </h1>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    {shopSettings.tagline}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    {shopSettings.address} | Phone: {shopSettings.phone} {shopSettings.gstin ? `| GSTIN: ${shopSettings.gstin}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#2563eb' }}>
                    {job.jobNumber}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Date: {new Date(job.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Grid Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', fontSize: '12px' }}>
                {/* Customer Box */}
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                    Customer Details
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{job.customerName}</div>
                  <div style={{ color: '#334155' }}>Phone: {job.customerPhone}</div>
                  {job.customerSecondaryPhone && <div style={{ color: '#64748b', fontSize: '11px' }}>Alt: {job.customerSecondaryPhone}</div>}
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Customer Code: {job.customerCode}</div>
                </div>

                {/* Device Box */}
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                    Device Information
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    {job.deviceBrand} {job.deviceModel}
                  </div>
                  <div style={{ color: '#334155' }}>Type: {job.equipmentType.replace(/_/g, ' ')}</div>
                  {job.deviceSerial && <div style={{ color: '#64748b', fontSize: '11px' }}>S/N: {job.deviceSerial}</div>}
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Passcode: {job.hasPasscode ? 'Provided in Vault' : 'None / Pattern'}</div>
                </div>
              </div>

              {/* Problem Description */}
              <div style={{ marginTop: '14px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                  Customer Complaint / Reported Defect
                </div>
                <div style={{ color: '#0f172a', fontWeight: 600 }}>{job.reportedIssue}</div>
                {job.physicalConditionNotes && (
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                    Physical Condition: {job.physicalConditionNotes}
                  </div>
                )}
                {accessoriesList.length > 0 && (
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                    Accessories Received: {accessoriesList.join(', ')}
                  </div>
                )}
              </div>

              {/* Financial Breakdown */}
              <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
                <div style={{ padding: '10px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '10px', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>Est. Cost</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>
                    ₹{job.estimatedCost.toFixed(2)}
                  </div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '10px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Advance Paid</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#14532d', marginTop: '2px' }}>
                    ₹{job.advanceDeposit.toFixed(2)}
                  </div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#fff7ed', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: '10px', color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>Est. Balance</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#7c2d12', marginTop: '2px' }}>
                    ₹{Math.max(0, job.estimatedCost - job.advanceDeposit).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div style={{ marginTop: '16px', padding: '8px 12px', borderLeft: '3px solid #cbd5e1', fontSize: '10px', color: '#64748b', lineHeight: 1.4 }}>
                1. Devices unclaimed within 30 days of completion notification may be disposed to recover repair costs.<br />
                2. Customers are advised to maintain backup of data. {shopSettings.shopName} is not responsible for data loss during hardware repair.<br />
                3. Physical damages during unboxing or pre-existing liquid corrosion are customer risks.<br />
                4. Production of this original intake slip is compulsory for device collection.
              </div>

              {/* Signatures */}
              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '10px' }}>
                <div style={{ textAlign: 'center', width: '200px', borderTop: '1px dashed #94a3b8', paddingTop: '6px', fontSize: '11px', color: '#475569' }}>
                  Customer Signature
                </div>
                <div style={{ textAlign: 'center', width: '200px', borderTop: '1px dashed #94a3b8', paddingTop: '6px', fontSize: '11px', color: '#475569' }}>
                  Authorized Signatory ({shopSettings.shopName})
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📋 Cost Estimate Quotation Preview Modal */}
      {estimateModalData && (() => {
        const isEstimateGst = Number(estimateModalData.quotation.tax_total || estimateModalData.quotation.tax_amount || 0) > 0;

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                borderRadius: '12px',
                maxWidth: '780px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                padding: '28px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
              }}
            >
              {/* Modal Controls (Sticky Top Bar - Hidden in Print) */}
              <div
                className="no-print"
                style={{
                  position: 'sticky',
                  top: '-28px',
                  backgroundColor: '#ffffff',
                  zIndex: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  paddingTop: '6px',
                  paddingBottom: '14px',
                  borderBottom: '2px solid #f1f5f9',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                {/* Left: Title + Clean Segmented Pill Mode Switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 900, fontSize: '16px', color: '#6b21a8' }}>
                      Cost Estimate
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: String(estimateModalData.quotation.status) === 'APPROVED' ? '#dcfce7' : '#f3e8ff',
                        color: String(estimateModalData.quotation.status) === 'APPROVED' ? '#166534' : '#7e22ce',
                      }}
                    >
                      {String(estimateModalData.quotation.status || 'DRAFT')}
                    </span>
                  </div>

                  {/* Clean Segmented GST / Non-GST Switcher */}
                  <div
                    style={{
                      display: 'inline-flex',
                      padding: '3px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleEstimateGst(false)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: !isEstimateGst ? 800 : 600,
                        backgroundColor: !isEstimateGst ? '#ffffff' : 'transparent',
                        color: !isEstimateGst ? '#0f172a' : '#64748b',
                        boxShadow: !isEstimateGst ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      🚫 Non-GST (0% Tax)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleEstimateGst(true)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: isEstimateGst ? 800 : 600,
                        backgroundColor: isEstimateGst ? '#7e22ce' : 'transparent',
                        color: isEstimateGst ? '#ffffff' : '#64748b',
                        boxShadow: isEstimateGst ? '0 1px 3px rgba(126, 34, 206, 0.3)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      🧾 18% GST Tax
                    </button>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {String(estimateModalData.quotation.status) !== 'APPROVED' && (
                    <>
                      <button
                        onClick={() => handleApproveQuotationDirectly(
                          String(estimateModalData.quotation.id),
                          Number(estimateModalData.quotation.total_amount || estimateModalData.quotation.totalAmount || 0)
                        )}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle2 size={14} /> Accept
                      </button>
                      <button
                        onClick={() => handleRejectQuotationDirectly(String(estimateModalData.quotation.id))}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleSendWhatsApp('estimate')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#25D366',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </button>

                  <button
                    onClick={() => window.print()}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#7e22ce',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Printer size={14} /> Print
                  </button>

                  <button
                    onClick={() => setEstimateModalData(null)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* Printable Quotation Document */}
              <div id="printable-estimate-slip" style={{ fontFamily: 'system-ui, sans-serif' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #6b21a8', paddingBottom: '12px' }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', color: '#0f172a' }}>
                      {(shopSettings.shopName || 'KTech Computers').toUpperCase()}
                    </h1>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      {shopSettings.tagline}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      {shopSettings.address} | Phone: {shopSettings.phone} {shopSettings.gstin ? `| GSTIN: ${shopSettings.gstin}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: isEstimateGst ? '#7e22ce' : '#2563eb' }}>
                      {isEstimateGst ? 'REPAIR COST ESTIMATE (WITH GST)' : 'REPAIR COST ESTIMATE (NON-GST)'}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'monospace', color: '#6b21a8' }}>
                      {String(estimateModalData.quotation.quotation_number || estimateModalData.quotation.quotationNumber || '')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Job Ref: <strong>{job.jobNumber}</strong>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      Date: {new Date(String(estimateModalData.quotation.created_at || estimateModalData.quotation.createdAt || new Date())).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Customer & Device Information */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px', fontSize: '12px' }}>
                  <div style={{ padding: '10px', backgroundColor: '#faf5ff', borderRadius: '6px', border: '1px solid #f3e8ff' }}>
                    <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: '#7e22ce', marginBottom: '4px' }}>
                      Customer Details
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{job.customerName}</div>
                    <div style={{ color: '#334155' }}>Phone: {job.customerPhone}</div>
                    <div style={{ color: '#64748b', fontSize: '11px' }}>Customer Code: {job.customerCode}</div>
                  </div>

                  <div style={{ padding: '10px', backgroundColor: '#faf5ff', borderRadius: '6px', border: '1px solid #f3e8ff' }}>
                    <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: '#7e22ce', marginBottom: '4px' }}>
                      Device & Issue
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {job.deviceBrand} {job.deviceModel}
                    </div>
                    <div style={{ color: '#334155' }}>Type: {job.equipmentType.replace(/_/g, ' ')}</div>
                    <div style={{ color: '#64748b', fontSize: '11px' }}>Defect: {job.reportedIssue}</div>
                  </div>
                </div>

                {/* Itemized Table */}
                <div style={{ marginTop: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 10px', width: '40px' }}>#</th>
                        <th style={{ padding: '8px 10px', width: '80px' }}>Type</th>
                        <th style={{ padding: '8px 10px' }}>Description / Repair Action</th>
                        <th style={{ padding: '8px 10px', width: '50px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '8px 10px', width: '90px', textAlign: 'right' }}>Rate (₹)</th>
                        {isEstimateGst && <th style={{ padding: '8px 10px', width: '70px', textAlign: 'right' }}>GST %</th>}
                        <th style={{ padding: '8px 10px', width: '100px', textAlign: 'right' }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimateModalData.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: item.item_type === 'PART' || item.itemType === 'PART' ? '#fff7ed' : '#eff6ff',
                                color: item.item_type === 'PART' || item.itemType === 'PART' ? '#c2410c' : '#1d4ed8',
                              }}
                            >
                              {String(item.item_type || item.itemType || 'LABOR')}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                            {String(item.description || '')}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334155' }}>
                            {Number(item.quantity || 1)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#334155' }}>
                            {Number(item.unit_price || item.unitPrice || 0).toFixed(2)}
                          </td>
                          {isEstimateGst && (
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>
                              {Number(item.tax_rate || item.taxRate || 0)}%
                            </td>
                          )}
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                            {Number(item.total_amount || item.totalAmount || (Number(item.quantity || 1) * Number(item.unit_price || item.unitPrice || 0))).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Totals Summary */}
                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Parts Subtotal:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>₹{Number(estimateModalData.quotation.parts_subtotal || estimateModalData.quotation.partsSubtotal || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Labor Subtotal:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>₹{Number(estimateModalData.quotation.labor_subtotal || estimateModalData.quotation.laborSubtotal || 0).toFixed(2)}</span>
                    </div>
                    {isEstimateGst ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>GST Tax (CGST + SGST):</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>₹{Number(estimateModalData.quotation.tax_total || estimateModalData.quotation.tax_amount || 0).toFixed(2)}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11px' }}>
                        <span>Tax (Non-GST / 0%):</span>
                        <span style={{ fontFamily: 'monospace' }}>₹0.00</span>
                      </div>
                    )}
                    {job.advanceDeposit > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
                        <span>Advance Paid Deductible:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>- ₹{job.advanceDeposit.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      <span>Estimated Net Total:</span>
                      <span style={{ fontFamily: 'monospace', color: '#6b21a8' }}>
                        ₹{Math.max(0, Number(estimateModalData.quotation.total_amount || estimateModalData.quotation.totalAmount || 0) - job.advanceDeposit).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quotation Approval Status Alert */}
                {estimateModalData.approval ? (
                  <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '12px', color: '#166534' }}>
                    <strong>✅ Customer Authorization Recorded:</strong> {String(estimateModalData.approval.approval_status)} via {String(estimateModalData.approval.approval_method)} on {new Date(String(estimateModalData.approval.approval_timestamp || estimateModalData.approval.created_at)).toLocaleString('en-IN')}.
                  </div>
                ) : (
                  <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', fontSize: '11px', color: '#6b21a8' }}>
                    ℹ️ <em>Please approve this estimate via WhatsApp or phone call so bench repair work can begin.</em>
                  </div>
                )}

                {/* Terms & Conditions */}
                <div style={{ marginTop: '14px', padding: '8px 12px', borderLeft: '3px solid #cbd5e1', fontSize: '10px', color: '#64748b', lineHeight: 1.4 }}>
                  1. This estimate is valid for 7 days from the date of issue.<br />
                  2. If additional internal board damage is discovered during micro-soldering, a revised estimate will be sent.<br />
                  3. Repair work commences immediately upon customer approval.
                </div>

                {/* Signatures */}
                <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '10px' }}>
                  <div style={{ textAlign: 'center', width: '200px', borderTop: '1px dashed #94a3b8', paddingTop: '6px', fontSize: '11px', color: '#475569' }}>
                    Customer Acceptance Signature
                  </div>
                  <div style={{ textAlign: 'center', width: '200px', borderTop: '1px dashed #94a3b8', paddingTop: '6px', fontSize: '11px', color: '#475569' }}>
                    Authorized Signatory ({shopSettings.shopName})
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🧾 GST Tax Invoice & Cash Bill Preview Modal */}
      {invoiceModalData && (() => {
        const isInvoiceGst = Boolean(
          invoiceModalData.invoice.is_gst_invoice === 1 ||
          invoiceModalData.invoice.is_gst_invoice === true ||
          invoiceModalData.invoice.isGstInvoice
        ) && (Number(invoiceModalData.invoice.cgst_amount || 0) + Number(invoiceModalData.invoice.sgst_amount || 0) > 0 || Number(invoiceModalData.invoice.tax_total || invoiceModalData.invoice.taxTotal || 0) > 0);

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                borderRadius: '12px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                padding: '28px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
              }}
            >
              {/* Modal Controls (Sticky Top Bar - Hidden in Print) */}
              <div
                className="no-print"
                style={{
                  position: 'sticky',
                  top: '-28px',
                  backgroundColor: '#ffffff',
                  zIndex: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  paddingTop: '6px',
                  paddingBottom: '14px',
                  borderBottom: '2px solid #f1f5f9',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                {/* Left: Title + Clean Segmented Pill Mode Switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 900, fontSize: '16px', color: '#0284c7' }}>
                      {isInvoiceGst ? 'GST Tax Invoice' : 'Final Service Bill / Cash Memo'}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: String(invoiceModalData.invoice.payment_status || invoiceModalData.invoice.paymentStatus) === 'PAID' ? '#dcfce7' : '#fee2e2',
                        color: String(invoiceModalData.invoice.payment_status || invoiceModalData.invoice.paymentStatus) === 'PAID' ? '#166534' : '#dc2626',
                      }}
                    >
                      {String(invoiceModalData.invoice.payment_status || invoiceModalData.invoice.paymentStatus || 'UNPAID')}
                    </span>
                  </div>

                  {/* Clean Segmented GST / Non-GST Switcher */}
                  <div
                    style={{
                      display: 'inline-flex',
                      padding: '3px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleInvoiceGst(false)}
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
                      onClick={() => handleToggleInvoiceGst(true)}
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
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {Number(invoiceModalData.invoice.balance_due ?? invoiceModalData.invoice.balanceDue ?? 1) > 0 && (
                    <button
                      onClick={() => {
                        setQuickPayAmountStr(String(invoiceModalData.invoice.balance_due ?? invoiceModalData.invoice.balanceDue ?? ''));
                        setShowQuickPaymentInJob(!showQuickPaymentInJob);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CreditCard size={14} /> Collect Pay
                    </button>
                  )}

                  <button
                    onClick={() => handleSendWhatsApp('ready')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#25D366',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </button>

                  <button
                    onClick={() => window.print()}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Printer size={14} /> Print
                  </button>

                  <button
                    onClick={() => {
                      setInvoiceModalData(null);
                      setShowQuickPaymentInJob(false);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

            {/* Quick Payment Collection Form */}
            {showQuickPaymentInJob && (
              <form
                onSubmit={handleRecordQuickPayment}
                className="no-print"
                style={{
                  marginBottom: '20px',
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={15} /> Collect Customer Payment & Settle Delivery
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#166534' }}>Amount to Collect (₹)</label>
                    <input
                      type="text"
                      value={quickPayAmountStr}
                      onChange={(e) => setQuickPayAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
                      required
                      style={{ width: '100%', marginTop: '3px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #86efac', fontSize: '13px', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#166534' }}>Payment Mode</label>
                    <select
                      value={quickPayMode}
                      onChange={(e) => setQuickPayMode(e.target.value)}
                      style={{ width: '100%', marginTop: '3px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #86efac', fontSize: '12px', fontWeight: 600 }}
                    >
                      <option value="UPI_QR">📲 UPI / QR Code</option>
                      <option value="CASH">💵 Cash</option>
                      <option value="CREDIT_CARD">💳 Credit Card</option>
                      <option value="DEBIT_CARD">💳 Debit Card</option>
                      <option value="NET_BANKING">🏦 Net Banking / NEFT</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#166534' }}>Txn Ref / UTR / Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. GPay Ref # 938472"
                      value={quickPayRef}
                      onChange={(e) => setQuickPayRef(e.target.value)}
                      style={{ width: '100%', marginTop: '3px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #86efac', fontSize: '12px' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowQuickPaymentInJob(false)}
                    style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#e2e8f0', border: 'none', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '6px 16px', borderRadius: '4px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Record Payment & Mark Delivered
                  </button>
                </div>
              </form>
            )}

            {/* Printable Tax Invoice Document */}
            <div id="printable-tax-invoice" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '12px' }}>
                    <div>
                      <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', color: '#0f172a' }}>
                        {(shopSettings.shopName || 'KTech Computers').toUpperCase()}
                      </h1>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                        {shopSettings.tagline}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        {shopSettings.address} | Phone: {shopSettings.phone}
                      </div>
                      {shopSettings.gstin && (
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                          GSTIN: {shopSettings.gstin}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: isInvoiceGst ? '#0284c7' : '#166534' }}>
                        {isInvoiceGst ? 'TAX INVOICE / BILL OF SUPPLY' : 'FINAL SERVICE BILL / CASH MEMO'}
                      </div>
                      <div style={{ fontSize: '17px', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                        {String(invoiceModalData.invoice.invoice_number || invoiceModalData.invoice.invoiceNumber || '')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Job Ref: <strong>{job.jobNumber}</strong>
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        Date: {new Date(String(invoiceModalData.invoice.created_at || invoiceModalData.invoice.createdAt || new Date())).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Customer & Device Information */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px', fontSize: '12px' }}>
                    <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: '#475569', marginBottom: '4px' }}>
                        Billed To (Customer)
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{job.customerName}</div>
                      <div style={{ color: '#334155' }}>Phone: {job.customerPhone}</div>
                      {String(invoiceModalData.invoice.customer_gstin || '') && (
                        <div style={{ color: '#0284c7', fontWeight: 700, fontSize: '11px' }}>
                          GSTIN: {String(invoiceModalData.invoice.customer_gstin)}
                        </div>
                      )}
                      <div style={{ color: '#64748b', fontSize: '11px' }}>Customer Code: {job.customerCode}</div>
                    </div>

                    <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: '#475569', marginBottom: '4px' }}>
                        Service Details
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {job.deviceBrand} {job.deviceModel}
                      </div>
                      <div style={{ color: '#334155' }}>Type: {job.equipmentType.replace(/_/g, ' ')}</div>
                      {job.deviceSerial && <div style={{ color: '#64748b', fontSize: '11px' }}>S/N: {job.deviceSerial}</div>}
                      <div style={{ color: '#64748b', fontSize: '11px' }}>Defect Repaired: {job.reportedIssue}</div>
                    </div>
                  </div>

                  {/* Itemized Table */}
                  <div style={{ marginTop: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '8px 10px', width: '35px' }}>#</th>
                          <th style={{ padding: '8px 10px' }}>Item / Service Description</th>
                          {isInvoiceGst && <th style={{ padding: '8px 10px', width: '80px' }}>HSN/SAC</th>}
                          <th style={{ padding: '8px 10px', width: '45px', textAlign: 'center' }}>Qty</th>
                          <th style={{ padding: '8px 10px', width: '85px', textAlign: 'right' }}>Rate (₹)</th>
                          {isInvoiceGst && <th style={{ padding: '8px 10px', width: '65px', textAlign: 'right' }}>GST %</th>}
                          <th style={{ padding: '8px 10px', width: '95px', textAlign: 'right' }}>Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceModalData.items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{idx + 1}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                              {String(item.description || '')}
                            </td>
                            {isInvoiceGst && (
                              <td style={{ padding: '8px 10px', color: '#64748b', fontFamily: 'monospace', fontSize: '11px' }}>
                                {String(item.hsn_sac_code || item.hsnSacCode || (item.item_type === 'PART' ? '847330' : '998713'))}
                              </td>
                            )}
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334155' }}>
                              {Number(item.quantity || 1)}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#334155' }}>
                              {Number(item.unit_price || item.unitPrice || 0).toFixed(2)}
                            </td>
                            {isInvoiceGst && (
                              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>
                                {Number(item.tax_rate || item.taxRate || 18)}%
                              </td>
                            )}
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                              {Number(item.total_amount || item.totalAmount || (Number(item.quantity || 1) * Number(item.unit_price || item.unitPrice || 0))).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Totals Summary */}
                  <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '290px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>{isInvoiceGst ? 'Taxable Subtotal:' : 'Items Subtotal:'}</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>₹{Number(invoiceModalData.invoice.subtotal || (Number(invoiceModalData.invoice.subtotal_parts || 0) + Number(invoiceModalData.invoice.subtotal_labor || 0)) || 0).toFixed(2)}</span>
                      </div>
                      {isInvoiceGst ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                          <span>GST (CGST 9% + SGST 9%):</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>₹{Number(invoiceModalData.invoice.tax_total || invoiceModalData.invoice.taxTotal || (Number(invoiceModalData.invoice.cgst_amount || 0) + Number(invoiceModalData.invoice.sgst_amount || 0)) || 0).toFixed(2)}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11px' }}>
                          <span>Taxes / GST:</span>
                          <span style={{ fontWeight: 600 }}>₹0.00 (Non-GST Bill)</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                        <span>{isInvoiceGst ? 'Gross Invoice Amount:' : 'Total Amount Payable:'}</span>
                        <span style={{ fontFamily: 'monospace' }}>₹{Number(invoiceModalData.invoice.total_amount || invoiceModalData.invoice.totalAmount || 0).toFixed(2)}</span>
                      </div>
                      {Number(invoiceModalData.invoice.advance_adjusted || invoiceModalData.invoice.advanceAdjusted || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
                          <span>Advance Deposit Adjusted:</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>- ₹{Number(invoiceModalData.invoice.advance_adjusted || invoiceModalData.invoice.advanceAdjusted || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: 600 }}>
                        <span>Total Paid / Received:</span>
                        <span style={{ fontFamily: 'monospace' }}>₹{Number(invoiceModalData.invoice.paid_amount || invoiceModalData.invoice.paidAmount || invoiceModalData.invoice.amount_paid || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                        <span>Balance Due:</span>
                        <span style={{ fontFamily: 'monospace', color: Number(invoiceModalData.invoice.balance_due ?? invoiceModalData.invoice.balanceDue ?? 0) > 0 ? '#dc2626' : '#166534' }}>
                          ₹{Number(invoiceModalData.invoice.balance_due ?? invoiceModalData.invoice.balanceDue ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Receipts Section */}
                  {invoiceModalData.payments && invoiceModalData.payments.length > 0 && (
                    <div style={{ marginTop: '16px', padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '11px' }}>
                      <div style={{ fontWeight: 700, color: '#166534', marginBottom: '4px' }}>Payments Recorded:</div>
                      {invoiceModalData.payments.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#14532d' }}>
                          <span>{String(p.receipt_number || p.receiptNumber || 'REC')} • {String(p.payment_mode || p.paymentMode || 'CASH')} {p.transaction_reference ? `(Ref: ${p.transaction_reference})` : ''} on {new Date(String(p.payment_date || p.createdAt || new Date())).toLocaleDateString('en-IN')}</span>
                          <strong style={{ fontFamily: 'monospace' }}>₹{Number(p.amount || 0).toFixed(2)}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warranty & Terms */}
                  <div style={{ marginTop: '14px', padding: '8px 12px', borderLeft: '3px solid #cbd5e1', fontSize: '10px', color: '#64748b', lineHeight: 1.4 }}>
                    1. Service warranty: 30 days on motherboard service labor from delivery date.<br />
                    2. Replacement components carry manufacturer replacement warranty.<br />
                    3. Physical damages, liquid contact, burn marks or broken warranty stickers void all warranties.
                  </div>

                  {/* Signatures */}
                  <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '10px' }}>
                    <div style={{ textAlign: 'center', width: '200px', borderTop: '1px dashed #94a3b8', paddingTop: '6px', fontSize: '11px', color: '#475569' }}>
                      Customer Signature (Received Goods in Good Order)
                    </div>
                    <div style={{ textAlign: 'center', width: '200px', borderTop: '1px dashed #94a3b8', paddingTop: '6px', fontSize: '11px', color: '#475569' }}>
                      Authorized Signatory ({shopSettings.shopName})
                    </div>
                  </div>
                </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
