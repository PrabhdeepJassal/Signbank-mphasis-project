import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import Modal from '../../components/ui/Modal';
import { useData } from '../../context/DataContext';
import { createMapping, updateMapping, deleteMapping } from '../../api/adminApi';
import type { CommandMapping } from '../../types';
import './ManageMappings.css';

export default function ManageMappings() {
  const { mappings, gestures, commands, pages, roles, refreshMappings } = useData();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'R001' | 'R002'>('R001');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CommandMapping | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state for edit/add
  const [form, setForm] = useState({
    gestureId: '',
    commandId: '',
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // ── Filter by active role tab ──────────────────────────────────────────
  const rolePages = pages.filter(p => p.role?.roleId === activeTab);
  // Include ALL mappings for the role (not filtered by userId null only)
  const roleMappings = mappings.filter(m => m.roleId === activeTab);

  const getGesture = (gid: string) => gestures.find(g => g.gestureId === gid);
  const getPageCommands = (pageId: string) => commands.filter(c => c.page?.pageId === pageId);

  // Find existing mapping for a command in this role
  const getMappingForCommand = (commandId: string) =>
    roleMappings.find(m => m.commandId === commandId && (m.userId === null || m.userId === undefined));

  // ── Open edit modal ───────────────────────────────────────────────────
  const openEdit = (m: CommandMapping) => {
    setEditing(m);
    setIsAdding(false);
    setError('');
    setForm({
      gestureId: m.gestureId,
      commandId: m.commandId,
      isActive: m.isActive ?? true,
    });
    setShowModal(true);
  };

  // ── Open add modal for unmapped command ───────────────────────────────
  const openAdd = (commandId: string) => {
    setEditing(null);
    setIsAdding(true);
    setError('');
    setForm({
      gestureId: gestures[0]?.gestureId ?? '',
      commandId,
      isActive: true,
    });
    setShowModal(true);
  };

  // ── Open add modal for new free mapping ───────────────────────────────
  const openAddFree = () => {
    setEditing(null);
    setIsAdding(true);
    setError('');
    setForm({
      gestureId: gestures[0]?.gestureId ?? '',
      commandId: commands[0]?.commandId ?? '',
      isActive: true,
    });
    setShowModal(true);
  };

  // ── Save (create or update) ───────────────────────────────────────────
  const handleSave = async () => {
    setError('');
    if (!form.gestureId) { setError('Please select a gesture'); return; }
    if (isAdding && !form.commandId) { setError('Please select a command'); return; }

    setSaving(true);
    try {
      if (editing) {
        await updateMapping(editing.mapId, {
          gestureId: form.gestureId,
          isActive:  form.isActive,
        });
      } else {
        // Create new mapping
        await createMapping({
          commandId: form.commandId,
          gestureId: form.gestureId,
          roleId:    activeTab,
          userId:    null,
          isActive:  form.isActive,
        });
      }
      await refreshMappings();
      setShowModal(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm('Remove this mapping? This cannot be undone.')) return;
    setDeleting(true);
    setError('');
    try {
      await deleteMapping(editing.mapId);
      await refreshMappings();
      setShowModal(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to delete mapping');
    } finally {
      setDeleting(false);
    }
  };

  const roleLabel = activeTab === 'R001' ? 'Operator' : 'Viewer';

  // Commands that are not yet mapped for this role (for the add modal)
  const unmappedCommandsForRole = commands.filter(
    c => !roleMappings.some(m => m.commandId === c.commandId && (m.userId === null || m.userId === undefined))
  );

  return (
    <AdminLayout>
      <div className="manage-page">
        <div className="manage-header">
          <div>
            <h1>Manage Mappings</h1>
            <p>View and edit gesture-to-command mappings.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>← Back</button>
            <button className="add-btn" onClick={openAddFree}>+ Add Mapping</button>
          </div>
        </div>

        {/* ── Role tabs ── */}
        <div className="mapping-tabs">
          <button
            className={`tab-btn ${activeTab === 'R001' ? 'active' : ''}`}
            onClick={() => setActiveTab('R001')}
          >
            Operator
          </button>
          <button
            className={`tab-btn ${activeTab === 'R002' ? 'active' : ''}`}
            onClick={() => setActiveTab('R002')}
          >
            Viewer
          </button>
        </div>

        {/* ── Content ── */}
        <div className="mapping-content">
          <h2 className="role-title">{roleLabel}</h2>

          {rolePages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
              No pages found for this role.
            </div>
          )}

          {rolePages.map(page => {
            const pageCommands = getPageCommands(page.pageId);

            return (
              <div key={page.pageId} className="mapping-section">
                <h3 className="page-title">{page.pageName}</h3>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Command</th>
                      <th>Gesture</th>
                      <th>Gesture Symbol</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageCommands.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>
                          No commands for this page
                        </td>
                      </tr>
                    ) : pageCommands.map(cmd => {
                      const mapping = getMappingForCommand(cmd.commandId);
                      const gesture = mapping ? getGesture(mapping.gestureId) : null;

                      return (
                        <tr key={cmd.commandId}>
                          <td><strong>{cmd.commandName}</strong></td>
                          <td>{gesture?.gestureName || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                          <td className="symbol-cell">{gesture?.gestureSymbol || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                          <td>
                            {mapping ? (
                              <span className={`status-pill ${mapping.isActive ? 'active' : 'pending'}`}>
                                {mapping.isActive ? 'Active' : 'Inactive'}
                              </span>
                            ) : (
                              <span className="status-pill pending">Unmapped</span>
                            )}
                          </td>
                          <td className="actions-cell">
                            {mapping ? (
                              <button
                                className="action-btn edit"
                                onClick={() => openEdit(mapping)}
                                title="Edit mapping"
                              >
                                ✏️
                              </button>
                            ) : (
                              <button
                                className="action-btn add-mapping-btn"
                                onClick={() => openAdd(cmd.commandId)}
                                title="Add mapping for this command"
                              >
                                ➕
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Also show any mappings that don't belong to any listed page command */}
          {(() => {
            const listedCmdIds = new Set(rolePages.flatMap(p => getPageCommands(p.pageId).map(c => c.commandId)));
            const orphanMappings = roleMappings.filter(
              m => !listedCmdIds.has(m.commandId) && (m.userId === null || m.userId === undefined)
            );
            if (!orphanMappings.length) return null;
            return (
              <div className="mapping-section">
                <h3 className="page-title">Other Mappings</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Command</th>
                      <th>Gesture</th>
                      <th>Gesture Symbol</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orphanMappings.map(m => {
                      const cmd = commands.find(c => c.commandId === m.commandId);
                      const gesture = getGesture(m.gestureId);
                      return (
                        <tr key={m.mapId}>
                          <td><strong>{cmd?.commandName ?? m.commandId}</strong></td>
                          <td>{gesture?.gestureName || '—'}</td>
                          <td className="symbol-cell">{gesture?.gestureSymbol || '—'}</td>
                          <td>
                            <span className={`status-pill ${m.isActive ? 'active' : 'pending'}`}>
                              {m.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="actions-cell">
                            <button className="action-btn edit" onClick={() => openEdit(m)}>✏️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <Modal
          title={editing ? 'Edit Mapping' : 'Add Mapping'}
          onClose={() => { setShowModal(false); setError(''); }}
        >
          {error && <div className="form-error">⚠ {error}</div>}

          {/* Command selector — only for new mappings */}
          {isAdding && (
            <div className="form-group">
              <label>Command *</label>
              <select
                value={form.commandId}
                onChange={e => setForm(f => ({ ...f, commandId: e.target.value }))}
              >
                <option value="">— Select a command —</option>
                {commands.map(c => (
                  <option key={c.commandId} value={c.commandId}>
                    {c.commandName} ({c.page?.pageName ?? 'No page'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fixed command display for edit */}
          {editing && (
            <div className="form-group">
              <label>Command</label>
              <input
                value={editing.commandName || commands.find(c => c.commandId === editing.commandId)?.commandName || editing.commandId}
                disabled
              />
            </div>
          )}

          <div className="form-group">
            <label>Gesture *</label>
            <select
              value={form.gestureId}
              onChange={e => setForm(f => ({ ...f, gestureId: e.target.value }))}
            >
              <option value="">— Select a gesture —</option>
              {gestures.map(g => (
                <option key={g.gestureId} value={g.gestureId}>
                  {g.gestureSymbol} {g.gestureName} ({g.gestureId})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={form.isActive ? 'true' : 'false'}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Preview selected gesture */}
          {form.gestureId && (
            <div className="info-note" style={{ textAlign: 'center', fontSize: '2rem', padding: '12px' }}>
              {gestures.find(g => g.gestureId === form.gestureId)?.gestureSymbol}
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: 4 }}>
                {gestures.find(g => g.gestureId === form.gestureId)?.gestureName}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => { setShowModal(false); setError(''); }}>
              Cancel
            </button>
            {editing && (
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : '🗑 Delete'}
              </button>
            )}
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? '💾 Update' : '➕ Create'}
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
