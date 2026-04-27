import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { PageTransition } from '../components/PageTransition';
import { useAuthStore } from '../store/authStore';

async function requestAdminData(token, status) {
  const [petsResponse, reportsResponse, usersResponse] = await Promise.all([
    apiRequest(`/admin/pets?status=${status}`, { token }),
    apiRequest('/admin/reports', { token }),
    apiRequest('/admin/users', { token }),
  ]);

  return {
    pets: petsResponse.pets || [],
    reports: reportsResponse.reports || [],
    users: usersResponse.users || [],
  };
}

function formatJoinedDate(value) {
  if (!value) {
    return 'Unknown';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [petStatus, setPetStatus] = useState('PENDING');
  const [pets, setPets] = useState([]);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingKey, setProcessingKey] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const isAdmin = user?.role === 'ADMIN';

  const moderationStats = useMemo(
    () => [
      {
        label: 'Listings in current queue',
        value: pets.length,
        helper: `Filtered by ${petStatus.toLowerCase()} status`,
      },
      {
        label: 'Open reports',
        value: reports.filter((report) => report.status === 'OPEN').length,
        helper: 'Reports that still need review',
      },
      {
        label: 'Unverified users',
        value: users.filter((entry) => !entry.emailVerified).length,
        helper: 'Accounts that have not completed verification',
      },
    ],
    [petStatus, pets.length, reports, users],
  );

  useEffect(() => {
    if (!token || !isAdmin) {
      return;
    }

    let ignore = false;

    async function loadAdminData() {
      setLoading(true);
      setError('');

      try {
        const data = await requestAdminData(token, petStatus);

        if (ignore) {
          return;
        }

        setPets(data.pets);
        setReports(data.reports);
        setUsers(data.users);
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAdminData();

    return () => {
      ignore = true;
    };
  }, [isAdmin, petStatus, token]);

  async function refreshAdminData(status = petStatus) {
    setLoading(true);
    setError('');

    try {
      const data = await requestAdminData(token, status);
      setPets(data.pets);
      setReports(data.reports);
      setUsers(data.users);
      return data;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }

  async function runAction(key, action, options = {}) {
    const { clearDelete = false } = options;

    setProcessingKey(key);
    setError('');

    try {
      await action();
      await refreshAdminData();

      if (clearDelete) {
        setPendingDelete(null);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setProcessingKey('');
    }
  }

  async function updatePetStatus(petId, status) {
    await runAction(`pet:${petId}:${status}`, async () => {
      await apiRequest(`/admin/pets/${petId}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      });
    });
  }

  async function deletePet() {
    if (!pendingDelete) {
      return;
    }

    await runAction(
      `delete:${pendingDelete.id}`,
      async () => {
        await apiRequest(`/admin/pets/${pendingDelete.id}`, {
          method: 'DELETE',
          token,
        });
      },
      { clearDelete: true },
    );
  }

  async function updateReportStatus(reportId, status) {
    await runAction(`report:${reportId}:${status}`, async () => {
      await apiRequest(`/reports/admin/${reportId}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      });
    });
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
          <div>
            <p className="eyebrow">Moderation Control</p>
            <h2>Admin Moderation Panel</h2>
            <p>
              Review listings, triage reports, and keep account quality high without losing
              context.
            </p>
          </div>

          <div className="admin-toolbar">
            <label className="filter-row" htmlFor="petStatusFilter">
              Queue filter
              <select
                id="petStatusFilter"
                value={petStatus}
                onChange={(event) => setPetStatus(event.target.value)}
              >
                <option value="PENDING">Pending</option>
                <option value="ACTIVE">Active</option>
                <option value="REJECTED">Rejected</option>
                <option value="ADOPTED">Adopted</option>
              </select>
            </label>

            <button
              type="button"
              className="inline-link"
              disabled={loading}
              onClick={() => refreshAdminData()}
            >
              Refresh data
            </button>
          </div>
        </div>

        <div className="moderation-summary-grid">
          {moderationStats.map((item) => (
            <article key={item.label} className="moderation-summary-card">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <p>{item.helper}</p>
            </article>
          ))}
        </div>

        {pendingDelete ? (
          <div className="destructive-card">
            <div>
              <h3>Delete {pendingDelete.name} permanently?</h3>
              <p>
                This removes the listing, related requests, messages, saved references, and
                reports.
              </p>
            </div>

            <div className="destructive-actions">
              <button
                type="button"
                className="auth-submit"
                disabled={processingKey === `delete:${pendingDelete.id}`}
                onClick={deletePet}
              >
                {processingKey === `delete:${pendingDelete.id}` ? 'Deleting...' : 'Confirm delete'}
              </button>
              <button
                type="button"
                className="inline-link"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {loading ? <p>Loading moderation data...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <div className="admin-layout">
          <div>
            <div className="dashboard-panel-head dashboard-panel-head-compact">
              <div>
                <h3>Pets Queue</h3>
                <p className="dashboard-microcopy">
                  Moderate new submissions and monitor visibility changes.
                </p>
              </div>
            </div>

            <div className="list-stack">
              {pets.map((pet) => (
                <article key={pet.id} className="list-item list-item-rich">
                  <div>
                    <h3>
                      {pet.name} | {pet.breed}
                    </h3>
                    <p>
                      {pet.listingType?.replace('_', ' ')} | {pet.location}
                    </p>
                    <p className="list-item-submeta">
                      Owner: {pet.owner?.name} ({pet.owner?.email})
                    </p>
                  </div>
                  <div className="inline-actions">
                    <span className="status-pill">{pet.status}</span>
                    <Link className="inline-link" to={`/pets/${pet.id}`}>
                      Open listing
                    </Link>
                    <button
                      type="button"
                      className="inline-link"
                      disabled={processingKey === `pet:${pet.id}:ACTIVE`}
                      onClick={() => updatePetStatus(pet.id, 'ACTIVE')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="inline-link"
                      disabled={processingKey === `pet:${pet.id}:REJECTED`}
                      onClick={() => updatePetStatus(pet.id, 'REJECTED')}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => setPendingDelete({ id: pet.id, name: pet.name })}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {pets.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3>No pets in this moderation state</h3>
                  <p>Try another filter to review a different slice of the queue.</p>
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="dashboard-panel-head dashboard-panel-head-compact">
              <div>
                <h3>Reports Queue</h3>
                <p className="dashboard-microcopy">
                  Resolve trust issues quickly and keep reporters informed.
                </p>
              </div>
            </div>

            <div className="list-stack">
              {reports.map((report) => (
                <article key={report.id} className="list-item list-item-rich">
                  <div>
                    <h3>
                      {report.pet?.name} | {report.reason}
                    </h3>
                    <p>Status: {report.status}</p>
                    <p className="list-item-submeta">
                      Reporter: {report.reporter?.name} | {report.details || 'No extra details'}
                    </p>
                  </div>
                  <div className="inline-actions">
                    <span className="status-pill">{report.status}</span>
                    <button
                      type="button"
                      className="inline-link"
                      disabled={processingKey === `report:${report.id}:REVIEWED`}
                      onClick={() => updateReportStatus(report.id, 'REVIEWED')}
                    >
                      Mark reviewed
                    </button>
                    <button
                      type="button"
                      className="inline-link"
                      disabled={processingKey === `report:${report.id}:RESOLVED`}
                      onClick={() => updateReportStatus(report.id, 'RESOLVED')}
                    >
                      Resolve
                    </button>
                  </div>
                </article>
              ))}
              {reports.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3>No active reports</h3>
                  <p>The moderation report queue is currently clear.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="dashboard-panel-head dashboard-panel-head-compact">
          <div>
            <h3>Users</h3>
            <p className="dashboard-microcopy">
              The most recent accounts are listed below for a quick trust check.
            </p>
          </div>
        </div>

        <div className="list-stack">
          {users.slice(0, 10).map((entry) => (
            <article key={entry.id} className="list-item list-item-rich">
              <div>
                <h3>
                  {entry.name} | {entry.email}
                </h3>
                <p>
                  Joined {formatJoinedDate(entry.createdAt)} | Verified:{' '}
                  {entry.emailVerified ? 'Yes' : 'No'}
                </p>
              </div>
              <span className="status-pill">{entry.role}</span>
            </article>
          ))}
        </div>
      </section>
    </PageTransition>
  );
}
