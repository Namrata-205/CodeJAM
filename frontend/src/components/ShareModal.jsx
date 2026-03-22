import React, { useState, useEffect } from 'react';
import { X, Copy, Mail, Check, Trash2, UserMinus, ChevronDown, Loader2, Link2 } from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';

const ROLES = ['viewer', 'editor'];

const ShareModal = ({ project, onClose }) => {
  const {
    listCollaborators, inviteCollaborator,
    removeCollaborator, changeCollaboratorRole,
    generateShareLink, revokeShareLink,
  } = useProjects();

  const [tab, setTab] = useState('invite');          // 'invite' | 'manage' | 'link'
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [collaborators, setCollaborators] = useState([]);
  const [shareUrl, setShareUrl] = useState(project.share_id
    ? `${window.location.origin}/projects/share/${project.share_id}`
    : null
  );
  const [loading, setLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load collaborators when manage tab opens
  useEffect(() => {
    if (tab === 'manage') {
      setLoading(true);
      listCollaborators(project.id)
        .then(setCollaborators)
        .catch(() => setCollaborators([]))
        .finally(() => setLoading(false));
    }
  }, [tab]);

  // ── Invite ────────────────────────────────────────────────────────────────

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setInviteMsg(null);
    try {
      const res = await inviteCollaborator(project.id, email.trim(), role);
      setInviteMsg({ type: 'success', text: res.message || 'Invitation sent!' });
      setEmail('');
    } catch (err) {
      setInviteMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── Remove collaborator ───────────────────────────────────────────────────

  const handleRemove = async (userId) => {
    try {
      await removeCollaborator(project.id, userId);
      setCollaborators((prev) => prev.filter((c) => c.user_id !== userId));
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Change role ───────────────────────────────────────────────────────────

  const handleRoleChange = async (userId, newRole) => {
    try {
      const updated = await changeCollaboratorRole(project.id, userId, newRole);
      setCollaborators((prev) =>
        prev.map((c) => (c.user_id === userId ? { ...c, role: updated.role } : c))
      );
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Share link ────────────────────────────────────────────────────────────

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const res = await generateShareLink(project.id);
      setShareUrl(res.share_url);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeLink = async () => {
    setLoading(true);
    try {
      await revokeShareLink(project.id);
      setShareUrl(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white font-outfit">Share — {project.name}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {[['invite', 'Invite'], ['manage', 'Collaborators'], ['link', 'Share link']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {/* ── Invite tab ── */}
          {tab === 'invite' && (
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Role</label>
                <div className="flex gap-3">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium capitalize transition-all ${
                        role === r
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                          : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  {role === 'viewer' ? 'Can view and run code, but not edit.' : 'Can edit files and run code.'}
                </p>
              </div>

              {inviteMsg && (
                <p className={`text-sm px-3 py-2 rounded-lg ${
                  inviteMsg.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  {inviteMsg.text}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Invitation
              </button>
            </form>
          )}

          {/* ── Manage tab ── */}
          {tab === 'manage' && (
            <div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                </div>
              ) : collaborators.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">No collaborators yet</p>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((c) => (
                    <div
                      key={c.user_id}
                      className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {c.email[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{c.email}</p>
                        <p className="text-xs text-gray-500">
                          {c.accepted ? 'Active' : 'Pending acceptance'}
                        </p>
                      </div>

                      {/* Role selector */}
                      <select
                        value={c.role}
                        onChange={(e) => handleRoleChange(c.user_id, e.target.value)}
                        className="bg-slate-700 border border-slate-600 text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleRemove(c.user_id)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                        title="Remove collaborator"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Share link tab ── */}
          {tab === 'link' && (
            <div className="space-y-4">
              {shareUrl ? (
                <>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Anyone with this link can view the project without logging in.
                  </p>
                  <button
                    onClick={handleRevokeLink}
                    disabled={loading}
                    className="w-full py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    Revoke link
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <div className="text-center">
                      <Link2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No share link generated yet</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateLink}
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Generate share link
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;