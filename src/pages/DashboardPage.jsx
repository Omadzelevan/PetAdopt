import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { PageTransition } from '../components/PageTransition';
import { API_ORIGIN, apiRequest } from '../lib/api';
import { getListingMetaLabel } from '../lib/petPresentation';
import { enablePushNotifications } from '../lib/pushClient';
import { useAuthStore } from '../store/authStore';

const tabs = [
  { id: 'posted', label: 'My Posted Pets' },
  { id: 'messages', label: 'Messages' },
  { id: 'saved', label: 'Saved Pets' },
  { id: 'requests', label: 'Adoption Requests' },
  { id: 'notifications', label: 'Notifications' },
];

const tabCopy = {
  posted: {
    title: 'My Posted Pets',
    description: 'Track moderation status, listing visibility, and the next action for each post.',
  },
  messages: {
    title: 'Messages',
    description: 'Keep adoption and foster conversations in one place instead of scattered chats.',
  },
  saved: {
    title: 'Saved Pets',
    description: 'Revisit strong matches quickly when you are ready to follow up.',
  },
  requests: {
    title: 'Adoption Requests',
    description: 'Review incoming applicants and monitor every request you have already sent.',
  },
  notifications: {
    title: 'Notifications',
    description: 'Stay current on moderation changes, request updates, and unread alerts.',
  },
};

const socketUrl = import.meta.env.VITE_SOCKET_URL || API_ORIGIN;

function formatPetLine(pet) {
  return [getListingMetaLabel(pet), pet?.breed, pet?.location].filter(Boolean).join(' | ');
}

function formatRequestLabel(request) {
  const listing = request.pet?.name || 'Pet';
  const counterpart = request.requester?.name || request.pet?.owner?.name || 'Participant';
  return `${listing} | ${counterpart} | ${request.status}`;
}

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

  const unreadNotificationCount = notifications.filter((item) => !item.isRead).length;

  const requestOptions = useMemo(
    () =>
      [...receivedRequests, ...myRequests].map((item) => ({
        id: item.id,
        label: formatRequestLabel(item),
      })),
    [myRequests, receivedRequests],
  );

  const dashboardStats = useMemo(
    () => [
      {
        label: 'Active listings',
        value: postedPets.length,
        helper: 'Posts you currently manage',
      },
      {
        label: 'Saved pets',
        value: savedPets.length,
        helper: 'Profiles you bookmarked',
      },
      {
        label: 'Pending requests',
        value: [...receivedRequests, ...myRequests].filter((item) => item.status === 'PENDING')
          .length,
        helper: 'Requests awaiting action',
      },
      {
        label: 'Unread alerts',
        value: unreadNotificationCount,
        helper: 'Notifications that still need attention',
      },
    ],
    [myRequests, postedPets.length, receivedRequests, savedPets.length, unreadNotificationCount],
  );

  useEffect(() => {
    if (requestOptions.length === 0) {
      setActiveRequestId('');
      return;
    }

    setActiveRequestId((current) =>
      requestOptions.some((option) => option.id === current) ? current : requestOptions[0].id,
    );
  }, [requestOptions]);

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
      const response = await apiRequest(`/adoptions/${requestId}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      });

      const closedRequestIds = response.closedRequestIds || [];

      setReceivedRequests((current) =>
        current.map((item) => {
          if (item.id === requestId) {
            return { ...item, status };
          }

          if (closedRequestIds.includes(item.id)) {
            return { ...item, status: 'REJECTED' };
          }

          return item;
        }),
      );
      setMyRequests((current) =>
        current.map((item) =>
          closedRequestIds.includes(item.id) ? { ...item, status: 'REJECTED' } : item,
        ),
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

  const activeCopy = tabCopy[activeTab];

  return (
    <PageTransition>
      <div className="dashboard-layout">
        <motion.aside
          className="section-card dashboard-sidebar"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="dashboard-hero">
            <p className="eyebrow">Rescue Workspace</p>
            <h1>Dashboard</h1>
            <div className="dashboard-identity">
              <strong>{user?.name || 'User'}</strong>
              <span>{user?.email || 'Signed in'}</span>
            </div>
          </div>

          <div className="dashboard-summary-grid">
            {dashboardStats.map((item) => (
              <article key={item.label} className="dashboard-summary-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <p>{item.helper}</p>
              </article>
            ))}
          </div>

          <nav className="dashboard-tabs" aria-label="Dashboard tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'dash-tab is-active' : 'dash-tab'}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                {tab.id === 'notifications' && unreadNotificationCount > 0 ? (
                  <span className="badge-bounce">{unreadNotificationCount}</span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="feature-grid">
            <article>
              <h3>Real-time coordination</h3>
              <p>Every request room stays synced with instant chat and request status changes.</p>
            </article>
            <article>
              <h3>Moderation visibility</h3>
              <p>Posted animals keep their status history visible so nothing stalls silently.</p>
            </article>
            <article>
              <h3>Rescue follow-up</h3>
              <p>Saved pets, alerts, and notifications stay in one place for faster responses.</p>
            </article>
          </div>
        </motion.aside>

        <section className="section-card dashboard-content">
          <div className="dashboard-panel-head">
            <div>
              <p className="eyebrow">Current Section</p>
              <h2>{activeCopy.title}</h2>
              <p className="dashboard-microcopy">{activeCopy.description}</p>
            </div>
          </div>

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
                <div className="list-stack">
                  {postedPets.map((item) => (
                    <article key={item.id} className="list-item list-item-rich">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{formatPetLine(item)}</p>
                        <p className="list-item-submeta">
                          Moderation updates and adoption activity will appear here first.
                        </p>
                      </div>
                      <div className="inline-actions">
                        <span className="status-pill">{item.status}</span>
                        <Link className="inline-link" to={`/pets/${item.id}`}>
                          Open listing
                        </Link>
                      </div>
                    </article>
                  ))}
                  {postedPets.length === 0 ? (
                    <div className="dashboard-empty-state">
                      <h3>No listings yet</h3>
                      <p>Publish your first rescue profile to start receiving requests.</p>
                      <Link className="inline-link" to="/post">
                        Create a listing
                      </Link>
                    </div>
                  ) : null}
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
                {requestOptions.length > 0 ? (
                  <label className="filter-row request-room-card" htmlFor="requestRoom">
                    <span>Conversation room</span>
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
                  <div className="dashboard-empty-state">
                    <h3>No request conversations yet</h3>
                    <p>When a request is started, its dedicated chat room will appear here.</p>
                  </div>
                )}

                {activeRequestId ? (
                  <>
                    <div className="chat-box">
                      {messages.map((message) => (
                        <article
                          key={message.id}
                          className={
                            message.senderId === user?.id ? 'chat-item is-mine' : 'chat-item'
                          }
                        >
                          <p className="chat-meta">{message.sender?.name || 'User'}</p>
                          <p>{message.content}</p>
                        </article>
                      ))}
                      {messages.length === 0 ? (
                        <p className="dashboard-microcopy">
                          No messages yet. Start the conversation with a short update.
                        </p>
                      ) : null}
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
                {savedPets.length > 0 ? (
                  <div className="list-stack">
                    {savedPets.map((pet) => (
                      <article key={pet.id} className="list-item list-item-rich">
                        <div>
                          <h3>{pet.name}</h3>
                          <p>{formatPetLine(pet)}</p>
                          <p className="list-item-submeta">
                            Saved for later follow-up or comparison.
                          </p>
                        </div>
                        <div className="inline-actions">
                          <span className="status-pill">Saved</span>
                          <Link className="inline-link" to={`/pets/${pet.id}`}>
                            Open listing
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-empty-state">
                    <h3>No saved pets yet</h3>
                    <p>Use the save action in browse to keep strong matches within reach.</p>
                    <Link className="inline-link" to="/pets">
                      Browse pets
                    </Link>
                  </div>
                )}
              </motion.div>
            ) : null}

            {activeTab === 'requests' ? (
              <motion.div
                key="requests"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="dashboard-actions-grid"
              >
                <div>
                  <h3>Incoming Requests</h3>
                  <div className="list-stack">
                    {receivedRequests.map((request) => (
                      <article key={request.id} className="list-item list-item-rich">
                        <div>
                          <h3>
                            {request.pet?.name} | {request.requester?.name}
                          </h3>
                          <p>{formatPetLine(request.pet)}</p>
                          <p className="list-item-submeta">
                            {request.message || 'No message provided yet.'}
                          </p>
                        </div>

                        <div className="inline-actions">
                          <span className="status-pill">{request.status}</span>
                          <Link className="inline-link" to={`/pets/${request.pet?.id}`}>
                            Open listing
                          </Link>
                          <button
                            type="button"
                            className="inline-link"
                            disabled={request.status !== 'PENDING'}
                            onClick={() => updateRequestStatus(request.id, 'APPROVED')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="inline-link"
                            disabled={request.status !== 'PENDING'}
                            onClick={() => updateRequestStatus(request.id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </div>
                      </article>
                    ))}
                    {receivedRequests.length === 0 ? (
                      <div className="dashboard-empty-state">
                        <h3>No incoming requests</h3>
                        <p>When adopters or fosters reach out, their requests will appear here.</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <h3>My Requests</h3>
                  <div className="list-stack">
                    {myRequests.map((request) => (
                      <article key={request.id} className="list-item list-item-rich">
                        <div>
                          <h3>{request.pet?.name}</h3>
                          <p>{formatPetLine(request.pet)}</p>
                          <p className="list-item-submeta">
                            Contact: {request.pet?.owner?.name || 'Rescue team'} |{' '}
                            {request.message || 'No message provided yet.'}
                          </p>
                        </div>
                        <div className="inline-actions">
                          <span className="status-pill">{request.status}</span>
                          <Link className="inline-link" to={`/pets/${request.pet?.id}`}>
                            Open listing
                          </Link>
                        </div>
                      </article>
                    ))}
                    {myRequests.length === 0 ? (
                      <div className="dashboard-empty-state">
                        <h3>No outgoing requests</h3>
                        <p>Start an adoption or foster conversation from any active pet profile.</p>
                      </div>
                    ) : null}
                  </div>
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
                <div className="dashboard-panel-head dashboard-panel-head-compact">
                  <div>
                    <h3>In-app alerts</h3>
                    <p className="dashboard-microcopy">
                      Push notifications can mirror these updates on supported devices.
                    </p>
                  </div>
                  <button type="button" className="inline-link" onClick={activatePush}>
                    {pushEnabled ? 'Push Enabled' : 'Enable Push Notifications'}
                  </button>
                </div>

                <div className="list-stack">
                  {notifications.map((notification) => (
                    <article
                      key={notification.id}
                      className={
                        notification.isRead
                          ? 'list-item list-item-rich notification-card'
                          : 'list-item list-item-rich notification-card is-unread'
                      }
                    >
                      <div>
                        <h3>{notification.title}</h3>
                        <p>{notification.body}</p>
                        {notification.link ? (
                          <Link className="inline-link" to={notification.link}>
                            Open related page
                          </Link>
                        ) : null}
                      </div>
                      <div className="inline-actions">
                        {!notification.isRead ? (
                          <span className="status-pill notification-pill">New</span>
                        ) : null}
                        <button
                          type="button"
                          className="inline-link"
                          disabled={notification.isRead}
                          onClick={() => markNotificationRead(notification.id)}
                        >
                          {notification.isRead ? 'Read' : 'Mark read'}
                        </button>
                      </div>
                    </article>
                  ))}
                  {notifications.length === 0 ? (
                    <div className="dashboard-empty-state">
                      <h3>No notifications yet</h3>
                      <p>Your moderation, request, and chat updates will appear here.</p>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      </div>
    </PageTransition>
  );
}
