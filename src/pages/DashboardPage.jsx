import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { PageTransition } from '../components/PageTransition';
import { API_ORIGIN, apiRequest } from '../lib/api';
import { enablePushNotifications } from '../lib/pushClient';
import { useAuthStore } from '../store/authStore';

const tabs = [
  { id: 'posted', label: 'My Posted Pets' },
  { id: 'messages', label: 'Messages' },
  { id: 'saved', label: 'Saved Pets' },
  { id: 'requests', label: 'Adoption Requests' },
  { id: 'notifications', label: 'Notifications' },
];

const socketUrl = import.meta.env.VITE_SOCKET_URL || API_ORIGIN;

export default function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState('posted');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [postedPets, setPostedPets] = useState([]);
  const [savedPets, setSavedPets] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [activeRequestId, setActiveRequestId] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);

  const messageCount = notifications.filter((item) => !item.isRead).length;

  useEffect(() => {
    if (!token) {
      return;
    }

    let ignore = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const [posted, saved, received, mine, incomingNotifications] = await Promise.all([
          apiRequest('/pets/my/listings', { token }),
          apiRequest('/pets/saved', { token }),
          apiRequest('/adoptions/received', { token }),
          apiRequest('/adoptions/my', { token }),
          apiRequest('/notifications', { token }),
        ]);

        if (ignore) {
          return;
        }

        setPostedPets(posted.pets || []);
        setSavedPets(saved.pets || []);
        setReceivedRequests(received.requests || []);
        setMyRequests(mine.requests || []);
        setNotifications(incomingNotifications.notifications || []);

        const firstRequestId =
          (received.requests && received.requests[0]?.id) ||
          (mine.requests && mine.requests[0]?.id) ||
          '';

        setActiveRequestId((current) => current || firstRequestId);
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

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !activeRequestId) {
      return;
    }

    let ignore = false;

    async function loadMessages() {
      try {
        const response = await apiRequest(`/messages/${activeRequestId}`, { token });

        if (!ignore) {
          setMessages(response.messages || []);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      }
    }

    loadMessages();

    return () => {
      ignore = true;
    };
  }, [activeRequestId, token]);

  useEffect(() => {
    if (!token || !activeRequestId) {
      return;
    }

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('join:request', { adoptionRequestId: activeRequestId });
    });

    socket.on('message:new', (message) => {
      if (message.adoptionRequestId !== activeRequestId) {
        return;
      }

      setMessages((current) => [...current, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [activeRequestId, token]);

  const requestOptions = useMemo(
    () =>
      [...receivedRequests, ...myRequests].map((item) => ({
        id: item.id,
        label: `${item.pet?.name || 'Pet'} | ${item.requester?.name || 'Applicant'} | ${item.status}`,
      })),
    [myRequests, receivedRequests],
  );

  async function sendMessage(event) {
    event.preventDefault();

    if (!messageInput.trim() || !activeRequestId) {
      return;
    }

    try {
      await apiRequest(`/messages/${activeRequestId}`, {
        method: 'POST',
        token,
        body: { content: messageInput.trim() },
      });

      setMessageInput('');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateRequestStatus(requestId, status) {
    try {
      await apiRequest(`/adoptions/${requestId}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      });

      setReceivedRequests((current) =>
        current.map((item) => (item.id === requestId ? { ...item, status } : item)),
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function markNotificationRead(notificationId) {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
        token,
      });

      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item,
        ),
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function activatePush() {
    try {
      await enablePushNotifications(token);
      setPushEnabled(true);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!token) {
    return (
      <PageTransition>
        <section className="section-card not-found">
          <p className="eyebrow">Private Area</p>
          <h1>Please sign in to open your dashboard</h1>
          <Link className="magnetic-btn variant-primary size-md" to="/auth">
            Go to Sign In
          </Link>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="dashboard-layout">
        <motion.aside
          className="section-card dashboard-sidebar"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h1>Dashboard</h1>
          <p>
            Logged in as <strong>{user?.name || 'User'}</strong>
          </p>

          <nav className="dashboard-tabs" aria-label="Dashboard tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'dash-tab is-active' : 'dash-tab'}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                {tab.id === 'notifications' && messageCount > 0 ? (
                  <span className="badge-bounce">{messageCount}</span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="feature-grid">
            <article>
              <h3>Real-time Chat</h3>
              <p>Socket channel is active for each adoption request room.</p>
            </article>
            <article>
              <h3>Push & In-app Alerts</h3>
              <p>Notification records are persisted and synced in the dashboard.</p>
            </article>
            <article>
              <h3>Moderation-ready</h3>
              <p>Requests and reports are linked to admin review workflows.</p>
            </article>
          </div>
        </motion.aside>

        <section className="section-card dashboard-content">
          {loading ? <p>Loading dashboard data...</p> : null}
          {error ? <p className="error-text">{error}</p> : null}

          <AnimatePresence mode="wait">
            {activeTab === 'posted' ? (
              <motion.div
                key="posted"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <h2>My Posted Pets</h2>
                <div className="list-stack">
                  {postedPets.map((item) => (
                    <article key={item.id} className="list-item">
                      <div>
                        <h3>{item.name}</h3>
                        <p>
                          {item.breed} | {item.location}
                        </p>
                      </div>
                      <span className="status-pill">{item.status}</span>
                    </article>
                  ))}
                  {postedPets.length === 0 ? <p>No listings yet.</p> : null}
                </div>
              </motion.div>
            ) : null}

            {activeTab === 'messages' ? (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <h2>Messages</h2>

                {requestOptions.length > 0 ? (
                  <label className="filter-row" htmlFor="requestRoom">
                    Select request room
                    <select
                      id="requestRoom"
                      value={activeRequestId}
                      onChange={(event) => setActiveRequestId(event.target.value)}
                    >
                      {requestOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p>No request conversations yet.</p>
                )}

                {activeRequestId ? (
                  <>
                    <div className="chat-box">
                      {messages.map((message) => (
                        <article key={message.id} className="chat-item">
                          <p>
                            <strong>{message.sender?.name || 'User'}:</strong> {message.content}
                          </p>
                        </article>
                      ))}
                    </div>

                    <form className="chat-form" onSubmit={sendMessage}>
                      <input
                        value={messageInput}
                        onChange={(event) => setMessageInput(event.target.value)}
                        placeholder="Type your message..."
                      />
                      <button type="submit" className="auth-submit">
                        Send
                      </button>
                    </form>
                  </>
                ) : null}
              </motion.div>
            ) : null}

            {activeTab === 'saved' ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <h2>Saved Pets</h2>
                {savedPets.length > 0 ? (
                  <div className="list-stack">
                    {savedPets.map((pet) => (
                      <article key={pet.id} className="list-item">
                        <div>
                          <h3>{pet.name}</h3>
                          <p>
                            {pet.breed} | {pet.location}
                          </p>
                        </div>
                        <span className="status-pill">Saved</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No saved pets yet.</p>
                )}
              </motion.div>
            ) : null}

            {activeTab === 'requests' ? (
              <motion.div
                key="requests"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <h2>Adoption Requests</h2>
                <h3>Incoming Requests</h3>
                <div className="list-stack">
                  {receivedRequests.map((request) => (
                    <article key={request.id} className="list-item">
                      <div>
                        <h3>
                          {request.pet?.name} | {request.requester?.name}
                        </h3>
                        <p>{request.message || 'No message provided.'}</p>
                      </div>

                      <div className="inline-actions">
                        <span className="status-pill">{request.status}</span>
                        <button
                          type="button"
                          className="inline-link"
                          onClick={() => updateRequestStatus(request.id, 'APPROVED')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="inline-link"
                          onClick={() => updateRequestStatus(request.id, 'REJECTED')}
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                  {receivedRequests.length === 0 ? <p>No incoming requests.</p> : null}
                </div>

                <h3 style={{ marginTop: '1rem' }}>My Requests</h3>
                <div className="list-stack">
                  {myRequests.map((request) => (
                    <article key={request.id} className="list-item">
                      <div>
                        <h3>{request.pet?.name}</h3>
                        <p>{request.message || 'No message provided.'}</p>
                      </div>
                      <span className="status-pill">{request.status}</span>
                    </article>
                  ))}
                  {myRequests.length === 0 ? <p>No outgoing requests.</p> : null}
                </div>
              </motion.div>
            ) : null}

            {activeTab === 'notifications' ? (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <h2>Notifications</h2>
                <button type="button" className="inline-link" onClick={activatePush}>
                  {pushEnabled ? 'Push Enabled' : 'Enable Push Notifications'}
                </button>
                <div className="list-stack">
                  {notifications.map((notification) => (
                    <article key={notification.id} className="list-item">
                      <div>
                        <h3>{notification.title}</h3>
                        <p>{notification.body}</p>
                      </div>
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => markNotificationRead(notification.id)}
                      >
                        {notification.isRead ? 'Read' : 'Mark read'}
                      </button>
                    </article>
                  ))}
                  {notifications.length === 0 ? <p>No notifications yet.</p> : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      </div>
    </PageTransition>
  );
}
