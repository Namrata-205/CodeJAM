import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code2, Plus, FolderOpen, Users, Globe, Lock, LogOut, User, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import CreateProjectModal from '../components/CreateProjectModal';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { projects } = useProjects();
  const [activeTab, setActiveTab] = useState('my-projects');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const myProjects = projects.filter(p => true); // In production, filter by user
  const sharedProjects = projects.filter(p => p.visibility === 'private');
  const publicProjects = projects.filter(p => p.visibility === 'public');

  const getFilteredProjects = () => {
    let filtered = [];
    if (activeTab === 'my-projects') filtered = myProjects;
    if (activeTab === 'shared') filtered = sharedProjects;
    if (activeTab === 'public') filtered = publicProjects;

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.language.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 min-h-[calc(100vh-4rem)] p-4">
          <nav className="space-y-2">
            <NavItem
              icon={<FolderOpen className="w-5 h-5" />}
              label="My Projects"
              active={activeTab === 'my-projects'}
              onClick={() => setActiveTab('my-projects')}
            />
            <NavItem
              icon={<Users className="w-5 h-5" />}
              label="Shared"
              active={activeTab === 'shared'}
              onClick={() => setActiveTab('shared')}
            />
            <NavItem
              icon={<Globe className="w-5 h-5" />}
              label="Public"
              active={activeTab === 'public'}
              onClick={() => setActiveTab('public')}
            />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2 font-outfit">
                  {activeTab === 'my-projects' && 'My Projects'}
                  {activeTab === 'shared' && 'Shared Projects'}
                  {activeTab === 'public' && 'Public Projects'}
                </h1>
                <p className="text-gray-400">
                  {getFilteredProjects().length} project{getFilteredProjects().length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Search and Create */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects..."
                    className="pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors w-64"
                  />
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Project</span>
                </button>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredProjects().map((project) => (
                <ProjectCard key={project.id} project={project} onClick={() => navigate(`/editor/${project.id}`)} />
              ))}

              {getFilteredProjects().length === 0 && (
                <div className="col-span-full text-center py-20">
                  <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No projects found</p>
                  {activeTab === 'my-projects' && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 text-cyan-400 hover:text-cyan-300"
                    >
                      Create your first project
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
        active
          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
          : 'text-gray-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
};

const ProjectCard = ({ project, onClick }) => {
  const getLanguageColor = (lang) => {
    const colors = {
      Python: 'text-blue-400',
      TypeScript: 'text-blue-500',
      JavaScript: 'text-yellow-400',
      Java: 'text-orange-500',
      Go: 'text-cyan-400',
      Rust: 'text-orange-600',
      'C++': 'text-purple-500',
      C: 'text-purple-600'
    };
    return colors[lang] || 'text-gray-400';
  };

  return (
    <div
      onClick={onClick}
      className="glass rounded-xl p-6 card-hover cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{project.icon}</div>
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors font-outfit">
              {project.name}
            </h3>
            <p className={`text-sm font-mono ${getLanguageColor(project.language)}`}>
              {project.language}
            </p>
          </div>
        </div>
        {project.visibility === 'public' ? (
          <Globe className="w-5 h-5 text-purple-400" />
        ) : (
          <Lock className="w-5 h-5 text-green-400" />
        )}
      </div>
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>Updated {project.updatedAt}</span>
        <span className="px-3 py-1 rounded-full bg-slate-800 text-xs">
          {project.files?.length || 1} file{project.files?.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};

export default Dashboard;
