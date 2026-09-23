import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  AlertTriangle,
  Wrench,
  Truck,
  Boxes,
} from 'lucide-react';
import {
  autoCorrectHardwareText,
  autoCorrectTitle,
  handleAutoCorrectKeyDown,
} from '../../utils/autoCorrect.ts';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  itemType: string;
  serialNumber?: string | null;
  costPrice: number;
  sellingPrice: number;
  hsnCode?: string | null;
  taxRate: number;
  quantityOnHand: number;
  minReorderLevel: number;
  locationName?: string | null;
  supplierName?: string | null;
  salvageCode?: string | null;
  isLowStock: boolean;
  createdAt: string;
}

export const InventoryWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'salvage' | 'suppliers' | 'history'>('items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; company_name: string; phone?: string; item_count: number }>>([]);
  const [salvageList, setSalvageList] = useState<Array<Record<string, unknown>>>([]);
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    totalUnits: 0,
    totalValuation: 0,
    lowStockCount: 0,
    salvagePartsCount: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemType, setSelectedItemType] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'PURCHASE_IN' | 'JOB_CONSUMPTION' | 'DIRECT_SALE' | 'DEFECTIVE_SCRAP' | 'INVENTORY_AUDIT_ADJUSTMENT'>('PURCHASE_IN');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Salvage Modals
  const [showSalvageIntakeModal, setShowSalvageIntakeModal] = useState(false);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [selectedSalvageDevice, setSelectedSalvageDevice] = useState<Record<string, unknown> | null>(null);

  // New Item Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [newItemType, setNewItemType] = useState('NEW_SPARE_PART');
  const [customItemType, setCustomItemType] = useState('');
  const [newItemSerial, setNewItemSerial] = useState('');
  const [newItemCost, setNewItemCost] = useState<number>(0);
  const [newItemPrice, setNewItemPrice] = useState<number>(0);
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemMinStock, setNewItemMinStock] = useState<number>(2);
  const [newItemLocation, setNewItemLocation] = useState('');
  const [newItemSupplier, setNewItemSupplier] = useState('');
  const [newItemHsn, setNewItemHsn] = useState('');

  // Salvage Intake Form State
  const [salvBrand, setSalvBrand] = useState('');
  const [salvModel, setSalvModel] = useState('');
  const [salvEqType, setSalvEqType] = useState('LAPTOP');
  const [customSalvEqType, setCustomSalvEqType] = useState('');
  const [salvSerial, setSalvSerial] = useState('');
  const [salvAcqType, setSalvAcqType] = useState('CUSTOMER_SCRAP_DONATION');
  const [customSalvAcqType, setCustomSalvAcqType] = useState('');
  const [salvCost, setSalvCost] = useState<number>(0);
  const [salvNotes, setSalvNotes] = useState('');

  // Salvage Harvest State
  const [harvestPartName, setHarvestPartName] = useState('');
  const [harvestCatId, setHarvestCatId] = useState('');
  const [harvestCondition, setHarvestCondition] = useState('GRADE_A_WORKING');
  const [customHarvestCondition, setCustomHarvestCondition] = useState('');
  const [harvestValue, setHarvestValue] = useState<number>(500);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.inventory?.list) {
        const res = await window.electronAPI.inventory.list({
          search: searchQuery.trim() || undefined,
          categoryId: selectedCategory || undefined,
          itemType: selectedItemType || undefined,
          lowStockOnly: lowStockOnly || undefined,
        });

        if (res.success && res.data) {
          setItems(res.data.items as InventoryItem[]);
          setMetrics(res.data.metrics);
        }
      }

      if (window.electronAPI?.inventory?.listCategories) {
        const cRes = await window.electronAPI.inventory.listCategories();
        if (cRes.success && cRes.data) setCategories(cRes.data);
      }

      if (window.electronAPI?.inventory?.listLocations) {
        const lRes = await window.electronAPI.inventory.listLocations();
        if (lRes.success && lRes.data) setLocations(lRes.data);
      }

      if (window.electronAPI?.inventory?.listSuppliers) {
        const sRes = await window.electronAPI.inventory.listSuppliers();
        if (sRes.success && sRes.data) setSuppliers(sRes.data);
      }

      if (window.electronAPI?.salvage?.list) {
        const salvRes = await window.electronAPI.salvage.list();
        if (salvRes.success && salvRes.data) setSalvageList(salvRes.data);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedItemType, lowStockOnly]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemCategory) {
      alert('Please fill in Item Name and Category');
      return;
    }

    const catId = newItemCategory === 'OTHER_CUSTOM' ? (categories[0]?.id || 'CAT_RAM') : newItemCategory;
    const finalName = newItemCategory === 'OTHER_CUSTOM' && customCategoryName.trim() 
      ? `[${customCategoryName.trim()}] ${newItemName.trim()}` 
      : newItemName.trim();
    const finalType = newItemType === 'OTHER' && customItemType.trim() 
      ? customItemType.trim() 
      : newItemType;

    try {
      if (!window.electronAPI?.inventory?.create) return;
      const res = await window.electronAPI.inventory.create({
        name: finalName,
        categoryId: catId,
        itemType: finalType,
        serialNumber: newItemSerial.trim() || undefined,
        costPrice: newItemCost,
        sellingPrice: newItemPrice,
        initialQuantity: newItemQty,
        minReorderLevel: newItemMinStock,
        locationId: newItemLocation || undefined,
        supplierId: newItemSupplier || undefined,
        hsnCode: newItemHsn.trim() || undefined,
      });

      if (res.success) {
        setShowAddModal(false);
        setNewItemName('');
        setCustomCategoryName('');
        setCustomItemType('');
        setNewItemCost(0);
        setNewItemPrice(0);
        setNewItemQty(1);
        fetchInventory();
      } else {
        alert(res.error || 'Failed to create item');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdjust || adjustDelta === 0) return;

    try {
      if (!window.electronAPI?.inventory?.adjustStock) return;
      const res = await window.electronAPI.inventory.adjustStock({
        itemId: selectedItemForAdjust.id,
        transactionType: adjustType,
        quantityDelta: adjustDelta,
        notes: adjustNotes.trim() || undefined,
      });

      if (res.success) {
        setShowAdjustModal(false);
        setSelectedItemForAdjust(null);
        setAdjustNotes('');
        fetchInventory();
      } else {
        alert(res.error || 'Failed to adjust stock');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleSalvageIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salvBrand.trim() || !salvModel.trim()) return;

    const finalEqType = salvEqType === 'OTHER' && customSalvEqType.trim() ? customSalvEqType.trim() : salvEqType;
    const finalAcqType = salvAcqType === 'OTHER' && customSalvAcqType.trim() ? customSalvAcqType.trim() : salvAcqType;

    try {
      if (!window.electronAPI?.salvage?.intake) return;
      const res = await window.electronAPI.salvage.intake({
        brand: salvBrand.trim(),
        modelName: salvModel.trim(),
        equipmentType: finalEqType,
        serialNumber: salvSerial.trim() || undefined,
        acquisitionType: finalAcqType,
        acquisitionCost: salvCost,
        notes: salvNotes.trim() || undefined,
      });

      if (res.success) {
        setShowSalvageIntakeModal(false);
        setSalvBrand('');
        setSalvModel('');
        setCustomSalvEqType('');
        setCustomSalvAcqType('');
        fetchInventory();
      } else {
        alert(res.error || 'Failed to intake salvage unit');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleHarvestComponents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalvageDevice || !harvestPartName.trim() || !harvestCatId) return;

    try {
      if (!window.electronAPI?.salvage?.harvestComponents) return;
      const finalCondition = (harvestCondition === 'OTHER' && customHarvestCondition.trim())
        ? customHarvestCondition.trim()
        : harvestCondition;

      const res = await window.electronAPI.salvage.harvestComponents({
        salvageDeviceId: selectedSalvageDevice.id as string,
        harvestedParts: [
          {
            partName: harvestPartName.trim(),
            categoryId: harvestCatId,
            testedCondition: finalCondition,
            estimatedValue: harvestValue,
            sellingPrice: harvestValue * 1.5,
          },
        ],
      });

      if (res.success) {
        setShowHarvestModal(false);
        setHarvestPartName('');
        setCustomHarvestCondition('');
        setSelectedSalvageDevice(null);
        alert('Harvested component successfully logged and added to active inventory!');
        fetchInventory();
      } else {
        alert(res.error || 'Failed to harvest component');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Active SKUs</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {metrics.totalItems} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>({metrics.totalUnits} units)</span>
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Stock Valuation (Cost)</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-success)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            ₹{metrics.totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div
          onClick={() => setLowStockOnly(!lowStockOnly)}
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: metrics.lowStockCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)',
            border: metrics.lowStockCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '11px', color: metrics.lowStockCount > 0 ? '#f87171' : 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} /> Low Stock Warnings
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: metrics.lowStockCount > 0 ? '#f87171' : 'var(--text-main)', marginTop: '4px' }}>
            {metrics.lowStockCount} <span style={{ fontSize: '11px', fontWeight: 500 }}>{lowStockOnly ? '(Filtered)' : '(Click to filter)'}</span>
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Salvaged Harvests</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#fb923c', marginTop: '4px' }}>
            {metrics.salvagePartsCount} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>harvested components</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'items', label: 'Stock Master', icon: Boxes },
            { id: 'salvage', label: 'Salvage & Dismantling Pipeline', icon: Wrench, badge: `${salvageList.length}` },
            { id: 'suppliers', label: 'Suppliers Directory', icon: Truck, badge: `${suppliers.length}` },
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'items' && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '6px 14px',
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
              <Plus size={14} /> Add Stock Item
            </button>
          )}

          {activeTab === 'salvage' && (
            <button
              onClick={() => setShowSalvageIntakeModal(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: '#fb923c',
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
              <Plus size={14} /> Intake Salvage Device
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: STOCK MASTER */}
      {activeTab === 'items' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Filter Toolbar */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search SKU, component name, serial number..."
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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                fontSize: '12px',
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>

            <select
              value={selectedItemType}
              onChange={(e) => setSelectedItemType(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                fontSize: '12px',
              }}
            >
              <option value="">All Item Types</option>
              <option value="NEW_SPARE_PART">New Spare Part</option>
              <option value="USED_PART">Used Part</option>
              <option value="SALVAGED_PART">Salvaged Component</option>
              <option value="FINISHED_PRODUCT">Finished Product</option>
              <option value="CONSUMABLE">Consumable / Thermal Paste</option>
            </select>
          </div>

          {/* Inventory Table */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px' }}>SKU</th>
                  <th style={{ padding: '8px 12px' }}>Item Name & Category</th>
                  <th style={{ padding: '8px 12px' }}>Type</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost ₹</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Sell Price ₹</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty On Hand</th>
                  <th style={{ padding: '8px 12px' }}>Location</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      Loading inventory master...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      No inventory items found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        {item.sku}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                          {item.categoryName} {item.salvageCode && `• Origin: ${item.salvageCode}`}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: item.itemType === 'SALVAGED_PART' ? 'rgba(249, 115, 22, 0.15)' : 'var(--bg-surface)',
                            color: item.itemType === 'SALVAGED_PART' ? '#fb923c' : 'var(--text-muted)',
                            fontWeight: 600,
                          }}
                        >
                          {item.itemType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        ₹{item.costPrice.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                        ₹{item.sellingPrice.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: item.isLowStock ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                            color: item.isLowStock ? '#f87171' : 'var(--color-success)',
                          }}
                        >
                          {item.quantityOnHand} {item.isLowStock ? '⚠️ Low' : ''}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '11px' }}>
                        {item.locationName || '--'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedItemForAdjust(item);
                            setAdjustDelta(1);
                            setShowAdjustModal(true);
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-main)',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SALVAGE & DISMANTLING PIPELINE */}
      {activeTab === 'salvage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px' }}>Salvage Code</th>
                  <th style={{ padding: '8px 12px' }}>Device Details</th>
                  <th style={{ padding: '8px 12px' }}>Acquisition Type</th>
                  <th style={{ padding: '8px 12px' }}>Parts Harvested</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Est. Recovered Value</th>
                  <th style={{ padding: '8px 12px' }}>Dismantled By</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {salvageList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      No salvage devices in pipeline.
                    </td>
                  </tr>
                ) : (
                  salvageList.map((dev) => (
                    <tr key={dev.id as string} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fb923c' }}>
                        {dev.salvage_code as string}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          [{dev.equipment_type as string}] {dev.brand as string} {dev.model_name as string}
                        </div>
                        {dev.original_job_number ? (
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Donor Job: {String(dev.original_job_number)}</div>
                        ) : null}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        {(dev.acquisition_type as string).replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--brand-primary)' }}>
                        {dev.harvested_parts_count as number} parts harvested
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-success)', fontWeight: 700 }}>
                        ₹{Number(dev.total_harvested_value || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '11px' }}>
                        {dev.dismantled_by_name as string || 'Technician'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedSalvageDevice(dev);
                            setShowHarvestModal(true);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            backgroundColor: '#fb923c',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Harvest Parts
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {suppliers.map((supp) => (
            <div key={supp.id} style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{supp.company_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Phone: {supp.phone || 'N/A'} • {supp.item_count} catalog items
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD STOCK ITEM */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', maxWidth: '550px', width: '100%', padding: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
              Add New Inventory Spare Part / Item
            </h3>

            <form onSubmit={handleCreateItem} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Item Name / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 15.6 FHD IPS 30-Pin Display Panel / BQ24780S IC"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => handleAutoCorrectKeyDown(e, newItemName, (v) => setNewItemName(autoCorrectHardwareText(v)))}
                  onBlur={() => setNewItemName(autoCorrectHardwareText(newItemName))}
                  spellCheck={true}
                  autoCorrect="on"
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Category *</label>
                  <select
                    required
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                    <option value="OTHER_CUSTOM">+ Other / Custom Category...</option>
                  </select>
                  {newItemCategory === 'OTHER_CUSTOM' && (
                    <input
                      type="text"
                      placeholder="e.g. Graphic Cards, Thermal Pads"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      onKeyDown={(e) => handleAutoCorrectKeyDown(e, customCategoryName, (v) => setCustomCategoryName(autoCorrectTitle(v)))}
                      onBlur={() => setCustomCategoryName(autoCorrectTitle(customCategoryName))}
                      spellCheck={true}
                      autoCorrect="on"
                      style={{ width: '100%', marginTop: '4px', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '11px' }}
                      autoFocus
                    />
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Item Type</label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  >
                    <option value="NEW_SPARE_PART">New Spare Part</option>
                    <option value="USED_PART">Used Part</option>
                    <option value="SALVAGED_PART">Salvaged Part</option>
                    <option value="FINISHED_PRODUCT">Finished Product</option>
                    <option value="CONSUMABLE">Consumable</option>
                    <option value="OTHER">Other (Type Custom Type...)</option>
                  </select>
                  {newItemType === 'OTHER' && (
                    <input
                      type="text"
                      placeholder="e.g. Diagnostic Dongle, Tester"
                      value={customItemType}
                      onChange={(e) => setCustomItemType(e.target.value)}
                      onKeyDown={(e) => handleAutoCorrectKeyDown(e, customItemType, (v) => setCustomItemType(autoCorrectTitle(v)))}
                      onBlur={() => setCustomItemType(autoCorrectTitle(customItemType))}
                      spellCheck={true}
                      autoCorrect="on"
                      style={{ width: '100%', marginTop: '4px', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '11px' }}
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Cost Price ₹</label>
                  <input
                    type="number"
                    value={newItemCost || ''}
                    onChange={(e) => setNewItemCost(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Selling Price ₹ *</label>
                  <input
                    type="number"
                    required
                    value={newItemPrice || ''}
                    onChange={(e) => setNewItemPrice(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Initial Quantity</label>
                  <input
                    type="number"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Min Reorder Level</label>
                  <input
                    type="number"
                    value={newItemMinStock}
                    onChange={(e) => setNewItemMinStock(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Serial Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-8921389"
                    value={newItemSerial}
                    onChange={(e) => setNewItemSerial(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>HSN Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 847330"
                    value={newItemHsn}
                    onChange={(e) => setNewItemHsn(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Warehouse Location</label>
                  <select
                    value={newItemLocation}
                    onChange={(e) => setNewItemLocation(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  >
                    <option value="">Select Location (Optional)</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Supplier</label>
                  <select
                    value={newItemSupplier}
                    onChange={(e) => setNewItemSupplier(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  >
                    <option value="">Select Supplier (Optional)</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK ADJUST STOCK */}
      {showAdjustModal && selectedItemForAdjust && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', maxWidth: '420px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
              Adjust Stock: {selectedItemForAdjust.sku}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {selectedItemForAdjust.name} (Current: {selectedItemForAdjust.quantityOnHand})
            </div>

            <form onSubmit={handleAdjustStock} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => {
                    const t = e.target.value as typeof adjustType;
                    setAdjustType(t);
                    if (t === 'JOB_CONSUMPTION' || t === 'DIRECT_SALE' || t === 'DEFECTIVE_SCRAP') {
                      setAdjustDelta(-1);
                    } else {
                      setAdjustDelta(1);
                    }
                  }}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                >
                  <option value="PURCHASE_IN">Purchase In (+ Stock)</option>
                  <option value="JOB_CONSUMPTION">Job Consumption (- Stock)</option>
                  <option value="DIRECT_SALE">Direct Sale (- Stock)</option>
                  <option value="DEFECTIVE_SCRAP">Defective / Damaged Scrap (- Stock)</option>
                  <option value="INVENTORY_AUDIT_ADJUSTMENT">Inventory Audit Adjustment (+/-)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Quantity Delta (+/-)</label>
                <input
                  type="number"
                  required
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Received new shipment / physical count discrepancy"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', backgroundColor: 'var(--brand-primary)', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SALVAGE INTAKE */}
      {showSalvageIntakeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', maxWidth: '480px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 800, color: '#fb923c' }}>
              Intake Scrap / Salvage Device
            </h3>

            <form onSubmit={handleSalvageIntake} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell / HP / Sony"
                    value={salvBrand}
                    onChange={(e) => setSalvBrand(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inspiron 15 3520"
                    value={salvModel}
                    onChange={(e) => setSalvModel(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Equipment Type</label>
                  <select
                    value={salvEqType}
                    onChange={(e) => setSalvEqType(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  >
                    <option value="LAPTOP">Laptop</option>
                    <option value="DESKTOP_PC">Desktop PC</option>
                    <option value="ALL_IN_ONE_PC">All-in-One PC</option>
                    <option value="GAMING_CONSOLE">Gaming Console</option>
                    <option value="MOTHERBOARD_INDIVIDUAL">Motherboard Individual</option>
                    <option value="SMPS_POWER_SUPPLY">SMPS Power Supply</option>
                    <option value="OTHER">Other (Type Custom Equipment...)</option>
                  </select>
                  {salvEqType === 'OTHER' && (
                    <input
                      type="text"
                      placeholder="e.g. Printer, Server Blade, Mining Rig"
                      value={customSalvEqType}
                      onChange={(e) => setCustomSalvEqType(e.target.value)}
                      style={{ width: '100%', marginTop: '4px', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '11px' }}
                      autoFocus
                    />
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Serial Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-91823"
                    value={salvSerial}
                    onChange={(e) => setSalvSerial(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Acquisition Type</label>
                <select
                  value={salvAcqType}
                  onChange={(e) => setSalvAcqType(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                >
                  <option value="CUSTOMER_SCRAP_DONATION">Customer Scrap Donation</option>
                  <option value="PURCHASED_FOR_PARTS">Purchased for Parts (Scrap Buy)</option>
                  <option value="UNREPAIRABLE_RETENTION">Unrepairable Job Retention</option>
                  <option value="OTHER">Other (Type Custom Source...)</option>
                </select>
                {salvAcqType === 'OTHER' && (
                  <input
                    type="text"
                    placeholder="e.g. E-Waste Lot Purchase, Corporate Auction"
                    value={customSalvAcqType}
                    onChange={(e) => setCustomSalvAcqType(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '11px' }}
                    autoFocus
                  />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Acquisition Cost ₹</label>
                  <input
                    type="number"
                    value={salvCost || ''}
                    onChange={(e) => setSalvCost(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Notes / Condition</label>
                  <input
                    type="text"
                    placeholder="e.g. Liquid damage, body broken, screen good"
                    value={salvNotes}
                    onChange={(e) => setSalvNotes(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSalvageIntakeModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', backgroundColor: '#fb923c', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Intake Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HARVEST COMPONENTS */}
      {showHarvestModal && selectedSalvageDevice && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', maxWidth: '480px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 800, color: '#fb923c' }}>
              Harvest Component from {selectedSalvageDevice.salvage_code as string}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {selectedSalvageDevice.brand as string} {selectedSalvageDevice.model_name as string}
            </div>

            <form onSubmit={handleHarvestComponents} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Component Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 8GB DDR4 2666MHz RAM / 15.6 FHD LCD / Original Dell Charger"
                  value={harvestPartName}
                  onChange={(e) => setHarvestPartName(e.target.value)}
                  onKeyDown={(e) => handleAutoCorrectKeyDown(e, harvestPartName, (v) => setHarvestPartName(autoCorrectHardwareText(v)))}
                  onBlur={() => setHarvestPartName(autoCorrectHardwareText(harvestPartName))}
                  spellCheck={true}
                  autoCorrect="on"
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Category *</label>
                  <select
                    required
                    value={harvestCatId}
                    onChange={(e) => setHarvestCatId(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Tested Condition</label>
                  <select
                    value={harvestCondition}
                    onChange={(e) => setHarvestCondition(e.target.value)}
                    style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                  >
                    <option value="GRADE_A_WORKING">Grade A (100% Tested Working)</option>
                    <option value="GRADE_B_MINOR_WEAR">Grade B (Working, Minor Wear)</option>
                    <option value="UNTESTED_AS_IS">Untested / As-Is</option>
                    <option value="OTHER">Other (Type Custom...)</option>
                  </select>
                  {harvestCondition === 'OTHER' && (
                    <input
                      type="text"
                      required
                      placeholder="Specify condition..."
                      value={customHarvestCondition}
                      onChange={(e) => setCustomHarvestCondition(e.target.value)}
                      onKeyDown={(e) => handleAutoCorrectKeyDown(e, customHarvestCondition, setCustomHarvestCondition)}
                      style={{ width: '100%', marginTop: '6px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--brand-primary)', color: 'var(--text-main)', fontSize: '12px' }}
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Estimated Fair Value ₹ *</label>
                <input
                  type="number"
                  required
                  value={harvestValue}
                  onChange={(e) => setHarvestValue(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowHarvestModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', backgroundColor: '#fb923c', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Harvest & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
