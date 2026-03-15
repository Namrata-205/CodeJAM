import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';

const CreateProjectModal = ({ onClose }) => {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('Python');
  const [visibility, setVisibility] = useState('private');
  const { createProject } = useProjects();
  const navigate = useNavigate();

  const languages = [
    { name: 'Python', icon: '🐍' },
    { name: 'JavaScript', icon: '💛' },
    { name: 'TypeScript', icon: '💎' },
    { name: 'Java', icon: '☕' },
    { name: 'Go', icon: '🐹' },
    { name: 'Rust', icon: '🦀' },
    { name: 'C++', icon: '⚙️' },
    { name: 'C', icon: '🔧' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const selectedLang = languages.find(l => l.name === language);
    const newProject = createProject({
      name: name.trim(),
      language,
      icon: selectedLang?.icon || '📄',
      visibility
    });

    onClose();
    navigate(`/editor/${newProject.id}`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl p-8 w-full max-w-lg animate-scale-in border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white font-outfit">Create New Project</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Language
            </label>
            <div className="grid grid-cols-4 gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.name}
                  type="button"
                  onClick={() => setLanguage(lang.name)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    language === lang.name
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{lang.icon}</div>
                  <div className="text-xs text-gray-400 font-mono">{lang.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Visibility
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  visibility === 'private'
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
                }`}
              >
                <div className="font-semibold mb-1">🔒 Private</div>
                <div className="text-xs">Only you can access</div>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  visibility === 'public'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
                }`}
              >
                <div className="font-semibold mb-1">🌐 Public</div>
                <div className="text-xs">Anyone can view</div>
              </button>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
