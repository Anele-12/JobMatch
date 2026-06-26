import { Link, useLocation } from 'react-router-dom';
import { useUser, UserButton, SignInButton } from '@clerk/clerk-react';
import { Briefcase, FileText, PlusCircle, LayoutDashboard, Menu, X, User, Bookmark, Search } from 'lucide-react';
import { useState } from 'react';
import { useProfile } from '../../hooks/useProfile';

const Logo = () => (
  <Link to="/" className="flex items-center gap-2.5 group">
    <div className="w-8 h-8 bg-gold-gradient rounded-lg flex items-center justify-center shadow-gold">
      <Briefcase size={16} className="text-dark-900" />
    </div>
    <span className="font-display font-bold text-lg">
      <span className="text-dark-50">Job</span>
      <span className="text-gold-400">Match</span>
      <span className="text-gold-400/60 text-sm"> AI</span>
    </span>
  </Link>
);

export default function Navbar() {
  const { isSignedIn } = useUser();
  const { role, profile, profileFetched } = useProfile();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const showNavLinks = isSignedIn && profileFetched && profile?.profile_completed;

  const profileLink = { to: '/profile', label: 'Profile', icon: User };

  const candidateLinks = [
    { to: '/dashboard', label: 'Jobs', icon: Briefcase },
    { to: '/jobs', label: 'Adzuna', icon: Search },
    { to: '/saved-jobs', label: 'Saved Jobs', icon: Bookmark },
    { to: '/applications', label: 'Applications', icon: FileText },
    profileLink,
  ];

  const employerLinks = [
    { to: '/employer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/employer/post-job', label: 'Post Job', icon: PlusCircle },
    profileLink,
  ];

  const links = showNavLinks
    ? (profile.role === 'employer' ? employerLinks : candidateLinks)
    : [];

  return (
    <nav className="sticky top-0 z-50 glass border-b border-dark-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Logo />

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === to
                    ? 'bg-gold-500/15 text-gold-400 border border-gold-500/20'
                    : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'w-9 h-9 ring-2 ring-gold-500/30',
                  }
                }}
              />
            ) : (
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <button className="btn-ghost text-sm py-2 px-4">Sign In</button>
                </SignInButton>
                <Link to="/role-select" className="btn-primary text-sm py-2 px-4">
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            {showNavLinks && (
              <button
                className="md:hidden p-2 text-dark-300 hover:text-dark-100"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && showNavLinks && (
          <div className="md:hidden border-t border-dark-700 py-3 animate-fade-in">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === to
                    ? 'text-gold-400 bg-gold-500/10'
                    : 'text-dark-300 hover:text-dark-100'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
