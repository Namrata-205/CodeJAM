import React, { useEffect, useState } from 'react';
import { AlertCircle, ExternalLink, Github, Info, Loader2, Rocket, ShieldCheck, X } from 'lucide-react';
import { integrations } from '../api';

const slugify = (value) =>
  value?.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'codejam-project';

const inputClass =
  'w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500';

const providerName = (provider) => (provider === 'github' ? 'GitHub' : 'Vercel');

const PublishModal = ({ project, onClose, onPublishGitHub, onDeployVercel }) => {
  const slug = slugify(project.name);
  const [tab, setTab] = useState('github');
  const [busy, setBusy] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [connected, setConnected] = useState({ github: false, vercel: false });
  const [githubForm, setGithubForm] = useState({
    token: '',
    owner: '',
    repo: slug,
    branch: 'main',
    message: `Publish ${project.name} from CodeJam`,
    create_repo: true,
    private: false,
    save_token: true,
  });
  const [vercelForm, setVercelForm] = useState({
    token: '',
    project_name: slug,
    team_id: '',
    framework: 'vite',
    save_token: true,
  });

  useEffect(() => {
    let alive = true;
    integrations.status()
      .then((items) => {
        if (!alive) return;
        setConnected(Object.fromEntries(items.map((item) => [item.provider, item.connected])));
      })
      .catch(() => {
        if (alive) setConnected({ github: false, vercel: false });
      })
      .finally(() => {
        if (alive) setLoadingStatus(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const setGitHub = (field, value) => setGithubForm((prev) => ({ ...prev, [field]: value }));
  const setVercel = (field, value) => setVercelForm((prev) => ({ ...prev, [field]: value }));

  const forgetToken = async (provider) => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      await integrations.deleteToken(provider);
      setConnected((prev) => ({ ...prev, [provider]: false }));
      setResult({ label: `${providerName(provider)} token removed. You can paste a new token now.` });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      if (tab === 'github') {
        const response = await onPublishGitHub(githubForm);
        if (githubForm.token && githubForm.save_token) {
          setConnected((prev) => ({ ...prev, github: true }));
          setGitHub('token', '');
        }
        setResult({
          label: `Pushed ${response.files_pushed} file${response.files_pushed === 1 ? '' : 's'} to GitHub`,
          url: response.repository_url,
        });
      } else {
        const response = await onDeployVercel({
          ...vercelForm,
          team_id: vercelForm.team_id || null,
        });
        if (vercelForm.token && vercelForm.save_token) {
          setConnected((prev) => ({ ...prev, vercel: true }));
          setVercel('token', '');
        }
        setResult({
          label: 'Deployment created on Vercel',
          url: response.deployment_url,
        });
      }
    } catch (e) {
      const provider = tab === 'github' ? 'GitHub' : 'Vercel';
      setError(`${e.message}. If your saved ${provider} token expired, paste a new token below and keep "Save this token" checked to replace it.`);
    } finally {
      setBusy(false);
    }
  };

  const hasGitHubToken = Boolean(githubForm.token || connected.github);
  const hasVercelToken = Boolean(vercelForm.token || connected.vercel);
  const canSubmit =
    tab === 'github'
      ? hasGitHubToken && githubForm.owner && githubForm.repo
      : hasVercelToken && vercelForm.project_name;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white font-outfit">Publish project</h2>
            <p className="text-sm text-gray-400 mt-1">Push to GitHub or deploy to Vercel from CodeJam.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
              <p className="text-xs uppercase tracking-wide text-cyan-300 font-semibold">Step 1</p>
              <p className="text-sm text-gray-200 mt-1">Create a token from GitHub or Vercel.</p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
              <p className="text-xs uppercase tracking-wide text-cyan-300 font-semibold">Step 2</p>
              <p className="text-sm text-gray-200 mt-1">Paste it once and keep save token checked.</p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
              <p className="text-xs uppercase tracking-wide text-cyan-300 font-semibold">Expired token?</p>
              <p className="text-sm text-gray-200 mt-1">Paste a new token here. CodeJam replaces the old saved token.</p>
            </div>
          </div>

          <div className="flex gap-2 mb-5">
            <button
              onClick={() => {
                setTab('github');
                setError('');
                setResult(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                tab === 'github' ? 'bg-white text-slate-950' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
            >
              <Github className="w-4 h-4" /> GitHub
            </button>
            <button
              onClick={() => {
                setTab('vercel');
                setError('');
                setResult(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                tab === 'vercel' ? 'bg-white text-slate-950' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
            >
              <Rocket className="w-4 h-4" /> Vercel
            </button>
          </div>

          {tab === 'github' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-cyan-300 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">Need a GitHub token?</p>
                    <ol className="list-decimal list-inside text-sm text-gray-400 mt-2 space-y-1">
                      <li>Open GitHub token settings.</li>
                      <li>Create a fine-grained token named <span className="font-mono text-gray-200">CodeJam</span>.</li>
                      <li>Give repository <span className="font-semibold text-gray-200">Contents: Read and write</span> permission.</li>
                      <li>Copy the token and paste it below.</li>
                    </ol>
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-sm text-cyan-300 hover:text-cyan-200"
                    >
                      Open GitHub token page <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {connected.github && !githubForm.token && (
                <div className="px-4 py-3 bg-green-500/10 border border-green-500/30 text-green-300 rounded-lg text-sm flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    GitHub token saved. Leave the token box empty to reuse it, or paste a new one to replace it.
                  </span>
                  <button
                    onClick={() => forgetToken('github')}
                    disabled={busy}
                    className="text-xs text-green-200 hover:text-white underline shrink-0"
                  >
                    Forget token
                  </button>
                </div>
              )}

              <input
                type="password"
                value={githubForm.token}
                onChange={(e) => setGitHub('token', e.target.value)}
                placeholder={connected.github ? 'New GitHub token (optional, replaces saved token)' : 'GitHub token'}
                className={inputClass}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  value={githubForm.owner}
                  onChange={(e) => setGitHub('owner', e.target.value)}
                  placeholder="GitHub username or org"
                  className={inputClass}
                />
                <input
                  value={githubForm.repo}
                  onChange={(e) => setGitHub('repo', e.target.value)}
                  placeholder="Repository name"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  value={githubForm.branch}
                  onChange={(e) => setGitHub('branch', e.target.value)}
                  placeholder="Branch"
                  className={inputClass}
                />
                <input
                  value={githubForm.message}
                  onChange={(e) => setGitHub('message', e.target.value)}
                  placeholder="Commit message"
                  className={inputClass}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={githubForm.create_repo}
                  onChange={(e) => setGitHub('create_repo', e.target.checked)}
                />
                Create repository if needed
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={githubForm.private}
                  disabled={!githubForm.create_repo}
                  onChange={(e) => setGitHub('private', e.target.checked)}
                />
                Make new repository private
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={githubForm.save_token}
                  disabled={!githubForm.token}
                  onChange={(e) => setGitHub('save_token', e.target.checked)}
                />
                {connected.github ? 'Replace saved GitHub token with this new token' : 'Save this GitHub token for next time'}
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-cyan-300 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">Need a Vercel token?</p>
                    <ol className="list-decimal list-inside text-sm text-gray-400 mt-2 space-y-1">
                      <li>Open Vercel token settings.</li>
                      <li>Create a token named <span className="font-mono text-gray-200">CodeJam</span>.</li>
                      <li>Copy it and paste it below.</li>
                      <li>Leave Team ID empty for personal accounts.</li>
                    </ol>
                    <a
                      href="https://vercel.com/account/settings/tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-sm text-cyan-300 hover:text-cyan-200"
                    >
                      Open Vercel token page <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {connected.vercel && !vercelForm.token && (
                <div className="px-4 py-3 bg-green-500/10 border border-green-500/30 text-green-300 rounded-lg text-sm flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Vercel token saved. Leave the token box empty to reuse it, or paste a new one to replace it.
                  </span>
                  <button
                    onClick={() => forgetToken('vercel')}
                    disabled={busy}
                    className="text-xs text-green-200 hover:text-white underline shrink-0"
                  >
                    Forget token
                  </button>
                </div>
              )}

              <input
                type="password"
                value={vercelForm.token}
                onChange={(e) => setVercel('token', e.target.value)}
                placeholder={connected.vercel ? 'New Vercel token (optional, replaces saved token)' : 'Vercel token'}
                className={inputClass}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  value={vercelForm.project_name}
                  onChange={(e) => setVercel('project_name', e.target.value)}
                  placeholder="Vercel project name"
                  className={inputClass}
                />
                <input
                  value={vercelForm.team_id}
                  onChange={(e) => setVercel('team_id', e.target.value)}
                  placeholder="Team ID (optional)"
                  className={inputClass}
                />
              </div>

              <input
                value={vercelForm.framework}
                onChange={(e) => setVercel('framework', e.target.value)}
                placeholder="Framework, for example vite"
                className={inputClass}
              />

              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={vercelForm.save_token}
                  disabled={!vercelForm.token}
                  onChange={(e) => setVercel('save_token', e.target.checked)}
                />
                {connected.vercel ? 'Replace saved Vercel token with this new token' : 'Save this Vercel token for next time'}
              </label>
            </div>
          )}

          <button
            onClick={submit}
            disabled={busy || loadingStatus || !canSubmit}
            className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : tab === 'github' ? (
              <Github className="w-4 h-4" />
            ) : (
              <Rocket className="w-4 h-4" />
            )}
            {tab === 'github' ? 'Push to GitHub' : 'Deploy to Vercel'}
          </button>

          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Treat tokens like passwords. Saved tokens are encrypted on the backend, but students should never share them in screenshots, chats, commits, or public files.
            </p>
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 px-4 py-3 bg-green-500/10 border border-green-500/30 text-green-300 rounded-lg text-sm">
              <p className="font-semibold">{result.label}</p>
              {result.url && (
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-cyan-300 hover:text-cyan-200"
                >
                  Open link <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublishModal;
