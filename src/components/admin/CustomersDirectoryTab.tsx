import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Phone,
  Mail,
  MapPin,
  Laptop,
  Wrench,
  FileText,
  Building2,
  MessageCircle,
  Lock,
} from 'lucide-react';
import { saasApi } from '../../api/client.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { AdminDialog } from './AdminDialog.tsx';
import {
  ShopItem,
  GlobalCustomerItem,
  CustomerDossier,
  buildWhatsAppUrl,
  downloadCsv,
  formatDateSafe,
  formatInr,
} from './adminTypes.ts';

interface CustomerDossierModalProps {
  customerId: string | null;
  onClose: () => void;
  onInspectShop?: (shopId: string) => void;
}

/**
 * Shared 360-degree Customer Dossier modal usable from both the global
 * Customers tab and the per-shop Inspector modal.
 */
export const CustomerDossierModal: React.FC<CustomerDossierModalProps> = ({
  customerId,
  onClose,
  onInspectShop,
}) => {
  const { showError } = useToast();
  const [dossier, setDossier] = useState<CustomerDossier | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!customerId) {
      setDossier(null);
      return;
    }
    let active = true;
    setIsLoading(true);
    saasApi.admin
      .getCustomerDetail(customerId)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setDossier(res.data);
        } else {
          showError(res.error || 'Could not load customer details.');
        }
      })
      .catch((err: unknown) => {
        if (active) showError((err as Error).message || 'Failed to load customer dossier.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [customerId, showError]);

  return (
    <AdminDialog
      open={Boolean(customerId)}
      onClose={onClose}
      maxWidth={920}
      title={
        <>
          <span>{dossier?.customer.fullName || 'Loading Customer Dossier...'}</span>
          {dossier && (
            <>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(16,163,127,0.16)',
                  color: '#34d399',
                }}
              >
                {dossier.customer.customerCode}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#d1d5db',
                }}
              >
                {dossier.customer.customerType}
              </span>
            </>
          )}
        </>
      }
      subtitle={
        dossier ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12.5px', color: '#9ca3af' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Phone size={13} /> {dossier.customer.primaryPhone}
              {dossier.customer.secondaryPhone ? ` / ${dossier.customer.secondaryPhone}` : ''}
            </span>
            {dossier.customer.email && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Mail size={13} /> {dossier.customer.email}
              </span>
            )}
            {dossier.customer.gstin && <span>GSTIN: {dossier.customer.gstin}</span>}
            <button
              type="button"
              onClick={() => {
                onClose();
                onInspectShop?.(dossier.customer.shopId);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#34d399',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600,
              }}
            >
              <Building2 size={13} /> {dossier.customer.shopName}
            </button>
          </div>
        ) : undefined
      }
      headerExtra={
        dossier ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href={buildWhatsAppUrl(
                dossier.customer.primaryPhone,
                `Hello ${dossier.customer.fullName}, reaching out regarding your service record with ${dossier.customer.shopName} on K-Connect.`
              )}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 211, 102, 0.14)',
                border: '1px solid rgba(37, 211, 102, 0.35)',
                color: '#4ade80',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <MessageCircle size={13} /> WhatsApp
            </a>
          </div>
        ) : undefined
      }
    >

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8e8ea0' }}>
            Loading customer addresses, devices, repair jobs &amp; invoices...
          </div>
        ) : dossier ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Financials */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '11.5px', color: '#8e8ea0' }}>Total Billed</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{formatInr(dossier.financialSummary.totalInvoicedInr)}</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '11.5px', color: '#8e8ea0' }}>Total Paid</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>{formatInr(dossier.financialSummary.totalPaidInr)}</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '11.5px', color: '#8e8ea0' }}>Balance Due</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: dossier.financialSummary.balanceDueInr > 0 ? '#fbbf24' : '#9ca3af', marginTop: '4px' }}>
                  {formatInr(dossier.financialSummary.balanceDueInr)}
                </div>
              </div>
              <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '11.5px', color: '#8e8ea0' }}>Devices / Repair Jobs</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
                  {dossier.devices.length} / {dossier.jobs.length}
                </div>
              </div>
            </div>

            {dossier.customer.notes && (
              <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.08)', fontSize: '12.5px', color: '#d1d5db' }}>
                <strong style={{ color: '#9ca3af' }}>Customer Notes:</strong> {dossier.customer.notes}
              </div>
            )}

            {/* Addresses */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#d1d5db', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#10a37f" /> Saved Addresses ({dossier.addresses.length})
              </h4>
              {dossier.addresses.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: '#6b7280' }}>No saved addresses on record.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                  {dossier.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: '#141414',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {addr.addressLine1}
                        {addr.isDefault && (
                          <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(16,163,127,0.18)', color: '#34d399' }}>
                            DEFAULT
                          </span>
                        )}
                      </div>
                      {addr.addressLine2 && <div style={{ color: '#9ca3af' }}>{addr.addressLine2}</div>}
                      {addr.landmark && <div style={{ color: '#9ca3af' }}>Landmark: {addr.landmark}</div>}
                      <div style={{ color: '#8e8ea0', marginTop: '2px' }}>
                        {addr.city}, {addr.state} {addr.pincode ? `- ${addr.pincode}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Devices */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#d1d5db', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Laptop size={14} color="#10a37f" /> Registered Devices ({dossier.devices.length})
              </h4>
              {dossier.devices.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: '#6b7280' }}>No devices registered for this customer.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                  {dossier.devices.map((dev) => (
                    <div
                      key={dev.id}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: '#141414',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#fff' }}>
                        {dev.brand} {dev.modelName}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#8e8ea0', marginTop: '2px' }}>
                        {dev.equipmentType} • {dev.jobsCount} job(s)
                        {dev.serialNumber ? ` • S/N: ${dev.serialNumber}` : ''}
                      </div>
                      {dev.specsSummary && <div style={{ fontSize: '11.5px', color: '#9ca3af', marginTop: '4px' }}>{dev.specsSummary}</div>}
                      {dev.hasPasscode && (
                        <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={11} /> Device passcode stored in shop vault
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Repair Jobs */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#d1d5db', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={14} color="#10a37f" /> Service &amp; Repair History ({dossier.jobs.length})
              </h4>
              {dossier.jobs.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: '#6b7280' }}>No repair jobs recorded yet.</div>
              ) : (
                <div style={{ borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#141414', color: '#8e8ea0', fontSize: '11px' }}>
                        <th style={{ padding: '8px 12px' }}>Job #</th>
                        <th style={{ padding: '8px 12px' }}>Device</th>
                        <th style={{ padding: '8px 12px' }}>Issue</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                        <th style={{ padding: '8px 12px' }}>Estimate</th>
                        <th style={{ padding: '8px 12px' }}>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossier.jobs.map((job) => (
                        <tr key={job.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700 }}>{job.jobNumber}</td>
                          <td style={{ padding: '8px 12px' }}>{job.deviceLabel}</td>
                          <td style={{ padding: '8px 12px', maxWidth: '240px', color: '#d1d5db' }}>{job.reportedIssue}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ padding: '2px 7px', borderRadius: '6px', backgroundColor: 'rgba(16,163,127,0.14)', color: '#34d399', fontSize: '11px', fontWeight: 600 }}>
                              {job.currentStatus}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px' }}>{formatInr(job.estimatedCost)}</td>
                          <td style={{ padding: '8px 12px', color: '#8e8ea0' }}>{formatDateSafe(job.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Invoices */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#d1d5db', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} color="#10a37f" /> Invoices ({dossier.invoices.length})
              </h4>
              {dossier.invoices.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: '#6b7280' }}>No invoices generated yet.</div>
              ) : (
                <div style={{ borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#141414', color: '#8e8ea0', fontSize: '11px' }}>
                        <th style={{ padding: '8px 12px' }}>Invoice #</th>
                        <th style={{ padding: '8px 12px' }}>Type</th>
                        <th style={{ padding: '8px 12px' }}>Total</th>
                        <th style={{ padding: '8px 12px' }}>Paid</th>
                        <th style={{ padding: '8px 12px' }}>Balance</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                        <th style={{ padding: '8px 12px' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossier.invoices.map((inv) => (
                        <tr key={inv.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700 }}>{inv.invoiceNumber}</td>
                          <td style={{ padding: '8px 12px', color: '#9ca3af' }}>{inv.invoiceType}</td>
                          <td style={{ padding: '8px 12px' }}>{formatInr(inv.totalAmount)}</td>
                          <td style={{ padding: '8px 12px', color: '#34d399' }}>{formatInr(inv.amountPaid)}</td>
                          <td style={{ padding: '8px 12px', color: inv.balanceDue > 0 ? '#fbbf24' : '#9ca3af' }}>{formatInr(inv.balanceDue)}</td>
                          <td style={{ padding: '8px 12px' }}>{inv.paymentStatus}</td>
                          <td style={{ padding: '8px 12px', color: '#8e8ea0' }}>{formatDateSafe(inv.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
    </AdminDialog>
  );
};

interface CustomersDirectoryTabProps {
  shops: ShopItem[];
  onInspectShop: (shopId: string) => void;
  onSelectCustomer: (customerId: string) => void;
}

/**
 * Global cross-tenant Customer CRM directory spanning every shop on K-Connect.
 */
export const CustomersDirectoryTab: React.FC<CustomersDirectoryTabProps> = ({
  shops,
  onInspectShop,
  onSelectCustomer,
}) => {
  const { showError } = useToast();
  const [customers, setCustomers] = useState<GlobalCustomerItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [shopFilter, setShopFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await saasApi.admin.listCustomers({
        search: search.trim() || undefined,
        shopId: shopFilter !== 'ALL' ? shopFilter : undefined,
        customerType: typeFilter !== 'ALL' ? typeFilter : undefined,
        limit: 250,
      });
      if (res.success && Array.isArray(res.data)) {
        setCustomers(res.data);
        setTotalCount(Number(res.totalCount ?? res.data.length));
      } else {
        showError(res.error || 'Failed to load customers.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Could not load global customers directory.');
    } finally {
      setIsLoading(false);
    }
  }, [search, shopFilter, typeFilter, showError]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCustomers();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  const handleExportCsv = () => {
    downloadCsv(
      `kconnect-customers-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Shop', 'Customer Code', 'Full Name', 'Primary Phone', 'Email', 'Type', 'City', 'Devices', 'Jobs', 'Billed (INR)', 'Paid (INR)', 'Last Activity'],
      customers.map((c) => [
        c.shopName,
        c.customerCode,
        c.fullName,
        c.primaryPhone,
        c.email || '',
        c.customerType,
        c.city || '',
        c.devicesCount,
        c.jobsCount,
        c.totalInvoicedInr,
        c.totalPaidInr,
        formatDateSafe(c.lastVisitAt || c.createdAt),
      ])
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          backgroundColor: '#1e1e1e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '250px', flex: '1 1 250px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8e8ea0' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer name, phone, code, email, city or shop..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                backgroundColor: '#141414',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ececec',
                fontSize: '13px',
              }}
            />
          </div>

          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              backgroundColor: '#141414',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ececec',
              fontSize: '13px',
              maxWidth: '210px',
            }}
          >
            <option value="ALL">All Shops ({shops.length})</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              backgroundColor: '#141414',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ececec',
              fontSize: '13px',
            }}
          >
            <option value="ALL">All Customer Types</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="CORPORATE">Corporate / B2B</option>
            <option value="DEALER">Dealer</option>
            <option value="INSTITUTIONAL">Institutional</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#8e8ea0', marginRight: '4px' }}>
            Showing {customers.length} of {totalCount}
          </span>
          <button
            type="button"
            onClick={loadCustomers}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '10px',
              backgroundColor: '#262626',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ececec',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '10px',
              backgroundColor: '#262626',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ececec',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#1e1e1e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#8e8ea0', fontSize: '11.5px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>Customer &amp; Code</th>
              <th style={{ padding: '12px 16px' }}>Contact &amp; Location</th>
              <th style={{ padding: '12px 16px' }}>Tenant Shop</th>
              <th style={{ padding: '12px 16px' }}>Type</th>
              <th style={{ padding: '12px 16px' }}>Devices / Jobs</th>
              <th style={{ padding: '12px 16px' }}>Spend &amp; Paid</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Dossier</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#8e8ea0' }}>
                  Loading customers across all shops...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#8e8ea0' }}>
                  No customers found matching your filters.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelectCustomer(c.id)}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>{c.fullName}</div>
                    <div style={{ fontSize: '11.5px', color: '#8e8ea0' }}>{c.customerCode}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#ececec' }}>{c.primaryPhone}</div>
                    {c.email && <div style={{ fontSize: '11.5px', color: '#9ca3af' }}>{c.email}</div>}
                    {c.city && <div style={{ fontSize: '11px', color: '#8e8ea0' }}>{c.city}{c.state ? `, ${c.state}` : ''}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onInspectShop(c.shopId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#34d399',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Building2 size={13} /> {c.shopName}
                    </button>
                    <div style={{ fontSize: '11px', color: '#8e8ea0' }}>/shop/{c.shopSlug}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: c.customerType === 'CORPORATE' ? 'rgba(59,130,246,0.16)' : 'rgba(255,255,255,0.08)',
                        color: c.customerType === 'CORPORATE' ? '#93c5fd' : '#d1d5db',
                      }}
                    >
                      {c.customerType}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{c.devicesCount} devices</div>
                    <div style={{ fontSize: '11.5px', color: '#8e8ea0' }}>{c.jobsCount} repair job(s)</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700 }}>{formatInr(c.totalInvoicedInr)}</div>
                    <div style={{ fontSize: '11.5px', color: '#34d399' }}>Paid: {formatInr(c.totalPaidInr)}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCustomer(c.id);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(16,163,127,0.14)',
                        border: '1px solid rgba(16,163,127,0.3)',
                        color: '#34d399',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Users size={13} /> Inspect 360°
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

