import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  ExternalLink,
} from 'lucide-react';
import { formatPhoneDisplay } from '../../utils/phone.ts';
import { useShop } from '../../context/ShopContext.tsx';

export const WhatsAppCenter: React.FC = () => {
  const { shopSettings } = useShop();
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [templates, setTemplates] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Send Modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageBody, setMessageBody] = useState('');

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.communication?.listMessages) {
        const res = await window.electronAPI.communication.listMessages({ limit: 50 });
        if (res.success && res.data) setMessages(res.data);
      }

      if (window.electronAPI?.communication?.listTemplates) {
        const tRes = await window.electronAPI.communication.listTemplates();
        if (tRes.success && tRes.data) setTemplates(tRes.data);
      }
    } catch (err) {
      console.error('Failed to load communication messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleQueueMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone.trim() || !messageBody.trim()) return;

    try {
      if (!window.electronAPI?.communication?.queueMessage) return;
      const res = await window.electronAPI.communication.queueMessage({
        customerId: 'CUST-001',
        templateKey: selectedTemplate || 'CUSTOM_MESSAGE',
        recipientPhone: recipientPhone.trim(),
        messagePayload: messageBody.trim(),
      });

      if (res.success && res.data) {
        // Open WhatsApp web in browser if requested
        if (res.data.waDeepLink) {
          window.open(res.data.waDeepLink, '_blank');
        }
        setShowSendModal(false);
        setMessageBody('');
        setRecipientPhone('');
        fetchMessages();
      } else {
        alert(res.error || 'Failed to dispatch message');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} color="#22c55e" /> WhatsApp Customer Communication Queue
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
            Asynchronous message queue with offline resilience and automatic retry engine
          </div>
        </div>

        <button
          onClick={() => setShowSendModal(true)}
          style={{
            padding: '7px 16px',
            borderRadius: '6px',
            backgroundColor: '#22c55e',
            color: '#ffffff',
            border: 'none',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Send size={14} /> Send WhatsApp Update
        </button>
      </div>

      {/* Message Queue Stream Table */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '8px 12px' }}>Recipient & Job</th>
              <th style={{ padding: '8px 12px' }}>Template</th>
              <th style={{ padding: '8px 12px' }}>Message Preview</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Dispatch Status</th>
              <th style={{ padding: '8px 12px' }}>Timestamp</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  Loading WhatsApp queue...
                </td>
              </tr>
            ) : messages.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  No messages queued.
                </td>
              </tr>
            ) : (
              messages.map((msg) => (
                <tr key={msg.id as string} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{msg.customer_name as string || 'Customer'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {formatPhoneDisplay(msg.recipient_phone as string)} {msg.job_number ? `• ${String(msg.job_number)}` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--brand-primary)', fontWeight: 600, fontSize: '11px' }}>
                    {(msg.template_name as string) || (msg.template_key as string)}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msg.message_payload as string}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: msg.dispatch_status === 'SENT' || msg.dispatch_status === 'DELIVERED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: msg.dispatch_status === 'SENT' || msg.dispatch_status === 'DELIVERED' ? 'var(--color-success)' : '#facc15',
                      }}
                    >
                      {msg.dispatch_status as string}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '11px' }}>
                    {new Date(msg.created_at as string).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        const cleanPhone = (msg.recipient_phone as string).replace(/[^0-9]/g, '');
                        const waPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone.slice(-10)}`;
                        const url = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg.message_payload as string)}`;
                        window.open(url, '_blank');
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#22c55e',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        margin: '0 auto',
                      }}
                    >
                      <ExternalLink size={11} /> Open WA
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: SEND UPDATE */}
      {showSendModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', maxWidth: '480px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
              Compose WhatsApp Customer Notification
            </h3>

            <form onSubmit={handleQueueMessage} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Recipient Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9843011223"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    const tKey = e.target.value;
                    setSelectedTemplate(tKey);
                    const tmpl = templates.find((t) => t.template_key === tKey);
                    if (tmpl) {
                      let body = String(tmpl.template_body || '');
                      body = body
                        .replace(/\{\{shop_name\}\}/g, shopSettings.shopName || 'KTech Computers')
                        .replace(/\{\{shop_phone\}\}/g, shopSettings.phone || '+91 98400 12345')
                        .replace(/\{\{shop_address\}\}/g, shopSettings.address || '1st Floor, Gandhi Road')
                        .replace(/KTech Computers/g, shopSettings.shopName || 'KTech Computers')
                        .replace(/\+91 98765 43210/g, shopSettings.phone || '+91 98400 12345');
                      setMessageBody(body);
                    }
                  }}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                >
                  <option value="">Select Template (Optional)</option>
                  {templates.map((t) => (
                    <option key={t.id as string} value={t.template_key as string}>
                      {t.name as string}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Message Text *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Dear customer, your device (JOB-2026-00001) diagnosis has been completed..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', backgroundColor: '#22c55e', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Dispatch via WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
