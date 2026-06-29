import React, { useState } from 'react';
import { Layers3, Loader2, Lock, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useProjects } from '../contexts/ProjectContext';

const CreateProjectModal = ({ onClose }) => {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { createProject } = useProjects();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('A workspace name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const workspace = await createProject({
        name: name.trim(),
        language: 'react-fastapi',
        is_public: isPublic,
        template: 'react-fastapi',
      });
      onClose();
      navigate(`/editor/${workspace.id}`);
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white font-outfit">Create workspace</h2>
            <p className="text-sm text-gray-400 mt-1">Start a full-stack project with no local setup.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded" aria-label="Close">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 px-4 py-2.5 rounded">
              {error}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="workspace-name">
              Workspace name
            </label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="team-dashboard"
              autoFocus
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-300 mb-2">Starter</span>
            <div className="border border-cyan-500/70 bg-cyan-500/10 p-4 rounded">
              <div className="flex items-start gap-3">
                <span className="p-2 bg-cyan-500/20 text-cyan-300 rounded">
                  <Layers3 className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-white font-semibold">React + FastAPI</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Includes a Vite React frontend, FastAPI API, and a simple health check.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-300 mb-2">Visibility</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`p-3 rounded border text-sm transition-colors ${
                  !isPublic
                    ? 'border-green-500 bg-green-500/10 text-green-300'
                    : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
                }`}
              >
                <span className="flex justify-center items-center gap-1.5 font-semibold"><Lock className="w-3.5 h-3.5" /> Private</span>
                <span className="block text-xs opacity-70 mt-1">Invite collaborators</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`p-3 rounded border text-sm transition-colors ${
                  isPublic
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                    : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
                }`}
              >
                <span className="flex justify-center items-center gap-1.5 font-semibold"><Users className="w-3.5 h-3.5" /> Public</span>
                <span className="block text-xs opacity-70 mt-1">Anyone can view</span>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
