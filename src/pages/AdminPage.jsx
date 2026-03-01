import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { PageTransition } from '../components/PageTransition';
import { useAuthStore } from '../store/authStore';

export default function AdminPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [petStatus, setPetStatus] = useState('PENDING');
  const [pets, setPets] = useState([]);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  async function loadAdminData(nextStatus = petStatus) {
    if (!token || !isAdmin) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [petsResponse, reportsResponse, usersResponse] = await Promise.all([
        apiRequest(`/admin/pets?status=${nextStatus}`, { token }),
        apiRequest('/admin/reports', { token }),
        apiRequest('/admin/users', { token }),
      ]);

      setPets(petsResponse.pets || []);
      setReports(reportsResponse.reports || []);
      setUsers(usersResponse.users || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  async function updatePetStatus(petId, status) {
    try {
      await apiRequest(`/admin/pets/${petId}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateReportStatus(reportId, status) {
    try {
      await apiRequest(`/reports/admin/${reportId}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!token) {
    return (
      <PageTransition>
        <section className="section-card not-found">
          <p className="eyebrow">Admin Access</p>
          <h1>Please sign in as admin</h1>
          <Link className="magnetic-btn variant-primary size-md" to="/auth">
            Go to Sign In
          </Link>
        </section>
      </PageTransition>
    );
  }

  if (!isAdmin) {
    return (
      <PageTransition>
        <section className="section-card not-found">
          <p className="eyebrow">Admin Access</p>
          <h1>You do not have admin permissions</h1>
          <Link className="magnetic-btn variant-primary size-md" to="/dashboard">
            Open Dashboard
          </Link>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <section className="section-card section-block">
        <div className="section-heading">
          <h2>Admin Moderation Panel</h2>
          <label className="filter-row" htmlFor="petStatusFilter" style={{ minWidth: 180 }}>
            Pet status filter
            <select
              id="petStatusFilter"
              value={petStatus}
              onChange={(event) => {
                const next = event.target.value;
                setPetStatus(next);
                loadAdminData(next);
              }}
            >
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="REJECTED">Rejected</option>
              <option value="ADOPTED">Adopted</option>
            </select>
          </label>
        </div>

        {loading ? <p>Loading moderation data...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <div className="admin-layout">
          <div>
            <h3>Pets Queue</h3>
            <div className="list-stack">
              {pets.map((pet) => (
                <article key={pet.id} className="list-item">
                  <div>
                    <h3>
                      {pet.name} | {pet.breed}
                    </h3>
                    <p>
                      Owner: {pet.owner?.name} ({pet.owner?.email})
                    </p>
                  </div>
                  <div className="inline-actions">
                    <span className="status-pill">{pet.status}</span>
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => updatePetStatus(pet.id, 'ACTIVE')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => updatePetStatus(pet.id, 'REJECTED')}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
              {pets.length === 0 ? <p>No pets in this moderation state.</p> : null}
            </div>
          </div>

          <div>
            <h3>Reports Queue</h3>
            <div className="list-stack">
              {reports.map((report) => (
                <article key={report.id} className="list-item">
                  <div>
                    <h3>
                      {report.pet?.name} | {report.reason}
                    </h3>
                    <p>
                      Reporter: {report.reporter?.name} | {report.details || 'No details'}
                    </p>
                  </div>
                  <div className="inline-actions">
                    <span className="status-pill">{report.status}</span>
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => updateReportStatus(report.id, 'REVIEWED')}
                    >
                      Mark reviewed
                    </button>
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => updateReportStatus(report.id, 'RESOLVED')}
                    >
                      Resolve
                    </button>
                  </div>
                </article>
              ))}
              {reports.length === 0 ? <p>No active reports.</p> : null}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <h3>Users</h3>
          <div className="list-stack">
            {users.slice(0, 8).map((entry) => (
              <article key={entry.id} className="list-item">
                <div>
                  <h3>
                    {entry.name} | {entry.email}
                  </h3>
                  <p>Verified: {entry.emailVerified ? 'Yes' : 'No'}</p>
                </div>
                <span className="status-pill">{entry.role}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
