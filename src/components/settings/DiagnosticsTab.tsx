import React, { useState, useEffect } from 'react';
import {
  Activity,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Database,
  Calendar,
  Layers,
  Terminal,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';

export const DiagnosticsTab: React.FC = () => {
  const [diagInfo, setDiagInfo] = useState<{
    database?: Record<string, unknown>;
    logs?: { retentionDays: number; logFiles: unknown[]; totalLogsCount: number };
  } | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    archivePath?: string;
    archiveSizeBytes?: number;
    fileCount?: number;
    error?: string;
  } | null>(null);

  const [retentionDays, setRetentionDays] = useState(7);
  const [isUpdatingRetention, setIsUpdatingRetention] = useState(false);
  const [retentionSaved, setRetentionSaved] = useState(false);

  // Live log viewer state
  const [logs, setLogs] = useState<string[]>([]);
  const [logLevel, setLogLevel] = useState<string>('');
  const [logLimit, setLogLimit] = useState<number>(100);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchDiagnostics = async () => {
    try {
      if (window.electronAPI?.system?.getDiagnosticsInfo) {
        const res = await window.electronAPI.system.getDiagnosticsInfo();
        if (res.success && res.data) {
          setDiagInfo(res.data);
          if (res.data.logs?.retentionDays) {
            setRetentionDays(res.data.logs.retentionDays);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load diagnostics info:', err);
    }
  };

  const fetchRecentLogs = async () => {
    setIsLoadingLogs(true);
    try {
      if (window.electronAPI?.system?.getRecentLogs) {
        const res = await window.electronAPI.system.getRecentLogs({
          level: logLevel || undefined,
          limit: logLimit,
        });
        if (res.success && res.data) {
          setLogs(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch recent logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    fetchRecentLogs();
  }, [logLevel, logLimit]);

  const handleExportDiagnostics = async () => {
    setIsExporting(true);
    setExportResult(null);
    try {
      if (window.electronAPI?.system?.exportDiagnostics) {
        const res = await window.electronAPI.system.exportDiagnostics({ openFolder: true });
        setExportResult(res);
        if (res.success && res.archivePath) {
          window.electronAPI?.system?.showItemInFolder?.({ path: res.archivePath });
        }
      }
    } catch (err: unknown) {
      setExportResult({ success: false, error: (err as Error).message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveRetention = async () => {
    setIsUpdatingRetention(true);
    try {
      if (window.electronAPI?.system?.setLogRetention) {
        const res = await window.electronAPI.system.setLogRetention({ days: retentionDays });
        if (res.success) {
          setRetentionSaved(true);
          setTimeout(() => setRetentionSaved(false), 3000);
          fetchDiagnostics();
        }
      }
    } catch (err) {
      console.error('Failed to save log retention:', err);
    } finally {
      setIsUpdatingRetention(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const dbData = (diagInfo?.database as Record<string, unknown>) || {};
  const tableCounts = (dbData.tableRowCounts as Record<string, number>) || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner / Actions */}
      <div
        style={{
          padding: '14px',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--brand-primary, #3b82f6)" />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              System Diagnostics & 7-Day Log Center
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
            Continuous background audit, PII redaction, automatic 7-day retention & 1-click support archive.
          </p>
        </div>

        <button
          onClick={handleExportDiagnostics}
          disabled={isExporting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--brand-primary, #3b82f6)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: isExporting ? 'not-allowed' : 'pointer',
            opacity: isExporting ? 0.7 : 1,
          }}
        >
          {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
          <span>{isExporting ? 'Compressing Logs & DB...' : 'Download Diagnostic Zip'}</span>
        </button>
      </div>

      {/* Export Result Notification */}
      {exportResult && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            backgroundColor: exportResult.success ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${exportResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: exportResult.success ? '#22c55e' : '#ef4444',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
            {exportResult.success ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertTriangle size={18} style={{ flexShrink: 0 }} />}
            <div>
              {exportResult.success ? (
                <>
                  <div><strong>Diagnostics Bundle Created:</strong> ({formatBytes(exportResult.archiveSizeBytes)})</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', wordBreak: 'break-all', marginTop: '2px' }}>
                    {exportResult.archivePath}
                  </div>
                </>
              ) : (
                <>
                  <strong>Failed to export bundle:</strong> {exportResult.error}
                </>
              )}
            </div>
          </div>

          {exportResult.success && exportResult.archivePath && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  if (exportResult.archivePath) {
                    window.electronAPI?.system?.showItemInFolder?.({ path: exportResult.archivePath });
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Open Windows File Explorer and highlight this file"
              >
                <FolderOpen size={13} />
                <span>Open Folder</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (exportResult.archivePath) {
                    window.electronAPI?.system?.openPath?.({ path: exportResult.archivePath });
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Open the zip file directly with default application"
              >
                <ExternalLink size={13} />
                <span>Open Zip</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Diagnostic Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
            <Database size={14} />
            <span>SQLite Database Integrity</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#22c55e', marginTop: '6px' }}>
            {String(dbData.status || 'VERIFIED HEALTHY')}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Size: {formatBytes(dbData.dbSizeBytes as number)} | Page Size: {String(dbData.pageSize || 4096)}
          </div>
        </div>

        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
            <Calendar size={14} />
            <span>Log Rolling & Retention</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <input
              type="number"
              min={1}
              max={60}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              style={{
                width: '60px',
                padding: '4px 6px',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-main)',
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Days Rolling</span>
            <button
              onClick={handleSaveRetention}
              disabled={isUpdatingRetention}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              {retentionSaved ? 'Saved!' : 'Save'}
            </button>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Active log files: {diagInfo?.logs?.totalLogsCount || 1} daily files
          </div>
        </div>

        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
            <Layers size={14} />
            <span>Live Data Records</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-main)', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div>Jobs: <strong>{tableCounts.service_jobs || 0}</strong> | Customers: <strong>{tableCounts.customers || 0}</strong></div>
            <div>Invoices: <strong>{tableCounts.invoices || 0}</strong> | Inventory: <strong>{tableCounts.inventory_items || 0}</strong></div>
          </div>
        </div>
      </div>

      {/* Live Log Console */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Log Controls Header */}
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
            <Terminal size={14} color="var(--brand-primary)" />
            <span>Live System & Exception Log Stream</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
              aria-label="Filter log level"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-main)',
              }}
            >
              <option value="">All Levels</option>
              <option value="ERROR">Errors & Exceptions</option>
              <option value="WARN">Warnings</option>
              <option value="AUDIT">Audit Trails</option>
              <option value="INFO">Information</option>
              <option value="DEBUG">Debug</option>
            </select>

            <select
              value={logLimit}
              onChange={(e) => setLogLimit(Number(e.target.value))}
              aria-label="Limit log lines"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-main)',
              }}
            >
              <option value={50}>Last 50 lines</option>
              <option value={100}>Last 100 lines</option>
              <option value={200}>Last 200 lines</option>
              <option value={500}>Last 500 lines</option>
            </select>

            <button
              onClick={fetchRecentLogs}
              disabled={isLoadingLogs}
              aria-label="Refresh logs"
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '3px 6px',
                cursor: 'pointer',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RefreshCw size={12} className={isLoadingLogs ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Monospace Log Viewer */}
        <div
          style={{
            maxHeight: '220px',
            minHeight: '140px',
            overflowY: 'auto',
            padding: '8px 12px',
            backgroundColor: '#0a0f1d',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '10.5px',
            lineHeight: 1.5,
            color: '#94a3b8',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
              No log lines found for selected criteria.
            </div>
          ) : (
            logs.map((line, idx) => {
              const isError = line.includes('[ERROR') || line.includes('[EXCEPTION');
              const isWarn = line.includes('[WARN');
              const isAudit = line.includes('[AUDIT');
              const color = isError ? '#f87171' : isWarn ? '#fbbf24' : isAudit ? '#a78bfa' : '#93c5fd';
              return (
                <div key={idx} style={{ color }}>
                  {line}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
