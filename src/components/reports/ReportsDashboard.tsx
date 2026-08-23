import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Wrench,
  Layers,
} from 'lucide-react';

export const ReportsDashboard: React.FC = () => {
  const [data, setData] = useState<{
    jobs: { total: number; active: number; intakePending: number; inRepair: number; readyForDelivery: number; delivered: number; unrepairable: number };
    finances: { totalInvoices: number; totalBilled: number; totalCollected: number; totalOutstanding: number; totalGstCollected: number };
    inventory: { totalSkus: number; totalUnitsInStock: number; stockValuation: number; lowStockAlerts: number; salvageDevicesCount: number; salvageAcquisitionsCost: number };
    crm: { totalCustomers: number; activeWarranties: number; warrantyClaimsHandled: number };
  } | null>(null);

  const [techPerformance, setTechPerformance] = useState<Array<Record<string, unknown>>>([]);
  const [failureBreakdown, setFailureBreakdown] = useState<Array<{ equipment_type: string; job_count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.reports?.getOverview) {
        const res = await window.electronAPI.reports.getOverview();
        if (res.success && res.data) setData(res.data);
      }

      if (window.electronAPI?.reports?.getTechnicianPerformance) {
        const tRes = await window.electronAPI.reports.getTechnicianPerformance();
        if (tRes.success && tRes.data) setTechPerformance(tRes.data);
      }

      if (window.electronAPI?.reports?.getEquipmentFailureBreakdown) {
        const fRes = await window.electronAPI.reports.getEquipmentFailureBreakdown();
        if (fRes.success && fRes.data) setFailureBreakdown(fRes.data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (isLoading || !data) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading business analytics...</div>;
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={20} color="var(--brand-primary)" /> KTech Business Analytics & Intelligence
        </h2>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
          Live operational overview, revenue collections, technician productivity, and equipment failure metrics
        </div>
      </div>

      {/* Top 4 Primary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Total Billed Revenue</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            ₹{data.finances.totalBilled.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '4px', fontWeight: 600 }}>
            ₹{data.finances.totalCollected.toLocaleString('en-IN')} Collected ({data.finances.totalInvoices} invoices)
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Active In-Shop Workload</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '4px' }}>
            {data.jobs.active} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>/ {data.jobs.total} total jobs</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {data.jobs.inRepair} in repair • {data.jobs.readyForDelivery} ready for pickup
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Inventory Capital & Salvage</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fb923c', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            ₹{data.inventory.stockValuation.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {data.inventory.totalUnitsInStock} units in stock • {data.inventory.salvageDevicesCount} salvage donors
          </div>
        </div>

        <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Warranties & Client CRM</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-success)', marginTop: '4px' }}>
            {data.crm.activeWarranties} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>active</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {data.crm.totalCustomers} registered clients • {data.crm.warrantyClaimsHandled} claims
          </div>
        </div>
      </div>

      {/* Grid: Technician Leaderboard & Equipment Failure Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
        {/* Technician Productivity */}
        <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Wrench size={15} color="var(--brand-primary)" /> Technician Performance & Productivity
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {techPerformance.map((tech) => (
              <div key={tech.id as string} style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>{tech.full_name as string}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    Assigned: {tech.total_assigned_jobs as number} jobs • Logged: {tech.total_minutes_logged as number} mins
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-success)' }}>
                    {tech.completed_repairs as number} Repaired
                  </div>
                  {Number(tech.unrepairable_count || 0) > 0 && (
                    <div style={{ fontSize: '10px', color: '#f87171' }}>
                      {tech.unrepairable_count as number} Unrepairable
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment Failure Breakdown */}
        <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={15} color="#fb923c" /> Equipment Category Distribution
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {failureBreakdown.map((item) => (
              <div key={item.equipment_type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '4px', backgroundColor: 'var(--bg-surface)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {item.equipment_type.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                  {item.job_count} jobs
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
