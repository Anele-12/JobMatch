import { SignUp, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import Navbar from '../components/layout/Navbar';

export default function SignUpPage() {
  const [params] = useSearchParams();
  const { isSignedIn } = useUser();
  const { setSelectedRole } = useAppStore();
  const navigate = useNavigate();

  const role = params.get('role') || 'candidate';

  useEffect(() => {
    if (role) setSelectedRole(role);
  }, [role, setSelectedRole]);

  useEffect(() => {
    if (isSignedIn) {
      navigate('/profile-setup');
    }
  }, [isSignedIn, navigate]);

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-dark-50 mb-2">
              Create Your Account
            </h1>
            <p className="text-dark-400">
              {role === 'employer' ? 'Start hiring with AI assistance' : 'Find your perfect role with AI'}
            </p>
          </div>
          <SignUp
            routing="path"
            path="/sign-up"
            afterSignUpUrl="/profile-setup"
            appearance={{
              variables: {
                colorPrimary: '#C9A84C',
                colorBackground: '#1a1a2e',
                colorInputBackground: '#131325',
                colorInputText: '#e0e0e8',
                colorText: '#e0e0e8',
                colorTextSecondary: '#8a8aa0',
                colorNeutral: '#8a8aa0',
                borderRadius: '0.75rem',
                fontFamily: '"DM Sans", system-ui, sans-serif',
              },
              elements: {
                card: 'bg-dark-800 border border-dark-600 shadow-card',
                formButtonPrimary: 'bg-gold-500 hover:bg-gold-400 text-dark-900 font-semibold',
                socialButtonsBlockButton: 'border-dark-500 text-dark-200 hover:bg-dark-700',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
