import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { MagneticButton } from '../components/MagneticButton';
import { PageTransition } from '../components/PageTransition';
import { useAuthStore } from '../store/authStore';

export default function DonatePage() {
  const token = useAuthStore((state) => state.token);

  const [amount, setAmount] = useState('25');
  const [currency, setCurrency] = useState('USD');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadHistory() {
      if (!token) {
        return;
      }

      try {
        const response = await apiRequest('/donations/my', { token });
        setHistory(response.donations || []);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    loadHistory();
  }, [token]);

  async function submitDonation(event) {
    event.preventDefault();

    if (!token) {
      setError('Please sign in before donating.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const amountCents = Math.round(Number(amount) * 100);

      if (!Number.isFinite(amountCents) || amountCents < 100) {
        throw new Error('Please enter at least 1.00 in the selected currency.');
      }

      await apiRequest('/donations', {
        method: 'POST',
        token,
        body: {
          amountCents,
          currency,
        },
      });

      const response = await apiRequest('/donations/my', { token });
      setHistory(response.donations || []);
      setMessage('Test donation recorded successfully. Thank you for supporting rescue work.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <section className="section-card section-block">
        <div className="section-heading">
          <h2>Support Rescue Work</h2>
          <p>
            Donations are currently recorded in secure test mode until a live payment
            provider is connected.
          </p>
        </div>

        {!token ? (
          <p className="auth-footnote">
            Sign in to make donations and keep your contribution history.{' '}
            <Link to="/auth">Go to Sign In</Link>
          </p>
        ) : null}

        <form className="donation-form" onSubmit={submitDonation}>
          <label>
            Amount
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>

          <label>
            Currency
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GEL">GEL</option>
            </select>
          </label>

          <MagneticButton type="submit" variant="primary">
            {loading ? 'Processing...' : 'Donate Now'}
          </MagneticButton>
        </form>

        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="success-text">{message}</p> : null}

        <h3 style={{ marginTop: '1rem' }}>Donation History</h3>
        <div className="list-stack">
          {history.map((item) => (
            <article key={item.id} className="list-item">
              <div>
                <h3>
                  {(item.amountCents / 100).toFixed(2)} {item.currency}
                </h3>
                <p>Provider: {item.provider}</p>
              </div>
              <span className="status-pill">{item.status}</span>
            </article>
          ))}
          {history.length === 0 ? <p>No donation records yet.</p> : null}
        </div>
      </section>
    </PageTransition>
  );
}
