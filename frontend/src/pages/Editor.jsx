import React, { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Save, Share2, FilePlus, FolderPlus,
  Trash2, FileText, Folder, FolderOpen,
  ChevronRight, ChevronDown, X, Loader2,
  CheckCircle2, AlertCircle, Square, ExternalLink, CircleDot,
  Rocket
} from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import { execute as executeApi, projects as projectsApi, runtimes as runtimesApi } from '../api';
import Navbar from '../components/Navbar';
import PublishModal from '../components/PublishModal';
import ShareModal from '../components/ShareModal';

// ── Language → backend key mapping ───────────────────────────────────────────
const LANG_KEY = {
  Python: 'python', JavaScript: 'javascript', TypeScript: 'typescript',
  Java: 'java', Go: 'go', Rust: 'rust', 'C++': 'cpp', C: 'c',
};

const EXTENSION_LANGUAGE = {
  py: 'python',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  java: 'java',
  go: 'go',
  rs: 'rust',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  json: 'json',
  html: 'html',
  css: 'css',
  md: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'shell',
  env: 'shell',
};

function editorLanguageFor(file, project) {
  if (!file || file.language === '__folder__') return 'plaintext';
  if (file.language && !['text', 'plaintext'].includes(file.language)) return file.language;
  const ext = file.name?.split('.').pop()?.toLowerCase();
  return EXTENSION_LANGUAGE[ext] || LANG_KEY[project?.language] || 'plaintext';
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
    <div className={`fixed bottom-6 right-6 max-w-md px-4 py-3 rounded-lg border z-50 text-sm font-medium animate-fade-in shadow-2xl break-words ${colors[type]}`}>
      {message}
    </div>
  );
}

// ── File tree node ────────────────────────────────────────────────────────────

function FileNode({
  node,
  depth = 0,
  activeId,
  selectedFolderId,
  onSelect,
  onSelectFolder,
  onDelete,
  onNewFile,
  onNewFolder,
  canEdit,
}) {
  const [open, setOpen] = useState(true);
  const isFolder = node.language === '__folder__';
  const isActive = node.id === activeId;
  const isSelectedFolder = isFolder && node.id === selectedFolderId;

  return (
    <div>
      <div
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${
          isActive && !isFolder
            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
            : isSelectedFolder
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
            : 'text-gray-400 hover:bg-slate-800 hover:text-white'
        }`}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        onClick={() => {
          if (isFolder) {
            setOpen((o) => !o);
            onSelectFolder(node);
          } else {
            onSelect(node);
          }
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
        {canEdit && (
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
        )}
      </div>

      {isFolder && open && node.children.map((child) => (
        <FileNode
          key={child.id}
          node={child}
          depth={depth + 1}
          activeId={activeId}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
          onSelectFolder={onSelectFolder}
          onDelete={onDelete}
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
          canEdit={canEdit}
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
  const { getProject, fetchFiles, createFile, updateFileContent, deleteFile } = useProjects();

  const [project, setProject] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [flatFiles, setFlatFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [runStatus, setRunStatus] = useState('idle'); // idle | queued | running | finished | failed
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [preview, setPreview] = useState(null);
  const [startingPreview, setStartingPreview] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [outputHeight, setOutputHeight] = useState(176);

  // New-item dialog state
  const [dialog, setDialog] = useState(null); // null | { type: 'file'|'folder', parentId: string|null }

  const selectedFolder = flatFiles.find((f) => f.id === selectedFolderId && f.language === '__folder__');
  const createParentId = selectedFolder ? selectedFolder.id : null;
  const accessRole = project?.access_role || 'owner';
  const isOwner = accessRole === 'owner';
  const canEdit = accessRole === 'owner' || accessRole === 'editor';

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

  useEffect(() => {
    const proj = getProject(projectId);
    if (proj) {
      setProject(proj);
      loadFiles(proj);
    } else {
      projectsApi.get(projectId)
        .then((freshProject) => {
          setProject(freshProject);
          loadFiles(freshProject);
        })
        .catch(() => navigate('/dashboard'));
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
      });

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

  const previewUrlFor = (runtime, mode = 'full') => {
    if (!runtime?.preview_url) return null;
    if (mode === 'backend') return new URL('docs', runtime.preview_url).toString();
    return runtime.preview_url;
  };

  const handlePreview = async (mode = 'full') => {
    if (project.language !== 'react-fastapi') return;
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.title = 'Starting CodeJam preview...';
      previewWindow.document.body.innerHTML = '<p style="font-family: system-ui; padding: 24px;">Starting preview...</p>';
    }
    setStartingPreview(true);
    try {
      await saveActiveFile(false);
      const runtime = preview?.status === 'running' ? preview : await runtimesApi.start(projectId);
      if (runtime.status !== 'running' || !runtime.preview_url) {
        throw new Error(runtime.error || 'Preview could not start');
      }
      setPreview(runtime);
      const targetUrl = previewUrlFor(runtime, mode);
      if (previewWindow) {
        previewWindow.location.href = targetUrl;
      } else {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
      showToast(mode === 'backend' ? 'FastAPI docs opened in a new tab' : 'Preview opened in a new tab');
    } catch (e) {
      previewWindow?.close();
      showToast(e.message, 'error');
    } finally {
      setStartingPreview(false);
    }
  };

  const stopPreview = async () => {
    if (!preview) return;
    try {
      await runtimesApi.stop(projectId, preview.id);
      setPreview(null);
      showToast('Preview stopped');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveActiveFile = async (showSuccess = true) => {
    if (!activeFile || activeFile.language === '__folder__') return;
    if (!canEdit) {
      showToast('You have view-only access to this project', 'info');
      return;
    }
    setSaving(true);
    try {
      await updateFileContent(projectId, activeFile.id, code);
      // Update local flat list so switching files doesn't revert content
      setFlatFiles((prev) =>
        prev.map((f) => (f.id === activeFile.id ? { ...f, content: code } : f))
      );
      if (showSuccess) showToast('Saved');
    } catch (e) {
      showToast(e.message, 'error');
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => saveActiveFile(true);

  const publishToGitHub = async (data) => {
    if (!isOwner) throw new Error('Only the project owner can publish this project');
    await saveActiveFile(false);
    return projectsApi.pushToGitHub(projectId, data);
  };

  const deployToVercel = async (data) => {
    if (!isOwner) throw new Error('Only the project owner can deploy this project');
    await saveActiveFile(false);
    return projectsApi.deployToVercel(projectId, data);
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
    if (!canEdit) {
      showToast('You have view-only access to this project', 'info');
      setDialog(null);
      return;
    }
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
    if (!canEdit) {
      showToast('You have view-only access to this project', 'info');
      return;
    }
    if (!window.confirm(`Delete "${node.name}"?`)) return;
    try {
      await deleteFile(projectId, node.id);
      if (activeFile?.id === node.id) { setActiveFile(null); setCode(''); }
      if (selectedFolderId === node.id) setSelectedFolderId(null);
      await loadFiles(project);
      showToast('Deleted');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const startSidebarResize = useCallback((event) => {
    event.preventDefault();

    const onMouseMove = (moveEvent) => {
      setSidebarWidth(clamp(moveEvent.clientX, 180, 420));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  const startOutputResize = useCallback((event) => {
    event.preventDefault();

    const onMouseMove = (moveEvent) => {
      const maxHeight = Math.min(560, window.innerHeight * 0.7);
      setOutputHeight(clamp(window.innerHeight - moveEvent.clientY, 120, maxHeight));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

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
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400 font-mono">
              {project.language === 'react-fastapi' ? 'React + FastAPI workspace' : project.language}
            </p>
            <span className="px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[10px] font-semibold uppercase">
              {accessRole === 'owner' ? 'Owner' : accessRole}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !canEdit}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            title={canEdit ? 'Save file' : 'Viewers cannot save changes'}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          {project.language !== 'react-fastapi' && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-green-500/40"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? runStatus : 'Run file'}
            </button>
          )}
          {project.language === 'react-fastapi' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePreview('full')}
                disabled={startingPreview}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                title="Run the complete React + FastAPI workspace"
              >
                {startingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {startingPreview ? 'Starting...' : 'Preview full app'}
              </button>
              <button
                onClick={() => handlePreview('frontend')}
                disabled={startingPreview}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                title="Open the React frontend"
              >
                Frontend
              </button>
              <button
                onClick={() => handlePreview('backend')}
                disabled={startingPreview}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                title="Open FastAPI Swagger docs for backend testing"
              >
                Backend docs
              </button>
              {preview && (
                <button
                  onClick={stopPreview}
                  className="flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              )}
            </div>
          )}
          {preview && (
            <a
              href={preview.preview_url}
              target="_blank"
              rel="noreferrer"
              title="Open preview in a new tab"
              className="p-2 text-cyan-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => setShowPublish(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
              >
                <Rocket className="w-4 h-4" />
                Publish
              </button>
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* File explorer */}
        <aside
          className="bg-slate-900 border-r border-slate-800 flex flex-col shrink-0"
          style={{ width: `${sidebarWidth}px` }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Explorer</span>
              <span className="block text-[11px] text-gray-500 truncate">
                {selectedFolder ? `Creating in ${selectedFolder.name}` : 'Creating in root'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDialog({ type: 'file', parentId: createParentId })}
                disabled={!canEdit}
                className="p-1 hover:bg-slate-800 rounded text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed"
                title={canEdit ? 'New file' : 'Viewers cannot create files'}
              >
                <FilePlus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDialog({ type: 'folder', parentId: createParentId })}
                disabled={!canEdit}
                className="p-1 hover:bg-slate-800 rounded text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed"
                title={canEdit ? 'New folder' : 'Viewers cannot create folders'}
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
                selectedFolderId={selectedFolderId}
                onSelect={(f) => { setActiveFile(f); setCode(f.content ?? ''); setSelectedFolderId(f.parent_id ?? null); }}
                onSelectFolder={(folder) => setSelectedFolderId(folder.id)}
                onDelete={handleDelete}
                onNewFile={(parentId) => setDialog({ type: 'file', parentId })}
                onNewFolder={(parentId) => setDialog({ type: 'folder', parentId })}
                canEdit={canEdit}
              />
            ))}
            {fileTree.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-6">No files yet</p>
            )}
          </div>
        </aside>
        <div
          onMouseDown={startSidebarResize}
          className="w-1.5 bg-slate-900 hover:bg-cyan-500/40 cursor-col-resize border-r border-slate-800 transition-colors shrink-0"
          title="Resize explorer"
        />

        {/* Code + output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active file tab */}
          {activeFile && activeFile.language !== '__folder__' && (
            <div className="px-4 py-1.5 bg-slate-950 border-b border-slate-800 text-xs font-mono text-gray-400 flex items-center justify-between">
              <span>{activeFile.name}</span>
              {preview && (
                <span className="inline-flex items-center gap-1 text-cyan-300">
                  <CircleDot className="w-3 h-3" /> Preview active
                </span>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0 bg-slate-950">
            <MonacoEditor
              value={code}
              onChange={(value) => canEdit && setCode(value ?? '')}
              language={editorLanguageFor(activeFile, project)}
              theme="vs-dark"
              options={{
                readOnly: !canEdit || !activeFile || activeFile.language === '__folder__',
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'Fira Code, Consolas, Monaco, monospace',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>

          {/* Output panel */}
          <div
            className="bg-slate-900 border-t border-slate-800 flex flex-col shrink-0"
            style={{ height: `${outputHeight}px` }}
          >
            <div
              onMouseDown={startOutputResize}
              className="h-1.5 bg-slate-900 hover:bg-cyan-500/40 cursor-row-resize transition-colors shrink-0"
              title="Resize output"
            />
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
            {preview ? (
              <div className="flex-1 overflow-y-auto px-4 py-3 text-sm text-gray-300">
                <div className="flex items-center gap-2 text-cyan-300">
                  <CircleDot className="w-3.5 h-3.5" />
                  Preview is running in a separate tab.
                </div>
                <a
                  href={preview.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 mt-3 text-cyan-400 hover:text-cyan-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open preview
                </a>
              </div>
            ) : (
              <pre className="flex-1 overflow-y-auto px-4 py-3 text-sm font-mono text-green-400 whitespace-pre-wrap">
                {output || 'Run an individual file to see output here, or preview the complete workspace.'}
              </pre>
            )}
          </div>
        </div>
      </div>

      {showShare && <ShareModal project={project} onClose={() => setShowShare(false)} />}

      {showPublish && (
        <PublishModal
          project={project}
          onClose={() => setShowPublish(false)}
          onPublishGitHub={publishToGitHub}
          onDeployVercel={deployToVercel}
        />
      )}

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
