import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { PageTransition } from '../components/PageTransition';

export default function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const verifyEmail = useAuthStore((state) => state.verifyEmail);
  const user = useAuthStore((state) => state.user);

  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ error: '', success: '', info: '' });
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
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
      setForm((current) => ({ ...current, password: '' }));
    } catch (error) {
      setFeedback({ error: error.message, success: '', info: '' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <section className="auth-wrap">
        <div className="auth-atmosphere" aria-hidden="true" />

        <motion.div
          className="auth-card glass-panel"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h1>{mode === 'login' ? 'Welcome Back' : 'Create Your Account'}</h1>
          <p>Continue to manage adoptions, foster requests, and pet stories.</p>

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

            <button className={`auth-submit ${loading ? 'loading' : ''}`} type="submit">
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {feedback.error ? <p className="error-text">{feedback.error}</p> : null}
          {feedback.success ? <p className="success-text">{feedback.success}</p> : null}
          {feedback.info ? <p className="auth-footnote">{feedback.info}</p> : null}

          <p className="auth-footnote">
            Email verification is enabled. SMTP is optional in development and verification
            links are shown in console and UI preview when SMTP is not configured.
          </p>
        </motion.div>
      </section>
    </PageTransition>
  );
}
