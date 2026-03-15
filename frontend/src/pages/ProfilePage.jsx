import React, { useState } from 'react';
import { User, Clock, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const { projects } = useProjects();
  const navigate = useNavigate();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const recentProjects = projects.slice(0, 3);

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setMessage('Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }
    // Simulate password update
    setMessage('Password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Profile Header */}
        <div className="glass rounded-2xl p-8 mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-3xl font-bold text-white">
              {user?.name?.charAt(0) || 'J'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1 font-outfit">{user?.name || 'Jane Developer'}</h1>
              <p className="text-gray-400">{user?.email || 'dev@codejam.io'}</p>
              <div className="flex items-center space-x-2 mt-2">
                <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-semibold">
                  {projects.length} projects
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Recently Edited */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Clock className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white font-outfit">Recently Edited</h2>
            </div>
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/editor/${project.id}`)}
                  className="flex items-center space-x-3 p-3 bg-slate-900/50 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  <span className="text-2xl">{project.icon}</span>
                  <div className="flex-1">
                    <p className="text-white font-medium">{project.name}</p>
                    <p className="text-sm text-gray-400">{project.updatedAt}</p>
                  </div>
                </div>
              ))}
              {recentProjects.length === 0 && (
                <p className="text-gray-500 text-center py-8">No recent projects</p>
              )}
            </div>
          </div>

          {/* Change Password */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Lock className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white font-outfit">Change Password</h2>
            </div>

            {message && (
              <div className={`mb-4 px-4 py-3 rounded-lg ${
                message.includes('success')
                  ? 'bg-green-500/10 border border-green-500/50 text-green-400'
                  : 'bg-red-500/10 border border-red-500/50 text-red-400'
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
