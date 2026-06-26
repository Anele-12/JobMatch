import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, useUser } from '@clerk/clerk-react';
import { Toaster } from 'react-hot-toast';
import * as Sentry from '@sentry/react';

import Homepage from './pages/Homepage';
import RoleSelect from './pages/RoleSelect';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfileSetup from './pages/ProfileSetup';
import CVUpload from './pages/CVUpload';
import CandidateDashboard from './pages/CandidateDashboard';
import MyApplications from './pages/MyApplications';
import EmployerDashboard from './pages/EmployerDashboard';
import PostJob from './pages/PostJob';
import Profile from './pages/Profile';
import SavedJobs from './pages/SavedJobs';
import Jobs from './pages/Jobs';
import AssistantChatbot from './components/AssistantChatbot';
import { useProfile } from './hooks/useProfile';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ErrorFallback() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-8">
      <div className="card max-w-md text-center space-y-3">
        <div className="text-3xl">⚠️</div>
        <h2 className="text-xl font-display font-bold text-dark-50">Something went wrong</h2>
        <p className="text-dark-400 text-sm">An unexpected error occurred. Please refresh the page.</p>
        <button onClick={() => window.location.reload()} className="btn-primary mx-auto">Refresh</button>
      </div>
    </div>
  );
}


// Protected route: requires sign in
function Protected({ children }) {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return <div className="min-h-screen bg-dark-900 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
  </div>;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  return children;
}

function ProfileGuard({ children }) {
  const { profile, loading, profileFetched } = useProfile();
  if (!profileFetched || loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!profile?.profile_completed) {
    return <Navigate to="/profile-setup" replace />;
  }
  return children;
}

// Route guard: redirect to correct dashboard based on role
function RoleGuard({ requiredRole, children }) {
  const { profile, role } = useProfile();
  if (profile && role && role !== requiredRole) {
    return <Navigate to={role === 'employer' ? '/employer/dashboard' : '/dashboard'} replace />;
  }
  return children;
}

function AuthRedirect() {
  const { profile, role, loading, profileFetched } = useProfile();
  if (!profileFetched || loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!profile?.profile_completed) return <Navigate to="/profile-setup" replace />;
  return <Navigate to={role === 'employer' ? '/employer/dashboard' : '/dashboard'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/role-select" element={<RoleSelect />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/redirect" element={<Protected><AuthRedirect /></Protected>} />
      <Route path="/jobs" element={<Jobs />} />

      <Route path="/profile-setup" element={
        <Protected><ProfileSetup /></Protected>
      } />

      <Route path="/cv-upload" element={
        <Protected><CVUpload /></Protected>
      } />

      <Route path="/profile" element={
        <Protected>
          <ProfileGuard>
            <Profile />
          </ProfileGuard>
        </Protected>
      } />

      <Route path="/dashboard" element={
        <Protected>
          <ProfileGuard>
            <RoleGuard requiredRole="candidate">
              <CandidateDashboard />
            </RoleGuard>
          </ProfileGuard>
        </Protected>
      } />

      <Route path="/applications" element={
        <Protected>
          <ProfileGuard>
            <RoleGuard requiredRole="candidate">
              <MyApplications />
            </RoleGuard>
          </ProfileGuard>
        </Protected>
      } />

      <Route path="/saved-jobs" element={
        <Protected>
          <ProfileGuard>
            <RoleGuard requiredRole="candidate">
              <SavedJobs />
            </RoleGuard>
          </ProfileGuard>
        </Protected>
      } />

      <Route path="/employer/dashboard" element={
        <Protected>
          <ProfileGuard>
            <RoleGuard requiredRole="employer">
              <EmployerDashboard />
            </RoleGuard>
          </ProfileGuard>
        </Protected>
      } />

      <Route path="/employer/post-job" element={
        <Protected>
          <ProfileGuard>
            <RoleGuard requiredRole="employer">
              <PostJob />
            </RoleGuard>
          </ProfileGuard>
        </Protected>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  if (!CLERK_KEY) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-8">
        <div className="card max-w-md text-center space-y-3">
          <div className="text-3xl">⚙️</div>
          <h2 className="text-xl font-display font-bold text-dark-50">Setup Required</h2>
          <p className="text-dark-400 text-sm">
            Add <code className="bg-dark-700 px-1.5 py-0.5 rounded text-gold-400">VITE_CLERK_PUBLISHABLE_KEY</code> to your <code className="bg-dark-700 px-1.5 py-0.5 rounded text-gold-400">.env</code> file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
        <AssistantChatbot />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#e0e0e8',
              border: '1px solid #252538',
              borderRadius: '0.75rem',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#0D0F14' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0D0F14' },
            },
          }}
        />
      </BrowserRouter>
      </Sentry.ErrorBoundary>
    </ClerkProvider>
  );
}
