import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';

const InvitePage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { acceptCollaborationInvite } = useProjects();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const acceptInvite = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const response = await acceptCollaborationInvite(projectId);
      setStatus('success');
      setMessage(response.message || 'Invitation accepted');
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Could not accept invitation');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-white mb-2 font-outfit">Collaboration invite</h1>
        <p className="text-gray-400 text-sm mb-6">
          Accept this invitation to open the project in your workspace.
        </p>

        {message && (
          <div className={status === 'error'
            ? 'flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-sm mb-4'
            : 'flex items-start gap-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg px-3 py-2 text-sm mb-4'}
          >
            {status === 'error'
              ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{message}</span>
          </div>
        )}

        <button
          onClick={acceptInvite}
          disabled={status === 'loading' || status === 'success'}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          {status === 'success' ? 'Opening dashboard...' : 'Accept invitation'}
        </button>
        {status === 'success' && (
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full mt-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold"
          >
            Go to dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
