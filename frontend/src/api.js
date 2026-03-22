/**
 * src/api.js
 * Central API client. All requests go through here.
 * Base URL is read from VITE_API_URL env var (default: http://localhost:8000).
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8004';

// ── Token storage ─────────────────────────────────────────────────────────────

export const getToken = () => localStorage.getItem('codejam_token');
export const setToken = (t) => localStorage.setItem('codejam_token', t);
export const clearToken = () => localStorage.removeItem('codejam_token');

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const init = { method, headers };

  if (form) {
    // application/x-www-form-urlencoded  (used by /auth/login)
    init.body = new URLSearchParams(form);
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, init);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(err.detail || 'Request failed'), { status: res.status, data: err });
  }

  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', form: { username: email, password } }),
  register: (email, password) =>
    request('/users/', { method: 'POST', body: { email, password } }),
  me: () => request('/users/me'),
};

// ── Projects ──────────────────────────────────────────────────────────────────

export const projects = {
  list: () => request('/projects/'),
  listPublic: () => request('/projects/public'),
  get: (id) => request(`/projects/${id}`),
  create: (data) => request('/projects/', { method: 'POST', body: data }),
  updateMeta: (id, data) => request(`/projects/${id}`, { method: 'PATCH', body: data }),
  updateCode: (id, source_code) => request(`/projects/${id}/code`, { method: 'PUT', body: { source_code } }),
  delete: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  generateShareLink: (id) => request(`/projects/${id}/share`, { method: 'POST' }),
  revokeShareLink: (id) => request(`/projects/${id}/share`, { method: 'DELETE' }),
  getByShareId: (shareId) => request(`/projects/share/${shareId}`),
};

// ── Files ─────────────────────────────────────────────────────────────────────

export const files = {
  list: (projectId) => request(`/projects/${projectId}/files`),
  get: (projectId, fileId) => request(`/projects/${projectId}/files/${fileId}`),
  create: (projectId, data) => request(`/projects/${projectId}/files`, { method: 'POST', body: data }),
  updateContent: (projectId, fileId, content) =>
    request(`/projects/${projectId}/files/${fileId}`, { method: 'PUT', body: { content } }),
  rename: (projectId, fileId, name) =>
    request(`/projects/${projectId}/files/${fileId}`, { method: 'PATCH', body: { name } }),
  delete: (projectId, fileId) =>
    request(`/projects/${projectId}/files/${fileId}`, { method: 'DELETE' }),
};

// ── Collaboration ─────────────────────────────────────────────────────────────

export const collaboration = {
  list: (projectId) => request(`/projects/${projectId}/collaborators`),
  invite: (projectId, email, role) =>
    request(`/projects/${projectId}/collaborators`, { method: 'POST', body: { email, role } }),
  accept: (projectId) =>
    request(`/projects/${projectId}/collaborators/accept`, { method: 'POST' }),
  changeRole: (projectId, userId, role) =>
    request(`/projects/${projectId}/collaborators/${userId}`, { method: 'PATCH', body: { role } }),
  remove: (projectId, userId) =>
    request(`/projects/${projectId}/collaborators/${userId}`, { method: 'DELETE' }),
  listPending: () => request('/collaborators/invitations'),
};

// ── Code execution ────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 800;
const POLL_TIMEOUT_MS = 60_000;

export const execute = {
  submit: (language, source_code, stdin = '') =>
    request('/execute/', { method: 'POST', body: { language, source_code, stdin } }),

  poll: (jobId) => request(`/execute/${jobId}`),

  /**
   * Submit code and poll until finished or timed out.
   * Returns { output, error, timed_out } when done.
   * Calls onStatus(status) on each poll tick.
   */
  run: async (language, source_code, onStatus, stdin = '') => {
    const { job_id } = await execute.submit(language, source_code, stdin);
    onStatus?.('queued');

    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const result = await execute.poll(job_id);
      onStatus?.(result.status);

      if (result.status === 'finished') return result;
      if (result.status === 'failed') return result;
    }

    return { status: 'failed', error: 'Timed out waiting for result' };
  },
};