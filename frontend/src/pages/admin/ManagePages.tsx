import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import Modal from '../../components/ui/Modal';
import { useData } from '../../context/DataContext';
import { createPage, updatePage, deletePage } from '../../api/adminApi';
import type { Page } from '../../types';
import './ManageTable.css';

export default function ManagePages() {
  const { pages, roles, refreshPages } = useData();
  const navigate = useNavigate();

  const nonAdminRoles = roles.filter(r => r.roleName !== 'admin');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);

  const [form, setForm] = useState({
    pageName: '',
    roleId: 'R001'
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ───────────── OPEN MODAL ─────────────
  const openAdd = () => {
    setEditing(null);
    setForm({
      pageName: '',
      roleId: nonAdminRoles[0]?.roleId || 'R001'
    });
    setShowModal(true);
  };

  const openEdit = (p: Page) => {
    setEditing(p);
    setForm({
      pageName: p.pageName,
      roleId: p.role?.roleId ?? 'R001'
    });
    setShowModal(true);
  };

  // ───────────── SAVE ─────────────
  const handleSave = async () => {
    if (!form.pageName.trim()) {
      alert('Page name is required');
      return;
    }

    try {
      setSaving(true);

      if (editing) {
        await updatePage(editing.pageId, form);
      } else {
        await createPage(form);
      }

      await refreshPages();
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert('Error saving page');
    } finally {
      setSaving(false);
    }
  };

  // ───────────── DELETE ─────────────
  const handleDelete = async () => {
    if (!editing) return;

    if (!window.confirm(`Delete page "${editing.pageName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);

      await deletePage(editing.pageId);

      await refreshPages();
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert('Error deleting page');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="manage-page">
        <div className="manage-header">
          <div>
            <h1>Manage Pages</h1>
            <p>View and edit pages.</p>
          </div>

          <div className="header-actions">
            <button
              className="back-btn"
              onClick={() => navigate('/admin/dashboard')}
            >
              ← Back
            </button>

            <button className="add-btn" onClick={openAdd}>
              + Add Page
            </button>
          </div>
        </div>

        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Page ID</th>
                <th>Page Name</th>
                <th>Role ID</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {pages.map(p => (
                <tr key={p.pageId}>
                  <td>{p.pageId}</td>
                  <td>{p.pageName}</td>
                  <td>{p.role?.roleId}</td>
                  <td className="actions-cell">
                    <button
                      className="action-btn edit"
                      onClick={() => openEdit(p)}
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────── MODAL ───────────── */}
      {showModal && (
        <Modal
          title={editing ? 'Edit Page' : 'Add Page'}
          onClose={() => setShowModal(false)}
        >
          <div className="form-group">
            <label>Page Name</label>
            <input
              value={form.pageName}
              onChange={e =>
                setForm(f => ({ ...f, pageName: e.target.value }))
              }
              placeholder="e.g. Operator Dashboard"
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select
              value={form.roleId}
              onChange={e =>
                setForm(f => ({ ...f, roleId: e.target.value }))
              }
            >
              {nonAdminRoles.map(r => (
                <option key={r.roleId} value={r.roleId}>
                  {r.roleId} - {r.roleName}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>

            {editing && (
              <button
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}

            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}