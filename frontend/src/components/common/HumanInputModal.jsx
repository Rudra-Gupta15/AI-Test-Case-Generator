import React, { useState } from 'react';

/**
 * HumanInputModal
 *
 * Shown when the AI executor is paused and needs the user to provide information
 * (OTP, CAPTCHA answer, etc.) before it can continue the test.
 *
 * Props:
 *   - executionId (string)     : The running execution ID
 *   - hitlInfo   (object)      : { type, title, description, fields, screenshot_b64? }
 *   - onContinue (fn)          : Called after user submits — receives the input data dict
 *   - onSkip     (fn)          : Called if user wants to skip this test case entirely
 */
export default function HumanInputModal({ executionId, hitlInfo, onContinue, onSkip }) {
  const [fieldValues, setFieldValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!hitlInfo) return null;

  const handleChange = (key, value) => {
    setFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const handleContinue = async () => {
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/execution_resume/${executionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ input_data: fieldValues })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to resume execution');
      }

      onContinue(fieldValues);
      setFieldValues({});
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const typeColors = {
    otp: { bg: '#eff6ff', border: '#3b82f6', icon: '🔐', accent: '#2563eb' },
    captcha: { bg: '#fefce8', border: '#eab308', icon: '🤖', accent: '#ca8a04' },
    profile_selection: { bg: '#f0fdf4', border: '#22c55e', icon: '👤', accent: '#16a34a' },
    password_reminder: { bg: '#fff7ed', border: '#f97316', icon: '🔑', accent: '#ea580c' },
    contact_verification: { bg: '#fdf4ff', border: '#a855f7', icon: '📱', accent: '#9333ea' },
  };
  const colors = typeColors[hitlInfo.type] || typeColors['otp'];

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)', zIndex: 9998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease'
      }}>
        {/* Modal Card */}
        <div style={{
          background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)', border: `2px solid ${colors.border}`,
          overflow: 'hidden', animation: 'slideUp 0.25s ease', zIndex: 9999
        }}>
          {/* Header stripe */}
          <div style={{ background: colors.bg, padding: '24px 28px 20px', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '32px' }}>{colors.icon}</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                  AI Paused — Human Input Required
                </div>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
                  {hitlInfo.title}
                </h2>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: '1.55' }}>
              {hitlInfo.description}
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '24px 28px' }}>
            {/* Screenshot preview (CAPTCHA) */}
            {hitlInfo.screenshot_b64 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Current browser state:
                </div>
                <img
                  src={`data:image/png;base64,${hitlInfo.screenshot_b64}`}
                  alt="Browser screenshot"
                  style={{ width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0', maxHeight: '220px', objectFit: 'cover', objectPosition: 'top' }}
                />
              </div>
            )}

            {/* Dynamic input fields */}
            {hitlInfo.fields && hitlInfo.fields.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {hitlInfo.fields.map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>
                      {field.label}
                    </label>
                    <input
                      type={field.type || 'text'}
                      placeholder={field.placeholder || ''}
                      value={fieldValues[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !submitting && handleContinue()}
                      autoFocus
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '10px 14px', borderRadius: '8px',
                        border: `1.5px solid ${colors.border}`, outline: 'none',
                        fontSize: '14px', color: '#0f172a',
                        background: colors.bg, transition: 'border-color 0.2s'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* No-field message (e.g. CAPTCHA, profile selection — user acts in browser) */}
            {(!hitlInfo.fields || hitlInfo.fields.length === 0) && (
              <div style={{
                background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px',
                padding: '16px', marginBottom: '20px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>👆</div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                  Please look at the <strong>browser window that opened</strong> and complete the action manually.
                  <br />Once done, click <strong>Continue</strong> below.
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleContinue}
                disabled={submitting}
                style={{
                  flex: 1, height: '44px', borderRadius: '10px',
                  background: submitting ? '#94a3b8' : colors.accent,
                  color: 'white', border: 'none', fontSize: '14px', fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {submitting ? (
                  <>
                    <span style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    Resuming...
                  </>
                ) : '▶ Continue Execution'}
              </button>
              <button
                onClick={onSkip}
                disabled={submitting}
                style={{
                  height: '44px', padding: '0 18px', borderRadius: '10px',
                  background: 'transparent', color: '#64748b',
                  border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s'
                }}
              >
                Skip Test
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}
