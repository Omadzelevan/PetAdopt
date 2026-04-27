import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { PageTransition } from '../components/PageTransition';

const trustPoints = [
  'Secure sign-in for rescue teams and adopters',
  'Email verification with resend support',
  'One dashboard for requests, messages, and saved pets',
];

export default function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const verifyEmail = useAuthStore((state) => state.verifyEmail);
  const resendVerification = useAuthStore((state) => state.resendVerification);
  const user = useAuthStore((state) => state.user);

  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [feedback, setFeedback] = useState({ error: '', success: '', info: '' });
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const verifyToken = useMemo(() => searchParams.get('verifyToken') || '', [searchParams]);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [navigate, user]);

  useEffect(() => {
    let ignore = false;

    async function runVerification() {
      if (!verifyToken) {
        return;
      }

      setLoading(true);
      setFeedback({ error: '', success: '', info: '' });

      try {
        await verifyEmail(verifyToken);

        if (!ignore) {
          setFeedback({
            error: '',
            success: 'Email verified successfully. You can sign in now.',
            info: '',
          });
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('verifyToken');
          setSearchParams(nextParams, { replace: true });
        }
      } catch (error) {
        if (!ignore) {
          setFeedback({ error: error.message, success: '', info: '' });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    runVerification();

    return () => {
      ignore = true;
    };
  }, [searchParams, setSearchParams, verifyEmail, verifyToken]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setFeedback({ error: '', success: '', info: '' });

    try {
      if (mode === 'login') {
        await login({
          email: form.email,
          password: form.password,
        });

        navigate('/dashboard');
        return;
      }

      if (form.password !== form.confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      const response = await register({
        name: form.name,
        email: form.email,
        password: form.password,
      });

      setFeedback({
        error: '',
        success: 'Registration completed. Check your email for verification.',
        info: response.verificationPreview
          ? `Dev preview verification link: ${response.verificationPreview}`
          : '',
      });
      setMode('login');
      setForm((current) => ({
        ...current,
        password: '',
        confirmPassword: '',
      }));
    } catch (error) {
      setFeedback({ error: error.message, success: '', info: '' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!form.email.trim()) {
      setFeedback({
        error: 'Enter your email first so we know where to resend the verification link.',
        success: '',
        info: '',
      });
      return;
    }

    setResendLoading(true);
    setFeedback((current) => ({ ...current, error: '', success: '', info: '' }));

    try {
      const response = await resendVerification(form.email.trim());
      setFeedback({
        error: '',
        success: response.message,
        info: response.verificationPreview
          ? `Dev preview verification link: ${response.verificationPreview}`
          : '',
      });
    } catch (error) {
      setFeedback({ error: error.message, success: '', info: '' });
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <PageTransition>
      <section className="auth-wrap auth-shell">
        <div className="auth-atmosphere" aria-hidden="true" />

        <motion.div
          className="auth-layout"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <aside className="auth-showcase section-card">
            <p className="eyebrow">Shelter Access</p>
            <h1>Stay close to every request, message, and rescue milestone.</h1>
            <p className="auth-copy">
              PetAdopt gives adopters, fosters, and moderators one calm workspace instead of
              scattered chat threads and spreadsheets.
            </p>

            <div className="auth-trust-list">
              {trustPoints.map((point) => (
                <article key={point} className="auth-trust-item">
                  <span className="auth-trust-dot" aria-hidden="true" />
                  <p>{point}</p>
                </article>
              ))}
            </div>
          </aside>

          <div className="auth-card glass-panel">
            <h2>{mode === 'login' ? 'Welcome Back' : 'Create Your Account'}</h2>
            <p>
              {mode === 'login'
                ? 'Continue to manage adoptions, foster requests, and pet stories.'
                : 'Create an account to publish listings, track requests, and join rescue work.'}
            </p>

            <div className="auth-tabs" role="tablist" aria-label="Auth mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={mode === 'login' ? 'auth-tab is-active' : 'auth-tab'}
                onClick={() => setMode('login')}
              >
                Login
                {mode === 'login' ? (
                  <motion.span className="tab-underline" layoutId="auth-underline" />
                ) : null}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={mode === 'register' ? 'auth-tab is-active' : 'auth-tab'}
                onClick={() => setMode('register')}
              >
                Register
                {mode === 'register' ? (
                  <motion.span className="tab-underline" layoutId="auth-underline" />
                ) : null}
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === 'register' ? (
                <label>
                  Full Name
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Sofia Gvasalia"
                    required
                  />
                </label>
              ) : null}

              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="name@example.com"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={updateField}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
              </label>

              {mode === 'register' ? (
                <label>
                  Confirm Password
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={updateField}
                    placeholder="Repeat your password"
                    minLength={8}
                    required
                  />
                </label>
              ) : null}

              <button className={`auth-submit ${loading ? 'loading' : ''}`} type="submit">
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {feedback.error ? <p className="error-text">{feedback.error}</p> : null}
            {feedback.success ? <p className="success-text">{feedback.success}</p> : null}
            {feedback.info ? <p className="auth-footnote">{feedback.info}</p> : null}

            <div className="auth-support">
              <p className="auth-footnote">
                Didn&apos;t get your verification link? Resend it to the email above.
              </p>
              <button
                type="button"
                className="inline-link"
                disabled={resendLoading}
                onClick={handleResendVerification}
              >
                {resendLoading ? 'Resending...' : 'Resend verification email'}
              </button>
            </div>
          </div>
        </motion.div>
      </section>
    </PageTransition>
  );
}
