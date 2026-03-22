import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';

const LANGUAGES = [
  { name: 'Python',     icon: '🐍', key: 'python'     },
  { name: 'JavaScript', icon: '💛', key: 'javascript' },
  { name: 'TypeScript', icon: '💎', key: 'typescript' },
  { name: 'Java',       icon: '☕', key: 'java'       },
  { name: 'Go',         icon: '🐹', key: 'go'         },
  { name: 'Rust',       icon: '🦀', key: 'rust'       },
  { name: 'C++',        icon: '⚙️', key: 'cpp'        },
  { name: 'C',          icon: '🔧', key: 'c'          },
];

const CreateProjectModal = ({ onClose }) => {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('python');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { createProject } = useProjects();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Project name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const proj = await createProject({ name: name.trim(), language, is_public: isPublic });
      onClose();
      navigate(`/editor/${proj.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white font-outfit">New Project</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 px-4 py-2.5 rounded-lg">{error}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Project name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project" autoFocus
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Language</label>
            <div className="grid grid-cols-4 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.key} type="button" onClick={() => setLanguage(lang.key)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    language === lang.key
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xl mb-1">{lang.icon}</div>
                  <div className="text-xs text-gray-400 font-mono">{lang.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Visibility</label>
            <div className="flex gap-3">
              <button
                type="button" onClick={() => setIsPublic(false)}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                  !isPublic
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
                }`}
              >
                <div className="font-semibold mb-0.5">🔒 Private</div>
                <div className="text-xs opacity-70">Only you</div>
              </button>
              <button
                type="button" onClick={() => setIsPublic(true)}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                  isPublic
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
                }`}
              >
                <div className="font-semibold mb-0.5">🌐 Public</div>
                <div className="text-xs opacity-70">Anyone can view</div>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-cyan-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;