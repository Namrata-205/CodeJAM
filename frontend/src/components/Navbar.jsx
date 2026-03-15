import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code2, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center space-x-3">
          <Code2 className="w-8 h-8 text-cyan-400" />
          <span className="text-2xl font-bold">
            <span className="text-white font-outfit">Code</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-outfit">JAM</span>
          </span>
        </Link>

        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard"
            className="px-4 py-2 text-white hover:text-cyan-400 transition-colors font-medium"
          >
            My Projects
          </Link>
          <Link
            to="/dashboard"
            className="px-4 py-2 text-white hover:text-cyan-400 transition-colors font-medium"
          >
            Public Projects
          </Link>
          <Link
            to="/profile"
            className="px-4 py-2 text-white hover:text-cyan-400 transition-colors font-medium"
          >
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
