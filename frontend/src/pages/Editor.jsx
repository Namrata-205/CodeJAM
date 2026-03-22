import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Save, Share2, FilePlus, FolderPlus,
  Trash2, FileText, Folder, FolderOpen,
  ChevronRight, ChevronDown, X, Loader2,
  CheckCircle2, AlertCircle, Keyboard
} from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import { execute as executeApi } from '../api';
import Navbar from '../components/Navbar';
import ShareModal from '../components/ShareModal';

// ── Language → backend key mapping ───────────────────────────────────────────
const LANG_KEY = {
  Python: 'python', JavaScript: 'javascript', TypeScript: 'typescript',
  Java: 'java', Go: 'go', Rust: 'rust', 'C++': 'cpp', C: 'c',
};

// ── File tree helpers ─────────────────────────────────────────────────────────

function buildTree(flatFiles) {
  // Files with no parent_id are roots; others are children
  const byId = {};
  flatFiles.forEach((f) => { byId[f.id] = { ...f, children: [] }; });
  const roots = [];
  flatFiles.forEach((f) => {
    if (f.parent_id && byId[f.parent_id]) {
      byId[f.parent_id].children.push(byId[f.id]);
    } else {
      roots.push(byId[f.id]);
    }
  });
  return roots;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  const colors = {
    success: 'bg-green-500/20 border-green-500 text-green-400',
    error:   'bg-red-500/20   border-red-500   text-red-400',
    info:    'bg-cyan-500/20  border-cyan-500  text-cyan-400',
  };

  return (
    <div className={`fixed top-20 right-6 px-4 py-3 rounded-lg border z-50 text-sm font-medium animate-fade-in ${colors[type]}`}>
      {message}
    </div>
  );
}

// ── File tree node ────────────────────────────────────────────────────────────

function FileNode({ node, depth = 0, activeId, onSelect, onDelete, onNewFile, onNewFolder }) {
  const [open, setOpen] = useState(true);
  const isFolder = node.language === '__folder__';
  const isActive = node.id === activeId;

  return (
    <div>
      <div
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${
          isActive && !isFolder
            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
            : 'text-gray-400 hover:bg-slate-800 hover:text-white'
        }`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        onClick={() => {
          if (isFolder) setOpen((o) => !o);
          else onSelect(node);
        }}
      >
        {isFolder ? (
          <>
            {open ? <FolderOpen className="w-4 h-4 shrink-0 text-amber-400" /> : <Folder className="w-4 h-4 shrink-0 text-amber-400" />}
            {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
          </>
        ) : (
          <FileText className="w-4 h-4 shrink-0" />
        )}
        <span className="flex-1 truncate font-mono">{node.name}</span>

        {/* Context actions */}
        <span className="hidden group-hover:flex items-center gap-1">
          {isFolder && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onNewFile(node.id); }}
                className="p-0.5 hover:text-cyan-400 rounded"
                title="New file in folder"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNewFolder(node.id); }}
                className="p-0.5 hover:text-amber-400 rounded"
                title="New subfolder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}
            className="p-0.5 hover:text-red-400 rounded"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </span>
      </div>

      {isFolder && open && node.children.map((child) => (
        <FileNode
          key={child.id}
          node={child}
          depth={depth + 1}
          activeId={activeId}
          onSelect={onSelect}
          onDelete={onDelete}
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
        />
      ))}
    </div>
  );
}

// ── New item dialog ───────────────────────────────────────────────────────────

function NewItemDialog({ type, onConfirm, onCancel }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {type === 'folder' ? 'New Folder' : 'New File'}
          </h3>
          <button onClick={onCancel} className="p-1 hover:bg-slate-800 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(name); if (e.key === 'Escape') onCancel(); }}
          placeholder={type === 'folder' ? 'folder-name' : 'filename.ext'}
          className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono text-sm mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm">Cancel</button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-sm font-semibold"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────────

const Editor = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProject, fetchProjects, fetchFiles, createFile, updateFileContent, deleteFile } = useProjects();

  const [project, setProject] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [flatFiles, setFlatFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [code, setCode] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [output, setOutput] = useState('');
  const [runStatus, setRunStatus] = useState('idle'); // idle | queued | running | finished | failed
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showStdin, setShowStdin] = useState(false);
  const [stdin, setStdin] = useState('');
  const [showShare, setShowShare] = useState(false);

  // New-item dialog state
  const [dialog, setDialog] = useState(null); // null | { type: 'file'|'folder', parentId: string|null }

  // ── Load project + files ──────────────────────────────────────────────────

  const loadFiles = useCallback(async (proj) => {
    try {
      const data = await fetchFiles(proj.id);
      setFlatFiles(data);
      setFileTree(buildTree(data));
      if (data.length > 0 && !activeFile) {
        const first = data.find((f) => f.language !== '__folder__') || data[0];
        setActiveFile(first);
        setCode(first.content ?? '');
      }
    } catch {
      showToast('Failed to load files', 'error');
    }
  }, [fetchFiles, activeFile]);

  // ── Real-time sync poll (every 2.5s)
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!project || !activeFile || isDirty) return;
      try {
        const remoteFiles = await fetchFiles(project.id);
        const remoteFile = remoteFiles.find((f) => f.id === activeFile.id);
        if (remoteFile && remoteFile.content != null && remoteFile.content !== code) {
          setCode(remoteFile.content);
          setFlatFiles(remoteFiles);
          setFileTree(buildTree(remoteFiles));
          setIsDirty(false);
          showToast('Project updated by collaborator', 'info');
        }
      } catch {
        // silent miss
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [project, activeFile, isDirty, code, fetchFiles]);

  useEffect(() => {
    // Try from context cache first; if not there, fetch projects
    let proj = getProject(projectId);
    if (proj) {
      setProject(proj);
      loadFiles(proj);
    } else {
      fetchProjects().then(() => {
        proj = getProject(projectId);
        if (!proj) { navigate('/dashboard'); return; }
        setProject(proj);
        loadFiles(proj);
      });
    }
  }, [projectId]); // eslint-disable-line

  // ── Toast helper ──────────────────────────────────────────────────────────

  const showToast = (message, type = 'success') => setToast({ message, type });

  // ── Run code ──────────────────────────────────────────────────────────────

  const handleRun = async () => {
    if (!activeFile || activeFile.language === '__folder__') return;
    setRunStatus('queued');
    setOutput('');

    const langKey = LANG_KEY[project.language] || project.language.toLowerCase();

    try {
      const result = await executeApi.run(langKey, code, (status) => {
        setRunStatus(status);
        if (status === 'queued') setOutput('Job queued...');
        if (status === 'running') setOutput('Running...');
      }, stdin);

      setRunStatus(result.status);
      const lines = [];
      if (result.output) lines.push(result.output);
      if (result.error)  lines.push(`[error]\n${result.error}`);
      if (result.timed_out) lines.push('[Execution timed out]');
      setOutput(lines.join('\n') || '(no output)');
    } catch (e) {
      setRunStatus('failed');
      setOutput(`Error: ${e.message}`);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!activeFile || activeFile.language === '__folder__') return;
    setSaving(true);
    try {
      await updateFileContent(projectId, activeFile.id, code);
      setIsDirty(false);
      // Update local flat list so switching files doesn't revert content
      setFlatFiles((prev) =>
        prev.map((f) => (f.id === activeFile.id ? { ...f, content: code } : f))
      );
      showToast('Saved');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd+S shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [code, activeFile]); // eslint-disable-line

  // ── Create file / folder ──────────────────────────────────────────────────

  const handleCreate = async (name) => {
    const { type, parentId } = dialog;
    setDialog(null);
    try {
      if (type === 'folder') {
        await createFile(projectId, {
          name,
          language: '__folder__',
          content: '',
          parent_id: parentId,
        });
      } else {
        const ext = name.split('.').pop() || '';
        const langMap = { py: 'python', js: 'javascript', ts: 'typescript', java: 'java', go: 'go', rs: 'rust', cpp: 'cpp', c: 'c' };
        await createFile(projectId, {
          name,
          language: langMap[ext] || 'text',
          content: '',
          parent_id: parentId,
        });
      }
      await loadFiles(project);
      showToast(`${type === 'folder' ? 'Folder' : 'File'} created`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // ── Delete file/folder ────────────────────────────────────────────────────

  const handleDelete = async (node) => {
    if (!window.confirm(`Delete "${node.name}"?`)) return;
    try {
      await deleteFile(projectId, node.id);
      if (activeFile?.id === node.id) { setActiveFile(null); setCode(''); }
      await loadFiles(project);
      showToast('Deleted');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const isRunning = runStatus === 'queued' || runStatus === 'running';

  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      <Navbar />

      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}

      {/* Editor header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white font-outfit">{project.name}</h1>
          <p className="text-xs text-gray-400 font-mono">{project.language}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-green-500/40"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? runStatus : 'Run'}
          </button>
          <button
            onClick={() => setShowStdin(!showStdin)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              showStdin ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-800 hover:bg-slate-700'
            } text-white`}
          >
            <Keyboard className="w-4 h-4" />
            Input
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* File explorer */}
        <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Explorer</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDialog({ type: 'file', parentId: null })}
                className="p-1 hover:bg-slate-800 rounded text-cyan-400"
                title="New file"
              >
                <FilePlus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDialog({ type: 'folder', parentId: null })}
                className="p-1 hover:bg-slate-800 rounded text-amber-400"
                title="New folder"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {fileTree.map((node) => (
              <FileNode
                key={node.id}
                node={node}
                activeId={activeFile?.id}
                onSelect={(f) => { setActiveFile(f); setCode(f.content ?? ''); }}
                onDelete={handleDelete}
                onNewFile={(parentId) => setDialog({ type: 'file', parentId })}
                onNewFolder={(parentId) => setDialog({ type: 'folder', parentId })}
              />
            ))}
            {fileTree.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-6">No files yet</p>
            )}
          </div>
        </aside>

        {/* Code + output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active file tab */}
          {activeFile && activeFile.language !== '__folder__' && (
            <div className="px-4 py-1.5 bg-slate-950 border-b border-slate-800 text-xs font-mono text-gray-400">
              {activeFile.name}
            </div>
          )}

          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setIsDirty(true);
            }}
            className="flex-1 w-full bg-slate-950 text-white font-mono text-sm p-4 resize-none focus:outline-none"
            spellCheck={false}
            placeholder={activeFile ? 'Start coding...' : 'Select or create a file'}
            disabled={!activeFile || activeFile.language === '__folder__'}
          />

          {/* Stdin panel */}
          {showStdin && (
            <div className="h-24 bg-slate-900 border-t border-slate-800 flex flex-col shrink-0">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Input</span>
                <button onClick={() => setShowStdin(false)} className="ml-auto text-xs text-gray-500 hover:text-gray-300">
                  Hide
                </button>
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                className="flex-1 w-full bg-slate-900 text-white font-mono text-sm p-4 resize-none focus:outline-none"
                placeholder="Enter input data here..."
                spellCheck={false}
              />
            </div>
          )}

          {/* Output panel */}
          <div className="h-44 bg-slate-900 border-t border-slate-800 flex flex-col shrink-0">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Output</span>
              {runStatus === 'finished' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
              {runStatus === 'failed'   && <AlertCircle  className="w-3.5 h-3.5 text-red-400" />}
              {isRunning                && <Loader2      className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
              {output && (
                <button onClick={() => setOutput('')} className="ml-auto text-xs text-gray-500 hover:text-gray-300">
                  Clear
                </button>
              )}
            </div>
            <pre className="flex-1 overflow-y-auto px-4 py-3 text-sm font-mono text-green-400 whitespace-pre-wrap">
              {output || 'Run your code to see output here...'}
            </pre>
          </div>
        </div>
      </div>

      {showShare && <ShareModal project={project} onClose={() => setShowShare(false)} />}

      {dialog && (
        <NewItemDialog
          type={dialog.type}
          onConfirm={handleCreate}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
};

export default Editor;