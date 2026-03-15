import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Save,
  Share2,
  Eye,
  FileText,
  FolderPlus,
  FilePlus,
  Trash2,
  ChevronRight,
  ChevronDown,
  X
} from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import Navbar from '../components/Navbar';
import ShareModal from '../components/ShareModal';

const Editor = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProject, updateFile, addFile, deleteFile } = useProjects();
  
  const [project, setProject] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  useEffect(() => {
    const proj = getProject(projectId);
    if (!proj) {
      navigate('/dashboard');
      return;
    }
    setProject(proj);
    if (proj.files && proj.files.length > 0) {
      setActiveFile(proj.files[0]);
      setCode(proj.files[0].content);
    }
  }, [projectId]);

  const handleRunCode = () => {
    setIsRunning(true);
    setOutput('Running code...\n');
    
    // Simulate code execution
    setTimeout(() => {
      if (project.language === 'Python') {
        setOutput('Hello, World!\nCode executed successfully!');
      } else if (project.language === 'JavaScript' || project.language === 'TypeScript') {
        setOutput('Hello, World!\nCode executed successfully!');
      } else {
        setOutput('Code executed successfully!');
      }
      setIsRunning(false);
    }, 1000);
  };

  const handleSave = () => {
    if (activeFile) {
      updateFile(projectId, activeFile.id, code);
      // Show save notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-8 bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg z-50 animate-slide-down';
      notification.textContent = 'File saved successfully!';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
    }
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      addFile(projectId, newFileName.trim());
      setNewFileName('');
      setShowNewFileDialog(false);
      // Refresh project
      const updatedProject = getProject(projectId);
      setProject(updatedProject);
    }
  };

  const handleDeleteFile = (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      deleteFile(projectId, fileId);
      const updatedProject = getProject(projectId);
      setProject(updatedProject);
      if (updatedProject.files.length > 0) {
        setActiveFile(updatedProject.files[0]);
        setCode(updatedProject.files[0].content);
      } else {
        setActiveFile(null);
        setCode('');
      }
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      <Navbar />

      {/* Editor Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-2xl">{project.icon}</span>
          <div>
            <h1 className="text-xl font-bold text-white font-outfit">{project.name}</h1>
            <p className="text-sm text-gray-400 font-mono">{project.language}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg hover:shadow-green-500/50 text-white rounded-lg transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
          <button className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-semibold">{project.visibility}</span>
          </button>
        </div>
      </div>

      {/* Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Files</h2>
              <button
                onClick={() => setShowNewFileDialog(true)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-cyan-400"
              >
                <FilePlus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {project.files?.map((file) => (
                <div
                  key={file.id}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeFile?.id === file.id
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-gray-400 hover:bg-slate-800 hover:text-white'
                  }`}
                  onClick={() => {
                    setActiveFile(file);
                    setCode(file.content);
                  }}
                >
                  <div className="flex items-center space-x-2 flex-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-mono truncate">{file.name}</span>
                  </div>
                  {project.files.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-slate-950 p-4 overflow-hidden">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full bg-slate-900 text-white font-mono text-sm p-4 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 resize-none"
              spellCheck={false}
              placeholder="Start coding..."
            />
          </div>

          {/* Output Panel */}
          <div className="h-48 bg-slate-900 border-t border-slate-800 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Output</h3>
            </div>
            <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
              {output || 'Run your code to see output...'}
            </pre>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          project={project}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Create New File</h3>
              <button
                onClick={() => setShowNewFileDialog(false)}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFile()}
              placeholder="filename.ext"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 mb-4"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowNewFileDialog(false)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
