import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  RefreshCw,
  Download,
  Database,
  TrendingUp,
  IndianRupee,
  Clock,
  Building2,
  MapPin,
  Search,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import {
  PlatformAnalyticsData,
  downloadCsv,
  formatDateSafe,
  formatDateTimeSafe,
  formatInr,
} from './adminTypes.ts';

interface AnalyticsTabProps {
  analytics: PlatformAnalyticsData | null;
  isLoading: boolean;
  onRefresh: () => void;
  onInspectShop: (shopId: string) => void;
  onQuickExtendDays: (shop: { id: string; name: string }, days: number) => Promise<void>;
}

/**
 * Full live platform analytics dashboard directly sourced from SQLite/Turso.
 * Displays SaaS collections, workshop GMV, 7d/30d growth windows, job/device/city breakdowns,
 * expiring subscriptions watchlist, shop leaderboard, and live DB row counts.
 */
export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  analytics,
  isLoading,
  onRefresh,
  onInspectShop,
  onQuickExtendDays,
}) => {
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [extendingId, setExtendingId] = useState<string | null>(null);

  const filteredLeaderboard = useMemo(() => {
    if (!analytics) return [];
    const q = leaderboardSearch.trim().toLowerCase();
    if (!q) return analytics.shopLeaderboard;
    return analytics.shopLeaderboard.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.phone.includes(q)
    );
  }, [analytics, leaderboardSearch]);

  const handleExportLeaderboard = () => {
    if (!analytics) return;
    downloadCsv(
      `kconnect-platform-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Shop Name',
        'Slug',
        'Owner',
        'Phone',
        'City',
        'Status',
        'Subscription Status',
        'Days Remaining',
        'Active Users',
        'Max Seats',
        'Customers',
        'Devices',
        'Jobs',
        'Invoices',
        'Workshop GMV (INR)',
        'Workshop Collected (INR)',
        'SaaS Paid (INR)',
        'Last Activity',
      ],
      analytics.shopLeaderboard.map((s) => [
        s.name,
        s.slug,
        s.ownerName,
        s.phone,
        s.city,
        s.status,
        s.subscriptionStatus,
        s.daysRemaining,
        s.activeUsers,
        s.maxSeats,
        s.customersCount,
        s.devicesCount,
        s.jobsCount,
        s.invoicesCount,
        s.workshopGmvInr,
        s.collectedInr,
        s.saasPaidInr,
        formatDateSafe(s.lastActivityAt),
      ])
    );
  };

  const handleExtend = async (shop: { id: string; name: string }, days: number) => {
    setExtendingId(shop.id);
    try {
      await onQuickExtendDays(shop, days);
      onRefresh();
    } finally {
      setExtendingId(null);
    }
  };

  if (isLoading && !analytics) {
    return (
      <div
        style={{
          padding: '48px',
          borderRadius: '14px',
          backgroundColor: '#1e1e1e',
          border: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center',
          color: '#8e8ea0',
        }}
      >
        Aggregating live platform telemetry across all shops, customers, devices, jobs, and invoices...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div
        style={{
          padding: '40px',
          borderRadius: '14px',
          backgroundColor: '#1e1e1e',
          border: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center',
          color: '#9ca3af',
        }}
      >
        <p style={{ marginBottom: '12px' }}>Analytics payload is not loaded yet.</p>
        <button
          type="button"
          onClick={onRefresh}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            backgroundColor: '#10a37f',
            border: 'none',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Load Live Analytics
        </button>
      </div>
    );
  }

  const { overview, signupsByWindow, jobsByStatus, customersByType, devicesByCategory, shopsByCity, expiringSoon, databaseSnapshot } = analytics;
  const maxJobsStatus = Math.max(1, ...jobsByStatus.map((j) => j.count));
  const maxDevicesCategory = Math.max(1, ...devicesByCategory.map((d) => d.count));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Live Header Strip */}
      <div
        style={{
          backgroundColor: '#1e1e1e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <BarChart3 size={18} color="#10a37f" />
          <span style={{ fontWeight: 700, fontSize: '15px' }}>Live K-Connect Platform Analytics</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 9px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(16,163,127,0.14)',
              color: '#34d399',
              border: '1px solid rgba(16,163,127,0.3)',
            }}
          >
            {databaseSnapshot.databaseProvider === 'TURSO_LIBSQL_CLOUD' ? 'Turso Cloud Live' : 'Local SQLite Live'}
          </span>
          <span style={{ fontSize: '12px', color: '#8e8ea0' }}>
            Generated {formatDateTimeSafe(databaseSnapshot.generatedAt)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '10px',
              backgroundColor: '#262626',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ececec',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> {isLoading ? 'Syncing...' : 'Refresh Telemetry'}
          </button>
          <button
            type="button"
            onClick={handleExportLeaderboard}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '10px',
              backgroundColor: '#262626',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ececec',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Export Leaderboard CSV
          </button>
        </div>
      </div>

      {/* Row 1: Revenue, GMV, Growth & Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        <div style={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(16,163,127,0.28)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8e8ea0', fontSize: '12px', fontWeight: 600 }}>
            <span>K-Connect SaaS Collections</span>
            <IndianRupee size={15} color="#10a37f" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>
            {formatInr(overview.totalSaasRevenueInr)}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
            {overview.approvedPaymentClaims} approved claims • {overview.conversionRatePct}% paid conversion
          </div>
          <div style={{ fontSize: '11.5px', color: '#fbbf24', marginTop: '3px' }}>
            {overview.pendingPaymentClaims} pending claims ({formatInr(overview.pendingSaasClaimsInr)}) • Avg {formatInr(overview.avgRevenuePerPayingShopInr)}/shop
          </div>
        </div>

        <div style={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8e8ea0', fontSize: '12px', fontWeight: 600 }}>
            <span>Tenant Workshop Volume (GMV)</span>
            <Building2 size={15} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
            {formatInr(overview.totalShopGmvInr)}
          </div>
          <div style={{ fontSize: '12px', color: '#34d399', marginTop: '6px' }}>
            Collected across shops: {formatInr(overview.totalShopCollectedInr)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#8e8ea0', marginTop: '3px' }}>
            Across {overview.totalJobs} repair jobs &amp; {overview.totalDevices} devices
          </div>
        </div>

        <div style={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8e8ea0', fontSize: '12px', fontWeight: 600 }}>
            <span>Platform Growth (7d / 30d)</span>
            <TrendingUp size={15} color="#fbbf24" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#141414' }}>
              <div style={{ fontSize: '10.5px', color: '#8e8ea0' }}>Shops</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#34d399' }}>+{signupsByWindow.shopsLast7d}</div>
              <div style={{ fontSize: '10.5px', color: '#9ca3af' }}>30d: +{signupsByWindow.shopsLast30d}</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#141414' }}>
              <div style={{ fontSize: '10.5px', color: '#8e8ea0' }}>Customers</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#60a5fa' }}>+{signupsByWindow.customersLast7d}</div>
              <div style={{ fontSize: '10.5px', color: '#9ca3af' }}>30d: +{signupsByWindow.customersLast30d}</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#141414' }}>
              <div style={{ fontSize: '10.5px', color: '#8e8ea0' }}>Jobs</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24' }}>+{signupsByWindow.jobsLast7d}</div>
              <div style={{ fontSize: '10.5px', color: '#9ca3af' }}>30d: +{signupsByWindow.jobsLast30d}</div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8e8ea0', fontSize: '12px', fontWeight: 600 }}>
            <span>Ecosystem Totals</span>
            <Database size={15} color="#a78bfa" />
          </div>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Shops (Active / Trial / Paid):</span>
              <strong>{overview.activeShops} / {overview.trialingShops} / {overview.activeSubscriptions}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Frozen / Expired Shops:</span>
              <strong style={{ color: overview.frozenShops + overview.expiredShops > 0 ? '#f87171' : '#9ca3af' }}>
                {overview.frozenShops} / {overview.expiredShops}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Logins (Active / Total):</span>
              <strong>{overview.activeUsers} / {overview.totalUsers}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>End Customers / Open Jobs:</span>
              <strong>{overview.totalCustomers} / {overview.activeJobs}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Pipeline Breakdown Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {/* Repair Job Statuses */}
        <div style={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '18px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '13.5px', fontWeight: 700 }}>Repair Jobs Pipeline</h4>
          {jobsByStatus.length === 0 ? (
            <div style={{ fontSize: '12.5px', color: '#6b7280' }}>No repair jobs logged across shops yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {jobsByStatus.map((item) => (
                <div key={item.status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span style={{ color: '#d1d5db' }}>{item.status}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div style={{ height: '6px', borderRadius: '9999px', backgroundColor: '#121212', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(4, Math.round((item.count / maxJobsStatus) * 100))}%`,
                        backgroundColor: item.status === 'DELIVERED' ? '#10a37f' : '#3b82f6',
                        borderRadius: '9999px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device & Customer Mix */}
        <div style={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '18px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '13.5px', fontWeight: 700 }}>Hardware Categories &amp; Customer Mix</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {customersByType.length === 0 ? (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>No customer types recorded yet.</span>
            ) : (
              customersByType.map((ct) => (
                <span
                  key={ct.type}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#141414',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '11.5px',
                  }}
                >
                  {ct.type}: <strong>{ct.count}</strong>
                </span>
              ))
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {devicesByCategory.slice(0, 6).map((cat) => (
              <div key={cat.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ color: '#d1d5db' }}>{cat.category}</span>
                  <strong>{cat.count}</strong>
                </div>
                <div style={{ height: '6px', borderRadius: '9999px', backgroundColor: '#121212', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(4, Math.round((cat.count / maxDevicesCategory) * 100))}%`,
                      backgroundColor: '#a78bfa',
                      borderRadius: '9999px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Reach */}
        <div style={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '18px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} color="#10a37f" /> Coverage by City
          </h4>
          {shopsByCity.length === 0 ? (
            <div style={{ fontSize: '12.5px', color: '#6b7280' }}>No shops enrolled yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {shopsByCity.slice(0, 8).map((c) => (
                <div
                  key={c.city}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#141414',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{c.city}</span>
                  <span style={{ color: '#9ca3af' }}>
                    <strong>{c.shopsCount}</strong> shop(s) • {c.customersCount} cust • {c.jobsCount} jobs
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Expiring Soon Watchlist */}
      {expiringSoon.length > 0 && (
        <div
          style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: '14px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#fbbf24', fontWeight: 700, fontSize: '14px' }}>
            <AlertTriangle size={16} /> Expiring / Overdue Renewals Watchlist ({expiringSoon.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ color: '#8e8ea0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '11px' }}>
                  <th style={{ padding: '8px 10px' }}>Shop</th>
                  <th style={{ padding: '8px 10px' }}>Owner &amp; Phone</th>
                  <th style={{ padding: '8px 10px' }}>Plan Status</th>
                  <th style={{ padding: '8px 10px' }}>Ends At</th>
                  <th style={{ padding: '8px 10px' }}>Window</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {expiringSoon.map((item) => (
                  <tr key={item.shopId} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 700 }}>{item.name}</td>
                    <td style={{ padding: '9px 10px', color: '#d1d5db' }}>{item.ownerName} • {item.phone}</td>
                    <td style={{ padding: '9px 10px' }}>{item.subscriptionStatus}</td>
                    <td style={{ padding: '9px 10px', color: '#9ca3af' }}>{formatDateSafe(item.subscriptionEndsAt)}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: item.daysRemaining <= 0 ? '#f87171' : '#fbbf24' }}>
                      {item.daysRemaining <= 0 ? `${Math.abs(item.daysRemaining)}d overdue` : `${item.daysRemaining}d left`}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          disabled={extendingId === item.shopId}
                          onClick={() => handleExtend({ id: item.shopId, name: item.name }, 14)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '7px',
                            backgroundColor: 'rgba(16,163,127,0.16)',
                            border: '1px solid rgba(16,163,127,0.35)',
                            color: '#34d399',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                          +14d
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspectShop(item.shopId)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '7px',
                            backgroundColor: '#262626',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#ececec',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 4: Shop Health & Usage Leaderboard */}
      <div
        style={{
          backgroundColor: '#1e1e1e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
            Shop-by-Shop Usage &amp; Revenue Leaderboard ({filteredLeaderboard.length})
          </h4>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8e8ea0' }} />
            <input
              type="text"
              value={leaderboardSearch}
              onChange={(e) => setLeaderboardSearch(e.target.value)}
              placeholder="Filter leaderboard..."
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: '8px',
                backgroundColor: '#141414',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ececec',
                fontSize: '12.5px',
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ color: '#8e8ea0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px' }}>Shop</th>
                <th style={{ padding: '10px 12px' }}>Status &amp; Plan</th>
                <th style={{ padding: '10px 12px' }}>Seats</th>
                <th style={{ padding: '10px 12px' }}>Customers</th>
                <th style={{ padding: '10px 12px' }}>Devices / Jobs</th>
                <th style={{ padding: '10px 12px' }}>Workshop GMV</th>
                <th style={{ padding: '10px 12px' }}>K-Connect Paid</th>
                <th style={{ padding: '10px 12px' }}>Last Activity</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Dossier</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaderboard.map((s) => (
                <tr key={s.shopId} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: '#8e8ea0' }}>
                      {s.ownerName} • {s.city || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        backgroundColor:
                          s.status === 'ACTIVE'
                            ? 'rgba(16,163,127,0.16)'
                            : s.status === 'FROZEN'
                            ? 'rgba(239,68,68,0.16)'
                            : 'rgba(245,158,11,0.16)',
                        color: s.status === 'ACTIVE' ? '#34d399' : s.status === 'FROZEN' ? '#f87171' : '#fbbf24',
                      }}
                    >
                      {s.status} • {s.subscriptionStatus}
                    </span>
                    <div style={{ fontSize: '11px', color: '#8e8ea0', marginTop: '2px' }}>
                      {s.isComplimentary ? 'Complimentary' : `${s.daysRemaining}d remaining`}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{s.activeUsers}/{s.maxSeats}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.customersCount}</td>
                  <td style={{ padding: '10px 12px' }}>{s.devicesCount} / {s.jobsCount}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{formatInr(s.workshopGmvInr)}</td>
                  <td style={{ padding: '10px 12px', color: '#34d399', fontWeight: 700 }}>{formatInr(s.saasPaidInr)}</td>
                  <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{formatDateSafe(s.lastActivityAt)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => onInspectShop(s.shopId)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#262626',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#ececec',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ExternalLink size={11} /> Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 5: Live Database Table Counts Snapshot */}
      <div
        style={{
          backgroundColor: '#1e1e1e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '13.5px', fontWeight: 700 }}>
          <Database size={15} color="#10a37f" /> Live Database Table Row Snapshot
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          {Object.entries(databaseSnapshot.counts).map(([key, count]) => (
            <div
              key={key}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: '#141414',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ fontSize: '11px', color: '#8e8ea0', textTransform: 'uppercase' }}>{key}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

