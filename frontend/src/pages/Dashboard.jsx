import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, Globe, Users, Plus, Search, Lock,
  Trash2, Loader2, Code2
} from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import CreateProjectModal from '../components/CreateProjectModal';
import Navbar from '../components/Navbar';

const LANG_COLORS = {
  python: 'text-blue-400', javascript: 'text-yellow-400', typescript: 'text-blue-500',
  java: 'text-orange-500', go: 'text-cyan-400', rust: 'text-orange-600',
  cpp: 'text-purple-500', c: 'text-purple-600',
};

const LANG_ICONS = {
  python: '🐍', javascript: '💛', typescript: '💎', java: '☕',
  go: '🐹', rust: '🦀', cpp: '⚙️', c: '🔧',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { 
    projects, loading, error, fetchProjects, fetchPublicProjects, deleteProject,
    listPendingInvitations, acceptInvitation
  } = useProjects();
  const [activeTab, setActiveTab] = useState('my-projects');
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  useEffect(() => {
    if (activeTab === 'my-projects') fetchProjects();
    if (activeTab === 'public') fetchPublicProjects();
    if (activeTab === 'invitations') fetchInvitations();
  }, [activeTab]);

  const fetchInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const invites = await listPendingInvitations();
      setPendingInvitations(invites);
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleAcceptInvitation = async (projectId) => {
    try {
      await acceptInvitation(projectId);
      setPendingInvitations(prev => prev.filter(inv => inv.project_id !== projectId));
      // Refresh projects to show the new collaboration
      fetchProjects();
    } catch (err) {
      alert('Failed to accept invitation: ' + err.message);
    }
  };

  const filtered = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.language.toLowerCase().includes(q);
  });

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this project?')) return;
    setDeleting(id);
    try { await deleteProject(id); } catch (err) { alert(err.message); }
    setDeleting(null);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-60 bg-slate-900 border-r border-slate-800 min-h-[calc(100vh-4rem)] p-4">
          <nav className="space-y-1">
            {[
              { key: 'my-projects', icon: <FolderOpen className="w-4 h-4" />, label: 'My Projects' },
              { key: 'invitations', icon: <Users       className="w-4 h-4" />, label: 'Invitations' },
              { key: 'public',      icon: <Globe       className="w-4 h-4" />, label: 'Public'      },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === key
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {icon} <span className="font-medium">{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white font-outfit">
                  {activeTab === 'my-projects' ? 'My Projects' : 
                   activeTab === 'invitations' ? 'Pending Invitations' : 'Public Projects'}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  {activeTab === 'invitations' ? `${pendingInvitations.length} invitation${pendingInvitations.length !== 1 ? 's' : ''}` : `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {activeTab !== 'invitations' && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm w-52"
                    />
                  </div>
                )}
                {activeTab === 'my-projects' && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/40 transition-all"
                  >
                    <Plus className="w-4 h-4" /> New Project
                  </button>
                )}
              </div>
            </div>

            {/* Invitations Tab */}
            {activeTab === 'invitations' && (
              loadingInvitations ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : pendingInvitations.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="w-14 h-14 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500">No pending invitations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.project_id}
                      className="glass rounded-xl p-5 border border-cyan-500/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white font-outfit mb-1">
                            {invitation.project_name}
                          </h3>
                          <p className="text-sm text-gray-400 mb-2">
                            Invited by {invitation.invited_by_email} • Role: {invitation.role}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(invitation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptInvitation(invitation.project_id)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => {
                              // For now, just remove from UI. In future, could add decline endpoint
                              setPendingInvitations(prev => prev.filter(inv => inv.project_id !== invitation.project_id));
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Projects / Invites */}
            {activeTab === 'invitations' ? (
              loadingInvitations ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : pendingInvitations.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="w-14 h-14 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500">No pending invitations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.project_id}
                      className="glass rounded-xl p-5 border border-cyan-500/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white font-outfit mb-1">
                            {invitation.project_name}
                          </h3>
                          <p className="text-sm text-gray-400 mb-2">
                            Invited by {invitation.invited_by_email} • Role: {invitation.role}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(invitation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptInvitation(invitation.project_id)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => {
                              setPendingInvitations((prev) => prev.filter((inv) => inv.project_id !== invitation.project_id));
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : error ? (
              <p className="text-center text-red-400 py-20">{error}</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <FolderOpen className="w-14 h-14 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500">No projects found</p>
                {activeTab === 'my-projects' && (
                  <button onClick={() => setShowCreate(true)} className="mt-3 text-cyan-400 hover:text-cyan-300 text-sm">
                    Create your first project
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/editor/${project.id}`)}
                    className="glass rounded-xl p-5 card-hover cursor-pointer group relative"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{LANG_ICONS[project.language] || '📄'}</span>
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors font-outfit">
                            {project.name}
                          </h3>
                          <p className={`text-xs font-mono mt-0.5 ${LANG_COLORS[project.language] || 'text-gray-400'}`}>
                            {project.language}
                          </p>
                        </div>
                      </div>
                      {project.is_public
                        ? <Globe className="w-4 h-4 text-purple-400 shrink-0" />
                        : <Lock  className="w-4 h-4 text-green-400  shrink-0" />
                      }
                    </div>

                    {activeTab === 'my-projects' && (
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        disabled={deleting === project.id}
                        className="absolute bottom-4 right-4 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg text-red-400 transition-all"
                      >
                        {deleting === project.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2  className="w-3.5 h-3.5" />
                        }
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </div>
  );
};

export default Dashboard;