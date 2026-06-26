import { SignIn, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import Navbar from '../components/layout/Navbar';

export default function SignInPage() {
  const { isSignedIn } = useUser();
  const { profile, role, profileFetched } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignedIn || !profileFetched) return;

    if (profile?.profile_completed) {
      navigate(role === 'employer' ? '/employer/dashboard' : '/dashboard', { replace: true });
    } else {
      navigate('/profile-setup', { replace: true });
    }
  }, [isSignedIn, profile, role, profileFetched, navigate]);

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-dark-50 mb-2">Welcome Back</h1>
            <p className="text-dark-400">Sign in to your JobMatch AI account</p>
          </div>
          <SignIn
            routing="path"
            path="/sign-in"
            afterSignInUrl="/auth/redirect"
            appearance={{
              variables: {
                colorPrimary: '#C9A84C',
                colorBackground: '#1a1a2e',
                colorInputBackground: '#131325',
                colorInputText: '#e0e0e8',
                colorText: '#e0e0e8',
                colorTextSecondary: '#8a8aa0',
                borderRadius: '0.75rem',
                fontFamily: '"DM Sans", system-ui, sans-serif',
              },
              elements: {
                card: 'bg-dark-800 border border-dark-600 shadow-card',
                formButtonPrimary: 'bg-gold-500 hover:bg-gold-400 text-dark-900 font-semibold',
              },
            }}
          />
          <div className="mt-5 text-center">
            <Link to="/forgot-password" className="text-sm font-medium text-gold-400 transition-colors hover:text-gold-300">
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
