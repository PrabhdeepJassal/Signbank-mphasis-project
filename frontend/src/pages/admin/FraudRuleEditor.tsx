import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import { fetchRules, updateRule, toggleRule } from '../../api/fraudApi';
import type { AlertRule } from '../../types';
import './FraudRuleEditor.css';

const CATEGORY_COLORS: Record<string, string> = {
  LOGIN: '#3b82f6',
  TRANSACTION: '#10b981',
  VELOCITY: '#f59e0b',
};

export default function FraudRuleEditor() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { fetchRules().then(setRules); }, []);

  const handleToggle = async (ruleId: string) => {
    setSaving(ruleId);
    await toggleRule(ruleId);
    setRules(prev => prev.map(r => r.ruleId === ruleId ? { ...r, enabled: !r.enabled } : r));
    setSaving(null);
  };

  const handleParamChange = async (ruleId: string, key: string, value: string) => {
    const rule = rules.find(r => r.ruleId === ruleId);
    if (!rule) return;

    let params: Record<string, unknown> = {};
    try { params = JSON.parse(rule.params); } catch { params = {}; }
    params[key] = parseFloat(value);

    setSaving(ruleId);
    await updateRule(ruleId, { params: JSON.stringify(params) });
    setRules(prev => prev.map(r => r.ruleId === ruleId ? { ...r, params: JSON.stringify(params) } : r));
    setSaving(null);
  };

  const grouped: Record<string, AlertRule[]> = {};
  rules.forEach(r => {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  });

  return (
    <AdminLayout>
      <div className="fraud-rule-editor">
        <div className="fraud-rule-header">
          <div>
            <h1>Alert Rules</h1>
            <p className="fraud-sub">Configure fraud detection thresholds and toggle rules on/off</p>
          </div>
          <button className="back-btn" onClick={() => navigate('/admin/fraud')}>&larr; Back</button>
        </div>

        {Object.entries(grouped).map(([category, categoryRules]) => (
          <div key={category} className="fraud-rule-group">
            <div className="fraud-rule-group-header" style={{ borderLeftColor: CATEGORY_COLORS[category] || '#6b7280' }}>
              <h2>{category} Rules</h2>
            </div>
            <div className="fraud-rule-cards">
              {categoryRules.map(rule => (
                <div key={rule.ruleId} className={`fraud-rule-card ${!rule.enabled ? 'disabled' : ''}`}>
                  <div className="fraud-rule-top">
                    <div className="fraud-rule-info">
                      <div className="fraud-rule-id">{rule.ruleId}</div>
                      <div className="fraud-rule-name">{rule.name}</div>
                      <div className="fraud-rule-desc">{rule.description}</div>
                    </div>
                    <label className="fraud-toggle">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggle(rule.ruleId)}
                        disabled={saving === rule.ruleId}
                      />
                      <span className="fraud-toggle-slider"></span>
                    </label>
                  </div>

                  {rule.enabled && rule.params !== '{}' && rule.params && (
                    <div className="fraud-rule-params">
                      {Object.entries(parseParams(rule.params)).map(([key, val]) => (
                        <div key={key} className="fraud-param">
                          <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
                          <input
                            type="number"
                            step="0.1"
                            value={val as number}
                            onChange={e => handleParamChange(rule.ruleId, key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {!rule.enabled && (
                    <div className="fraud-rule-disabled-note">This rule is disabled. No alerts will fire for this rule.</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

function parseParams(params: string): Record<string, unknown> {
  try { return JSON.parse(params); } catch { return {}; }
}
