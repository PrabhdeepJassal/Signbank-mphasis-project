import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import Modal from '../../components/ui/Modal';
import { useData } from '../../context/DataContext';
import { createCommand, updateCommand, deleteCommand } from '../../api/adminApi';
import type { Command } from '../../types';
import './ManageTable.css';

export default function ManageCommands() {
  const { commands, pages, refreshCommands } = useData();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Command | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const [form, setForm] = useState({
    commandName:        '',
    commandDescription: '',
    pageId:             '',
  });

  const openAdd = () => {
    setEditing(null);
    setError('');
    setSuccess('');
    setForm({
      commandName:        '',
      commandDescription: '',
      pageId:             pages[0]?.pageId || '',
    });
    setShowModal(true);
  };

  const openEdit = (c: Command) => {
    setEditing(c);
    setError('');
    setSuccess('');
    setForm({
      commandName:        c.commandName,
      commandDescription: c.commandDescription ?? '',
      pageId:             c.page?.pageId ?? (pages[0]?.pageId || ''),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.commandName.trim()) { setError('Command name is required'); return; }
    if (!form.pageId)             { setError('Please select a page');      return; }

    setSaving(true);
    try {
      if (editing) {
        await updateCommand(editing.commandId, {
          commandName:        form.commandName,
          commandDescription: form.commandDescription,
          pageId:             form.pageId,
        });
        setSuccess(`Command "${form.commandName}" updated successfully`);
      } else {
        await createCommand({
          commandName:        form.commandName,
          commandDescription: form.commandDescription,
          pageId:             form.pageId,
        });
        setSuccess(`Command "${form.commandName}" created successfully`);
      }
      await refreshCommands();
      setShowModal(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save command. Check backend logs.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm(
      `Delete command "${editing.commandName}"?\n\nThis will also remove any gesture mappings for this command. This cannot be undone.`
    )) return;

    setDeleting(true);
    setError('');
    try {
      await deleteCommand(editing.commandId);
      await refreshCommands();
      setShowModal(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to delete command. It may have active mappings.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="manage-page">
        <div className="manage-header">
          <div>
            <h1>Manage Commands</h1>
            <p>View, add, edit and delete gesture commands.</p>
          </div>
          <div className="header-actions">
            <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>← Back</button>
            <button className="add-btn" onClick={openAdd}>+ Add Command</button>
          </div>
        </div>

        {success && (
          <div className="success-banner">✅ {success}</div>
        )}

        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Command ID</th>
                <th>Command Name</th>
                <th>Description</th>
                <th>Page ID</th>
                <th>Page Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {commands.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No commands found</td></tr>
              ) : commands.map(c => (
                <tr key={c.commandId}>
                  <td>{c.commandId}</td>
                  <td><strong>{c.commandName}</strong></td>
                  <td>{c.commandDescription}</td>
                  <td>{c.page?.pageId}</td>
                  <td><strong>{c.page?.pageName}</strong></td>
                  <td className="actions-cell">
                    <button className="action-btn edit" onClick={() => openEdit(c)}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal
          title={editing ? `Edit Command — ${editing.commandId}` : 'Add Command'}
          onClose={() => setShowModal(false)}
        >
          {error && <div className="form-error">⚠ {error}</div>}

          <div className="form-group">
            <label>Command Name *</label>
            <input
              value={form.commandName}
              onChange={e => setForm(f => ({ ...f, commandName: e.target.value }))}
              placeholder="e.g. Check Balance"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              value={form.commandDescription}
              onChange={e => setForm(f => ({ ...f, commandDescription: e.target.value }))}
              placeholder="e.g. Used to check balance"
            />
          </div>

          <div className="form-group">
            <label>Page *</label>
            <select
              value={form.pageId}
              onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))}
            >
              <option value="">— Select a page —</option>
              {pages.map(p => (
                <option key={p.pageId} value={p.pageId}>
                  {p.pageId} — {p.pageName}
                </option>
              ))}
            </select>
          </div>

          {editing && (
            <div className="info-note warning-note">
              ⚠ Deleting this command will also remove all its gesture mappings.
            </div>
          )}

          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>
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