import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { 
  Sparkles, Zap, Shield, Globe, ArrowRight, 
  Code2, Palette, BarChart2, Database, Smartphone, 
  Brain, Target, TrendingUp, Star
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';

const categories = [
  { icon: Code2, label: 'Engineering', count: '2.4k jobs' },
  { icon: Palette, label: 'Design', count: '890 jobs' },
  { icon: BarChart2, label: 'Marketing', count: '1.2k jobs' },
  { icon: Database, label: 'Data Science', count: '760 jobs' },
  { icon: Smartphone, label: 'Mobile Dev', count: '430 jobs' },
  { icon: Brain, label: 'AI / ML', count: '580 jobs' },
];

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Matching',
    description: 'Our Groq AI analyzes your CV and instantly tells you if you qualify — before you waste time applying.',
  },
  {
    icon: Globe,
    title: 'Live Job Feed',
    description: 'Hundreds of remote jobs pulled every 6 hours from RemoteOK, combined with direct employer postings.',
  },
  {
    icon: Target,
    title: 'Skill Gap Analysis',
    description: 'Get clear, actionable feedback on exactly what skills you need to land your dream role.',
  },
  {
    icon: Zap,
    title: 'Instant CV Analysis',
    description: 'Upload your PDF and AI extracts your skills in seconds — no manual tagging required.',
  },
];

export default function Homepage() {
  const { isSignedIn } = useUser();

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 text-center relative">
          <div className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/20 rounded-full px-4 py-1.5 text-sm text-gold-400 mb-8 animate-fade-in">
            <Sparkles size={14} />
            AI-powered job matching is here
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-dark-50 leading-tight mb-6 animate-slide-up">
            Find Your Perfect Role
            <br />
            <span className="gold-shimmer">With AI Precision</span>
          </h1>

          <p className="text-lg sm:text-xl text-dark-300 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Upload your CV, let AI analyze your skills, and get instant qualification feedback before applying. Stop guessing — start matching.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {isSignedIn ? (
              <Link to="/dashboard" className="btn-primary text-base px-8 py-4">
                View Jobs
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link to="/role-select" className="btn-primary text-base px-8 py-4">
                  Get Started Free
                  <ArrowRight size={18} />
                </Link>
                <Link to="/role-select?mode=employer" className="btn-secondary text-base px-8 py-4">
                  I'm Hiring
                </Link>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {[
              { value: '10k+', label: 'Active Jobs' },
              { value: '98%', label: 'Match Accuracy' },
              { value: '6hr', label: 'Job Refresh Rate' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-display font-bold text-gold-400">{value}</div>
                <div className="text-dark-400 text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 border-t border-dark-800">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="section-title text-center mb-3">Browse by Category</h2>
          <p className="section-subtitle text-center mb-10">Thousands of opportunities across every discipline</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map(({ icon: Icon, label, count }) => (
              <Link
                key={label}
                to={isSignedIn ? '/dashboard' : '/role-select'}
                className="card-hover text-center py-6 group"
              >
                <div className="w-12 h-12 bg-dark-700 group-hover:bg-gold-500/15 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors">
                  <Icon size={22} className="text-dark-400 group-hover:text-gold-400 transition-colors" />
                </div>
                <div className="font-medium text-dark-200 text-sm mb-1">{label}</div>
                <div className="text-dark-500 text-xs">{count}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-dark-800/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="section-title mb-3">Why JobMatch AI?</h2>
            <p className="section-subtitle">We've reimagined job hunting from the ground up</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card group hover:border-gold-500/30 transition-all">
                <div className="w-11 h-11 bg-gold-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gold-500/20 transition-colors">
                  <Icon size={20} className="text-gold-400" />
                </div>
                <h3 className="font-display font-semibold text-dark-100 mb-2">{title}</h3>
                <p className="text-dark-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="card border-gold-500/20 bg-gradient-to-br from-dark-800 to-dark-900 p-12">
            <div className="w-16 h-16 bg-gold-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-gold">
              <TrendingUp size={28} className="text-dark-900" />
            </div>
            <h2 className="text-4xl font-display font-bold text-dark-50 mb-4">
              Ready to Land Your Dream Job?
            </h2>
            <p className="text-dark-300 mb-8">
              Join thousands of professionals who use AI to cut through the noise and apply with confidence.
            </p>
            <Link to={isSignedIn ? '/dashboard' : '/role-select'} className="btn-primary text-base px-8 py-4">
              {isSignedIn ? 'Browse Jobs' : 'Start For Free'}
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-dark-300">
              Job<span className="text-gold-400">Match</span> AI
            </span>
          </div>
          <p className="text-dark-500 text-sm">
            © 2024 JobMatch AI. Powered by Groq & RemoteOK.
          </p>
        </div>
      </footer>
    </div>
  );
}
