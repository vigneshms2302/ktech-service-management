import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Cpu,
  Monitor,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { formatPhoneDisplay } from '../../utils/phone.ts';

export const SpecializedWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'datarecovery' | 'refurb' | 'pcbuilder' | 'warranty'>('datarecovery');
  const [dataRecoveryJobs, setDataRecoveryJobs] = useState<Array<Record<string, unknown>>>([]);
  const [refurbProducts, setRefurbProducts] = useState<Array<Record<string, unknown>>>([]);
  const [pcBuilds, setPcBuilds] = useState<Array<Record<string, unknown>>>([]);
  const [warranties, setWarranties] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddRefurbModal, setShowAddRefurbModal] = useState(false);
  const [showSellRefurbModal, setShowSellRefurbModal] = useState(false);
  const [selectedProductForSale, setSelectedProductForSale] = useState<Record<string, unknown> | null>(null);
  const [showNewPcBuildModal, setShowNewPcBuildModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedWarrantyForClaim, setSelectedWarrantyForClaim] = useState<Record<string, unknown> | null>(null);

  // Refurb Form
  const [refurbType, setRefurbType] = useState('LAPTOP');
  const [customRefurbType, setCustomRefurbType] = useState('');
  const [refurbBrand, setRefurbBrand] = useState('');
  const [refurbModel, setRefurbModel] = useState('');
  const [refurbSerial, setRefurbSerial] = useState('');
  const [refurbSpecs, setRefurbSpecs] = useState('');
  const [refurbGrade, setRefurbGrade] = useState<'GRADE_A' | 'GRADE_B' | 'GRADE_C'>('GRADE_A');
  const [refurbAcqCost, setRefurbAcqCost] = useState<number>(12000);
  const [refurbSpent, setRefurbSpent] = useState<number>(2500);
  const [refurbSellPrice, setRefurbSellPrice] = useState<number>(22500);
  const [refurbWarranty, setRefurbWarranty] = useState<number>(3);

  // Sell Form
  const [buyerCustomerId, setBuyerCustomerId] = useState('');
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [sellMode, setSellMode] = useState<string>('UPI_QR');
  const [customSellMode, setCustomSellMode] = useState('');

  // PC Builder Form
  const [pcCustomerId, setPcCustomerId] = useState('');
  const [pcBuildName, setPcBuildName] = useState('');
  const [pcLabor, setPcLabor] = useState<number>(1500);
  const pcSlots = [
    { componentSlot: 'Processor', itemName: 'Intel Core i5-13400F (10 Cores, 4.6GHz)', quantity: 1, unitCost: 16500, unitPrice: 18200 },
    { componentSlot: 'Motherboard', itemName: 'Gigabyte B760M DS3H AX DDR4 Wi-Fi', quantity: 1, unitCost: 11200, unitPrice: 12800 },
    { componentSlot: 'RAM Memory', itemName: 'Corsair Vengeance LPX 16GB (8x2) DDR4 3200MHz', quantity: 1, unitCost: 3600, unitPrice: 4200 },
    { componentSlot: 'Graphics Card', itemName: 'ZOTAC Gaming GeForce RTX 4060 8GB Twin Edge', quantity: 1, unitCost: 26800, unitPrice: 29500 },
    { componentSlot: 'Storage SSD', itemName: 'Kingston NV2 1TB NVMe PCIe 4.0 SSD', quantity: 1, unitCost: 4900, unitPrice: 5600 },
    { componentSlot: 'Power Supply', itemName: 'Deepcool PK650D 650W 80+ Bronze SMPS', quantity: 1, unitCost: 3800, unitPrice: 4400 },
    { componentSlot: 'Cabinet', itemName: 'Ant Esports ICE-112 Mid-Tower RGB Cabinet', quantity: 1, unitCost: 2800, unitPrice: 3400 },
  ];

  // Warranty Claim Form
  const [claimIssue, setClaimIssue] = useState('');
  const [claimPriority, setClaimPriority] = useState<'NORMAL' | 'URGENT' | 'CRITICAL'>('URGENT');

  const fetchSpecializedData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.datarecovery?.list) {
        const drRes = await window.electronAPI.datarecovery.list();
        if (drRes.success && drRes.data) setDataRecoveryJobs(drRes.data);
      }

      if (window.electronAPI?.refurb?.list) {
        const refRes = await window.electronAPI.refurb.list();
        if (refRes.success && refRes.data) setRefurbProducts(refRes.data);
      }

      if (window.electronAPI?.pcbuilder?.list) {
        const pcbRes = await window.electronAPI.pcbuilder.list();
        if (pcbRes.success && pcbRes.data) setPcBuilds(pcbRes.data);
      }

      if (window.electronAPI?.warranty?.list) {
        const wRes = await window.electronAPI.warranty.list();
        if (wRes.success && wRes.data) setWarranties(wRes.data);
      }
    } catch (err) {
      console.error('Failed to load specialized modules:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecializedData();
  }, [fetchSpecializedData]);

  const handleCreateRefurb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refurbBrand.trim() || !refurbModel.trim()) return;

    try {
      if (!window.electronAPI?.refurb?.create) return;
      const finalProductType = (refurbType === 'OTHER' && customRefurbType.trim())
        ? customRefurbType.trim()
        : refurbType;

      const res = await window.electronAPI.refurb.create({
        productType: finalProductType,
        brand: refurbBrand.trim(),
        modelName: refurbModel.trim(),
        serialNumber: refurbSerial.trim() || undefined,
        specs: refurbSpecs.trim() || 'Standard refurbished configuration',
        cosmeticGrade: refurbGrade,
        acquisitionCost: refurbAcqCost,
        refurbCostSpent: refurbSpent,
        sellingPrice: refurbSellPrice,
        warrantyMonths: refurbWarranty,
      });

      if (res.success) {
        setShowAddRefurbModal(false);
        setRefurbBrand('');
        setRefurbModel('');
        setCustomRefurbType('');
        fetchSpecializedData();
      } else {
        alert(res.error || 'Failed to add refurbished product');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleSellRefurb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForSale) return;

    try {
      if (!window.electronAPI?.refurb?.sell) return;
      const finalSellMode = (sellMode === 'OTHER' && customSellMode.trim())
        ? customSellMode.trim()
        : sellMode;

      const res = await window.electronAPI.refurb.sell({
        productId: selectedProductForSale.id as string,
        customerId: buyerCustomerId || 'CUST-001',
        sellingPrice: sellPrice,
        paymentMode: finalSellMode as any,
        warrantyMonths: Number(selectedProductForSale.warranty_months || 3),
      });

      if (res.success && res.data) {
        alert(`Product sold successfully! Sale #: ${res.data.saleNumber}. Hardware Warranty created.`);
        setShowSellRefurbModal(false);
        setSelectedProductForSale(null);
        setCustomSellMode('');
        fetchSpecializedData();
      } else {
        alert(res.error || 'Failed to complete sale');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleCreatePcBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pcBuildName.trim()) return;

    try {
      if (!window.electronAPI?.pcbuilder?.create) return;
      const res = await window.electronAPI.pcbuilder.create({
        customerId: pcCustomerId || 'CUST-001',
        buildName: pcBuildName.trim(),
        assemblyLaborFee: pcLabor,
        slots: pcSlots,
      });

      if (res.success && res.data) {
        alert(`Custom PC build quote ${res.data.buildNumber} created! Total Quoted Price: ₹${res.data.finalQuotedPrice.toFixed(2)}`);
        setShowNewPcBuildModal(false);
        setPcBuildName('');
        fetchSpecializedData();
      } else {
        alert(res.error || 'Failed to create PC build quote');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleCreateWarrantyClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarrantyForClaim || !claimIssue.trim()) return;

    try {
      if (!window.electronAPI?.warranty?.createClaimJob) return;
      const res = await window.electronAPI.warranty.createClaimJob({
        warrantyId: selectedWarrantyForClaim.id as string,
        reportedIssue: claimIssue.trim(),
        priority: claimPriority,
      });

      if (res.success && res.data) {
        alert(`Warranty Claim Service Job ${res.data.claimJobNumber} created with Free Re-Repair authorization!`);
        setShowClaimModal(false);
        setSelectedWarrantyForClaim(null);
        setClaimIssue('');
        fetchSpecializedData();
      } else {
        alert(res.error || 'Failed to file warranty claim');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
      {/* Sub Tabs Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'datarecovery', label: 'Data Recovery Studio', icon: HardDrive, badge: `${dataRecoveryJobs.length}` },
            { id: 'refurb', label: 'Refurbished Products & Sales', icon: Monitor, badge: `${refurbProducts.length}` },
            { id: 'pcbuilder', label: 'Custom PC Rig Builder', icon: Cpu, badge: `${pcBuilds.length}` },
            { id: 'warranty', label: 'Warranty Management & Claims', icon: ShieldCheck, badge: `${warranties.length}` },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  backgroundColor: isActive ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                  borderRadius: '6px 6px 0 0',
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.12s ease',
                }}
              >
                <Icon size={15} color={isActive ? 'var(--brand-primary)' : 'var(--text-dim)'} />
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-surface)',
                    color: isActive ? 'var(--brand-primary)' : 'var(--text-dim)',
                    fontSize: '10px',
                    fontWeight: 700,
                    border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border-color)',
                  }}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {isLoading ? <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Updating...</div> : null}

        {/* Header Action Button */}
        {activeTab === 'refurb' && (
          <button
            onClick={() => setShowAddRefurbModal(true)}
            style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={14} /> Add Refurb Product
          </button>
        )}

        {activeTab === 'pcbuilder' && (
          <button
            onClick={() => setShowNewPcBuildModal(true)}
            style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: '#8b5cf6', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={14} /> Build Custom PC Quote
          </button>
        )}
      </div>

      {/* TAB 1: DATA RECOVERY STUDIO */}
      {activeTab === 'datarecovery' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px' }}>Job #</th>
                  <th style={{ padding: '8px 12px' }}>Customer</th>
                  <th style={{ padding: '8px 12px' }}>Storage Media & Capacity</th>
                  <th style={{ padding: '8px 12px' }}>Detection Status</th>
                  <th style={{ padding: '8px 12px' }}>Damage Classification</th>
                  <th style={{ padding: '8px 12px' }}>Complexity</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {dataRecoveryJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      No dedicated data recovery jobs active.
                    </td>
                  </tr>
                ) : (
                  dataRecoveryJobs.map((dr) => (
                    <tr key={dr.id as string} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        {dr.job_number as string}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{dr.customer_name as string}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{formatPhoneDisplay(dr.customer_phone as string)}</div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {(dr.storage_type as string).replace(/_/g, ' ')} ({dr.capacity_gb as number} GB)
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>FS: {(dr.file_system as string) || 'RAW / NTFS'}</div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', color: dr.detection_status === 'CLICKING_NOISE' ? '#f87171' : 'var(--text-muted)' }}>
                          {(dr.detection_status as string).replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#fb923c', fontWeight: 600, fontSize: '11px' }}>
                        {(dr.damage_type as string).replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' }}>
                          {(dr.recovery_complexity as string).replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: dr.recovery_outcome === 'FULL_RECOVERY' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            color: dr.recovery_outcome === 'FULL_RECOVERY' ? 'var(--color-success)' : '#facc15',
                          }}
                        >
                          {(dr.recovery_outcome as string).replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REFURBISHED PRODUCTS */}
      {activeTab === 'refurb' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
          {refurbProducts.map((prod) => {
            const margin = Number(prod.selling_price || 0) - (Number(prod.acquisition_cost || 0) + Number(prod.refurb_cost_spent || 0));
            return (
              <div key={prod.id as string} style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-primary)' }}>
                      {prod.product_code as string}
                    </span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, backgroundColor: prod.status === 'IN_STOCK' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.2)', color: prod.status === 'IN_STOCK' ? 'var(--color-success)' : 'var(--text-dim)' }}>
                      {prod.status as string}
                    </span>
                  </div>

                  <h3 style={{ margin: '6px 0 2px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {prod.brand as string} {prod.model_name as string}
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{prod.specs as string}</div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
                    <span>Acquisition + Refurb Cost:</span>
                    <span>₹{(Number(prod.acquisition_cost || 0) + Number(prod.refurb_cost_spent || 0)).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                    <span>Selling Price:</span>
                    <span style={{ color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>₹{Number(prod.selling_price || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-success)', fontWeight: 600 }}>
                    <span>Est. Margin:</span>
                    <span>+₹{margin.toFixed(2)}</span>
                  </div>
                </div>

                {prod.status === 'IN_STOCK' && (
                  <button
                    onClick={() => {
                      setSelectedProductForSale(prod);
                      setSellPrice(Number(prod.selling_price || 0));
                      setShowSellRefurbModal(true);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-success)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Sell to Customer
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: CUSTOM PC BUILDER */}
      {activeTab === 'pcbuilder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px' }}>Build #</th>
                  <th style={{ padding: '8px 12px' }}>Configuration Name</th>
                  <th style={{ padding: '8px 12px' }}>Customer</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Parts Cost ₹</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Assembly Fee ₹</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Final Quoted ₹</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pcBuilds.map((pb) => (
                  <tr key={pb.id as string} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#8b5cf6' }}>
                      {pb.build_number as string}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {pb.build_name as string}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                      {pb.customer_name as string}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      ₹{Number(pb.parts_cost || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      ₹{Number(pb.assembly_labor_fee || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-primary)' }}>
                      ₹{Number(pb.final_quoted_price || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                        {pb.status as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: WARRANTY MANAGEMENT & CLAIMS */}
      {activeTab === 'warranty' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px' }}>Warranty Code</th>
                  <th style={{ padding: '8px 12px' }}>Customer</th>
                  <th style={{ padding: '8px 12px' }}>Scope / Equipment</th>
                  <th style={{ padding: '8px 12px' }}>Start Date</th>
                  <th style={{ padding: '8px 12px' }}>Expiry Date</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {warranties.map((w) => (
                  <tr key={w.id as string} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-success)' }}>
                      {w.warranty_code as string}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{w.customer_name as string}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{formatPhoneDisplay(w.customer_phone as string)}</div>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-main)' }}>
                      {w.covered_scope as string}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '11px' }}>
                      {w.start_date as string}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '11px', fontWeight: 600 }}>
                      {w.expiry_date as string}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-success)' }}>
                        {w.status as string}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedWarrantyForClaim(w);
                          setShowClaimModal(true);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        File Claim Job
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD REFURB PRODUCT */}
      {showAddRefurbModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', maxWidth: '480px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
              Add Refurbished Laptop / Desktop
            </h3>

            <form onSubmit={handleCreateRefurb} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Equipment Type</label>
                  <select
                    value={refurbType}
                    onChange={(e) => setRefurbType(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  >
                    <option value="LAPTOP">Laptop</option>
                    <option value="DESKTOP_PC">Desktop PC</option>
                    <option value="ALL_IN_ONE_PC">All-in-One PC</option>
                    <option value="MONITOR">Monitor / Screen</option>
                    <option value="OTHER">Other (Type Custom...)</option>
                  </select>
                  {refurbType === 'OTHER' && (
                    <input
                      type="text"
                      required
                      placeholder="Specify custom equipment type (e.g. Server, Gaming Console, Mac Mini)"
                      value={customRefurbType}
                      onChange={(e) => setCustomRefurbType(e.target.value)}
                      style={{ width: '100%', marginTop: '6px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--brand-primary)', color: 'var(--text-main)', fontSize: '12px' }}
                      autoFocus
                    />
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Cosmetic Grade</label>
                  <select
                    value={refurbGrade}
                    onChange={(e) => setRefurbGrade(e.target.value as typeof refurbGrade)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  >
                    <option value="GRADE_A">Grade A (Like New / Mint)</option>
                    <option value="GRADE_B">Grade B (Minor Scratches / Good)</option>
                    <option value="GRADE_C">Grade C (Heavy Usage / Value)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lenovo / Dell"
                    value={refurbBrand}
                    onChange={(e) => setRefurbBrand(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ThinkPad L490"
                    value={refurbModel}
                    onChange={(e) => setRefurbModel(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Serial Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-88231"
                    value={refurbSerial}
                    onChange={(e) => setRefurbSerial(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Warranty (Months)</label>
                  <input
                    type="number"
                    value={refurbWarranty}
                    onChange={(e) => setRefurbWarranty(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Specifications Summary</label>
                <input
                  type="text"
                  placeholder="e.g. Intel Core i5-8th Gen, 16GB RAM, 512GB NVMe, 14 FHD IPS"
                  value={refurbSpecs}
                  onChange={(e) => setRefurbSpecs(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Acquisition ₹</label>
                  <input
                    type="number"
                    value={refurbAcqCost}
                    onChange={(e) => setRefurbAcqCost(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Refurb Spent ₹</label>
                  <input
                    type="number"
                    value={refurbSpent}
                    onChange={(e) => setRefurbSpent(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Selling Price ₹ *</label>
                  <input
                    type="number"
                    required
                    value={refurbSellPrice}
                    onChange={(e) => setRefurbSellPrice(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddRefurbModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SELL REFURB PRODUCT */}
      {showSellRefurbModal && selectedProductForSale && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', maxWidth: '440px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
              Sell {selectedProductForSale.brand as string} {selectedProductForSale.model_name as string}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Product Code: {selectedProductForSale.product_code as string}
            </div>

            <form onSubmit={handleSellRefurb} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Selling Price ₹ *</label>
                <input
                  type="number"
                  required
                  value={sellPrice}
                  onChange={(e) => setSellPrice(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '13px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Customer ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CUST-001"
                  value={buyerCustomerId}
                  onChange={(e) => setBuyerCustomerId(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Payment Mode</label>
                <select
                  value={sellMode}
                  onChange={(e) => setSellMode(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                >
                  <option value="UPI_QR">UPI QR</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card POS</option>
                  <option value="NET_BANKING">Net Banking</option>
                  <option value="OTHER">Other (Type Custom...)</option>
                </select>
                {sellMode === 'OTHER' && (
                  <input
                    type="text"
                    required
                    placeholder="Specify payment mode / details (e.g. Cheque, Split, Credit Note)"
                    value={customSellMode}
                    onChange={(e) => setCustomSellMode(e.target.value)}
                    style={{ width: '100%', marginTop: '6px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--brand-primary)', color: 'var(--text-main)', fontSize: '12px' }}
                    autoFocus
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSellRefurbModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', backgroundColor: 'var(--color-success)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Confirm Sale & Warranty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOM PC BUILD QUOTE */}
      {showNewPcBuildModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', maxWidth: '520px', width: '100%', padding: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 800, color: '#8b5cf6' }}>
              Create Custom PC Build Quote
            </h3>

            <form onSubmit={handleCreatePcBuild} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Configuration Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4K Video Editing & Gaming Rig"
                  value={pcBuildName}
                  onChange={(e) => setPcBuildName(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Customer ID</label>
                <input
                  type="text"
                  placeholder="CUST-001"
                  value={pcCustomerId}
                  onChange={(e) => setPcCustomerId(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Assembly & Testing Labor Fee ₹</label>
                <input
                  type="number"
                  value={pcLabor}
                  onChange={(e) => setPcLabor(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewPcBuildModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', backgroundColor: '#8b5cf6', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Generate Build Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FILE WARRANTY CLAIM */}
      {showClaimModal && selectedWarrantyForClaim && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', maxWidth: '440px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: '#ef4444' }}>
              File Warranty Claim: {selectedWarrantyForClaim.warranty_code as string}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Customer: {selectedWarrantyForClaim.customer_name as string} • Covered: {selectedWarrantyForClaim.covered_scope as string}
            </div>

            <form onSubmit={handleCreateWarrantyClaim} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Reported Issue Under Warranty *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Same display black screen issue returned after 10 days of repair..."
                  value={claimIssue}
                  onChange={(e) => setClaimIssue(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Priority</label>
                <select
                  value={claimPriority}
                  onChange={(e) => setClaimPriority(e.target.value as typeof claimPriority)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                >
                  <option value="URGENT">URGENT (Warranty Rework Priority)</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="NORMAL">NORMAL</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Authorize Claim & Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
