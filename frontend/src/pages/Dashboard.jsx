import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, Globe, Plus, Search, Lock,
  Trash2, Loader2, Copy
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

const ROLE_STYLES = {
  owner: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  editor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  viewer: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { projects, loading, error, fetchProjects, fetchPublicProjects, deleteProject, copyPublicProject } = useProjects();
  const [activeTab, setActiveTab] = useState('my-projects');
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [copying, setCopying] = useState(null);

  useEffect(() => {
    if (activeTab === 'my-projects') fetchProjects();
    if (activeTab === 'public') fetchPublicProjects();
  }, [activeTab]);

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

  const handleCopyPublicProject = async (e, id) => {
    e.stopPropagation();
    setCopying(id);
    try {
      const copied = await copyPublicProject(id);
      navigate(`/editor/${copied.id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setCopying(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="flex">
        <aside className="w-60 bg-slate-900 border-r border-slate-800 min-h-[calc(100vh-4rem)] p-4">
          <nav className="space-y-1">
            {[
              { key: 'my-projects', icon: <FolderOpen className="w-4 h-4" />, label: 'My Projects' },
              { key: 'public', icon: <Globe className="w-4 h-4" />, label: 'Public' },
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

        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white font-outfit">
                  {activeTab === 'my-projects' ? 'My Projects' : 'Public Projects'}
                </h1>
                <p className="text-gray-500 text-sm mt-1">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm w-52"
                  />
                </div>
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

            {loading ? (
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
                {filtered.map((project) => {
                  const role = project.access_role || 'owner';
                  const isOwner = activeTab !== 'my-projects' || role === 'owner';

                  return (
                    <div
                      key={project.id}
                      onClick={() => {
                        if (activeTab === 'my-projects') navigate(`/editor/${project.id}`);
                      }}
                      className="glass rounded-xl p-5 card-hover cursor-pointer group relative"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl">{LANG_ICONS[project.language] || '📄'}</span>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors font-outfit truncate">
                              {project.name}
                            </h3>
                            <p className={`text-xs font-mono mt-0.5 ${LANG_COLORS[project.language] || 'text-gray-400'}`}>
                              {project.language}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {activeTab === 'my-projects' && (
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${ROLE_STYLES[role] || ROLE_STYLES.viewer}`}>
                              {role === 'owner' ? 'Owned' : role}
                            </span>
                          )}
                          {project.is_public
                            ? <Globe className="w-4 h-4 text-purple-400 shrink-0" />
                            : <Lock className="w-4 h-4 text-green-400 shrink-0" />
                          }
                        </div>
                      </div>

                      {activeTab === 'my-projects' && !isOwner && (
                        <p className="text-xs text-gray-500">
                          Shared with you as {role === 'editor' ? 'an editor' : 'a viewer'}.
                        </p>
                      )}

                      {activeTab === 'public' && (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-500">
                            Make a private copy to edit this project without changing the owner's version.
                          </p>
                          <button
                            onClick={(e) => handleCopyPublicProject(e, project.id)}
                            disabled={copying === project.id}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                          >
                            {copying === project.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Copy className="w-4 h-4" />
                            }
                            {copying === project.id ? 'Adding...' : 'Add to my projects'}
                          </button>
                        </div>
                      )}

                      {activeTab === 'my-projects' && isOwner && (
                        <button
                          onClick={(e) => handleDelete(e, project.id)}
                          disabled={deleting === project.id}
                          className="absolute bottom-4 right-4 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg text-red-400 transition-all"
                        >
                          {deleting === project.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                    </div>
                  );
                })}
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
