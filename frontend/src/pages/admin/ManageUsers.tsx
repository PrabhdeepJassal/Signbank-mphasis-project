import { useState } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import Modal from '../../components/ui/Modal';
import { useData } from '../../context/DataContext';
import { createUser, updateUser, deleteUser } from '../../api/adminApi';
import type { User } from '../../types';
import './ManageTable.css';

export default function ManageUsers() {
  const { users, roles, refreshUsers } = useData();
  const nonAdminRoles = roles.filter(r => r.roleName !== 'admin');

  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<User | null>(null);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [error, setError]           = useState('');

  const [form, setForm] = useState({
    username:    '',
    email:       '',
    roleId:      'R001',
    password:    '',   // ← new field: admin sets initial password
  });

  const openAdd = () => {
    setEditing(null);
    setError('');
    setForm({
      username: '',
      email:    '',
      roleId:   nonAdminRoles[0]?.roleId || 'R001',
      password: '',
    });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setError('');
    setForm({
      username: u.username,
      email:    u.email,
      roleId:   u.roleId,
      password: '',   // leave blank — only fill if resetting password
    });
    setShowModal(true);
  };

  const getRoleName = (rid: string) =>
    roles.find(r => r.roleId === rid)?.roleName || rid;

  const handleSave = async () => {
    setError('');
    if (!form.username.trim()) { setError('Username is required'); return; }
    if (!form.email.trim())    { setError('Email is required');    return; }
    if (!editing && !form.password.trim()) {
      setError('Password is required for new users'); return;
    }

    setSaving(true);
    try {
      if (editing) {
        // Update — password only sent if admin filled it (reset scenario)
        await updateUser(editing.userId, {
          username:     form.username,
          email:        form.email,
          roleId:       form.roleId,
          // Send raw password as passwordHash — backend will re-hash it
          ...(form.password.trim() ? { passwordHash: form.password } : {}),
        });
      } else {
        // Create — send password as passwordHash; backend hashes it
        await createUser({
          userId:       form.username,   // userId = username (4-digit ID)
          username:     form.username,
          email:        form.email,
          roleId:       form.roleId,
          passwordHash: form.password,   // backend encodes this
        });
      }
      await refreshUsers();
      setShowModal(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm(`Delete user "${editing.username}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteUser(editing.userId);
      await refreshUsers();
      setShowModal(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="manage-page">
        <div className="manage-header">
          <div>
            <h1>Manage Users</h1>
            <p>Create users with an initial password. Users can change it on first login.</p>
          </div>
          <button className="add-btn" onClick={openAdd}>+ Add User</button>
        </div>

        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Password Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.userId}>
                  <td>{u.userId}</td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${getRoleName(u.roleId)}`}>
                      {getRoleName(u.roleId)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${u.passwordSet ? 'active' : 'inactive'}`}>
                      {u.passwordSet ? 'Set' : 'Not Set'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="action-btn edit" onClick={() => openEdit(u)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal
          title={editing ? 'Edit User' : 'Add User'}
          onClose={() => setShowModal(false)}
        >
          {error && <div className="form-error">⚠ {error}</div>}

          <div className="form-group">
            <label>Username (4-digit ID)</label>
            <input
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="e.g. 1003"
              disabled={!!editing}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@signbank.com"
              type="email"
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select
              value={form.roleId}
              onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
            >
              {nonAdminRoles.map(r => (
                <option key={r.roleId} value={r.roleId}>{r.roleName}</option>
              ))}
            </select>
          </div>

          {/* Password field — required for new users, optional for edit (reset) */}
          <div className="form-group">
            <label>
              {editing ? 'Reset Password (leave blank to keep current)' : 'Initial Password *'}
            </label>
            <input
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={editing ? 'Enter new password to reset' : 'Set initial password'}
              type="password"
            />
          </div>

          {!editing && (
            <div className="info-note">
              💡 User will login with this password. They can change it via gesture login.
            </div>
          )}

          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            {editing && (
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}