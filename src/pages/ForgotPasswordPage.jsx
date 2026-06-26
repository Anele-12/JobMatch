import { useSignIn } from '@clerk/clerk-react';
import { ArrowLeft, CheckCircle, KeyRound, Mail } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';

function getClerkError(error, fallback) {
  return error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || error?.message || fallback;
}

export default function ForgotPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const requestReset = async (event) => {
    event.preventDefault();
    if (!isLoaded || submitting) return;

    setSubmitting(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setStep('code');
      toast.success('Reset code sent');
    } catch (error) {
      toast.error(getClerkError(error, 'Unable to send reset code'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (!isLoaded || submitting) return;

    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        toast.success('Password updated');
        navigate('/auth/redirect', { replace: true });
        return;
      }

      toast.error('Password reset needs another verification step. Please try signing in.');
    } catch (error) {
      toast.error(getClerkError(error, 'Unable to reset password'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Link to="/sign-in" className="btn-ghost mb-6 text-sm">
            <ArrowLeft size={16} />
            Back to sign in
          </Link>

          <div className="card">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gold-500/15 text-gold-400">
                {step === 'email' ? <Mail size={22} /> : <KeyRound size={22} />}
              </div>
              <h1 className="mb-2 text-3xl font-display font-bold text-dark-50">
                {step === 'email' ? 'Reset Password' : 'Enter Reset Code'}
              </h1>
              <p className="text-sm text-dark-300">
                {step === 'email'
                  ? 'Enter your email and we will send a password reset code.'
                  : `We sent a code to ${email}. Choose a new password to continue.`}
              </p>
            </div>

            {step === 'email' ? (
              <form onSubmit={requestReset} className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="label">Email address</label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="input-field"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full justify-center" disabled={!isLoaded || submitting}>
                  {submitting ? 'Sending...' : 'Send reset code'}
                </button>
              </form>
            ) : (
              <form onSubmit={resetPassword} className="space-y-5">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    Check your inbox for the reset code.
                  </div>
                </div>
                <div>
                  <label htmlFor="reset-code" className="label">Reset code</label>
                  <input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="input-field"
                    placeholder="Enter code"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="label">New password</label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input-field"
                    placeholder="Create a new password"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full justify-center" disabled={!isLoaded || submitting}>
                  {submitting ? 'Updating...' : 'Update password'}
                </button>
                <button
                  type="button"
                  className="btn-ghost w-full justify-center text-sm"
                  onClick={() => setStep('email')}
                  disabled={submitting}
                >
                  Use a different email
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
