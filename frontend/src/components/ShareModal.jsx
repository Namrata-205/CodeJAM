import React, { useState } from 'react';
import { X, Copy, Mail, Check, Bell } from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';

const ShareModal = ({ project, onClose }) => {
  const [shareMethod, setShareMethod] = useState('link');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const { requestCollaboration } = useProjects();
  const { user } = useAuth();

  const shareLink = `https://codejam.io/project/${project.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    if (!email || !name) return;

    // Request collaboration access
    requestCollaboration(project.id, name, email);
    
    // In a real app, this would send an email
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setEmail('');
      setName('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl p-8 w-full max-w-lg animate-scale-in border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white font-outfit">Share Project</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Project Info */}
        <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{project.icon}</span>
            <div>
              <h3 className="text-white font-semibold">{project.name}</h3>
              <p className="text-sm text-gray-400">{project.language}</p>
            </div>
          </div>
        </div>

        {/* Share Method Tabs */}
        <div className="flex space-x-2 mb-6 bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setShareMethod('link')}
            className={`flex-1 px-4 py-2 rounded-md transition-all ${
              shareMethod === 'link'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Copy className="w-4 h-4 inline mr-2" />
            Copy Link
          </button>
          <button
            onClick={() => setShareMethod('email')}
            className={`flex-1 px-4 py-2 rounded-md transition-all ${
              shareMethod === 'email'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Share via Email
          </button>
        </div>

        {/* Share Content */}
        {shareMethod === 'link' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Share Link
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center space-x-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Bell className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-blue-400 font-medium mb-1">Collaboration Request</p>
                  <p className="text-sm text-gray-400">
                    When someone opens this link, you'll receive a notification to approve or deny their collaboration request.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Collaborator Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="collaborator@example.com"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Bell className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <p className="text-purple-400 font-medium mb-1">Email Invitation</p>
                  <p className="text-sm text-gray-400">
                    An email will be sent with a collaboration request. You'll be notified when they respond.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={sent}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50"
            >
              {sent ? (
                <span className="flex items-center justify-center space-x-2">
                  <Check className="w-5 h-5" />
                  <span>Invitation Sent!</span>
                </span>
              ) : (
                'Send Invitation'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
