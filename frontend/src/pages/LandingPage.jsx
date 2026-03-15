import React from 'react';
import { Link } from 'react-router-dom';
import { Code2, Zap, Users, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-mesh opacity-30"></div>
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="px-6 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Code2 className="w-8 h-8 text-cyan-400" />
              <span className="text-2xl font-bold">
                <span className="text-white font-outfit">Code</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-outfit">JAM</span>
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="px-6 py-2.5 text-white hover:text-cyan-400 transition-colors font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all font-medium"
              >
                Register
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="px-6 pt-20 pb-32">
          <div className="max-w-7xl mx-auto text-center">
            <div className="animate-fade-in">
              <h1 className="text-6xl md:text-7xl font-bold mb-6 font-outfit">
                <span className="text-white">Run, Share & Collaborate</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                  on Code Instantly
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                An online code playground supporting multiple languages with real-time
                execution and collaboration. Build, test, and share your code with the world.
              </p>
              <div className="flex justify-center space-x-4">
                <Link
                  to="/register"
                  className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-lg font-semibold hover:shadow-2xl hover:shadow-cyan-500/50 transition-all flex items-center space-x-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 border-2 border-cyan-400/30 text-white rounded-lg text-lg font-semibold hover:border-cyan-400 hover:bg-cyan-400/10 transition-all"
                >
                  Explore Projects
                </Link>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 mt-32 animate-slide-up">
              <FeatureCard
                icon={<Zap className="w-8 h-8" />}
                title="Instant Execution"
                description="Run your code instantly with our powerful execution engine. No setup required."
                delay="0s"
              />
              <FeatureCard
                icon={<Users className="w-8 h-8" />}
                title="Real-time Collaboration"
                description="Work together with your team in real-time. Share and collaborate effortlessly."
                delay="0.1s"
              />
              <FeatureCard
                icon={<Code2 className="w-8 h-8" />}
                title="Multi-language Support"
                description="Support for Python, JavaScript, TypeScript, Java, Go, Rust, and more."
                delay="0.2s"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description, delay }) => {
  return (
    <div
      className="glass rounded-2xl p-8 card-hover"
      style={{ animationDelay: delay }}
    >
      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mb-6 mx-auto text-cyan-400">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white font-outfit">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
};

export default LandingPage;
