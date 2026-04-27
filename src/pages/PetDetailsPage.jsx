import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { usePetStore } from '../store/petStore';
import { MagneticButton } from '../components/MagneticButton';
import { PageLoader } from '../components/PageLoader';
import { PageTransition } from '../components/PageTransition';
import { RevealStagger } from '../components/ScrollReveal';

export default function PetDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const getPetById = usePetStore((state) => state.getPetById);
  const fetchPetById = usePetStore((state) => state.fetchPetById);
  const savedIds = usePetStore((state) => state.savedIds);
  const toggleSaved = usePetStore((state) => state.toggleSaved);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [pet, setPet] = useState(() => getPetById(id));
  const [loading, setLoading] = useState(!pet);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [actionState, setActionState] = useState({ error: '', success: '' });
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [reportReason, setReportReason] = useState('Suspicious information');
  const [reportDetails, setReportDetails] = useState('');

  const galleryRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: galleryRef,
    offset: ['start end', 'end start'],
  });

  const parallaxY = useTransform(scrollYProgress, [0, 1], [24, -24]);

  useEffect(() => {
    let ignore = false;

    async function loadPet() {
      const localPet = getPetById(id);

      if (localPet) {
        setPet(localPet);
        setLoading(false);
        return;
      }

      setLoading(true);
      const remotePet = await fetchPetById(id, token);

      if (ignore) {
        return;
      }

      if (!remotePet) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPet(remotePet);
      setLoading(false);
    }

    loadPet();

    return () => {
      ignore = true;
    };
  }, [fetchPetById, getPetById, id, token]);

  if (loading) {
    return (
      <PageTransition>
        <PageLoader />
      </PageTransition>
    );
  }

  if (notFound || !pet) {
    return (
      <PageTransition>
        <section className="section-card not-found">
          <p className="eyebrow">Pet Not Found</p>
          <h1>This profile could not be loaded</h1>
          <MagneticButton to="/pets" variant="primary">
            Back to Browse
          </MagneticButton>
        </section>
      </PageTransition>
    );
  }

  const saved = savedIds.includes(pet.id);
  const isOwner = pet.owner?.id === user?.id;
  const canSave = pet.status === 'ACTIVE' && !isOwner;
  const canRequest = pet.status === 'ACTIVE' && pet.listingType !== 'LOST_FOUND' && !isOwner;
  const requestLabel =
    pet.listingType === 'FOSTER' ? 'Start Foster Request' : 'Start Adoption Request';

  function requireAuth() {
    if (!token) {
      navigate('/auth');
      return false;
    }

    return true;
  }

  async function handleSaveToggle() {
    if (!canSave) {
      return;
    }

    if (!requireAuth()) {
      return;
    }

    setActionState({ error: '', success: '' });

    try {
      await toggleSaved(pet.id, token);
    } catch (error) {
      setActionState({ error: error.message, success: '' });
    }
  }

  async function handleAdoptionRequest(event) {
    event.preventDefault();

    if (!canRequest) {
      return;
    }

    if (!requireAuth()) {
      return;
    }

    setActionState({ error: '', success: '' });

    try {
      await apiRequest('/adoptions', {
        method: 'POST',
        token,
        body: {
          petId: pet.id,
          message: requestMessage.trim(),
        },
      });

      setActionState({
        error: '',
        success:
          pet.listingType === 'FOSTER'
            ? 'Foster request sent successfully.'
            : 'Adoption request sent successfully.',
      });
      setRequestMessage('');
      setShowRequestForm(false);
    } catch (error) {
      setActionState({ error: error.message, success: '' });
    }
  }

  async function handleReport(event) {
    event.preventDefault();

    if (!requireAuth()) {
      return;
    }

    if (!reportReason.trim()) {
      setActionState({ error: 'Report reason is required.', success: '' });
      return;
    }

    setActionState({ error: '', success: '' });

    try {
      await apiRequest('/reports', {
        method: 'POST',
        token,
        body: {
          petId: pet.id,
          reason: reportReason.trim(),
          details: reportDetails.trim(),
        },
      });

      setActionState({
        error: '',
        success: 'Report submitted for moderation review.',
      });
      setReportDetails('');
      setShowReportForm(false);
    } catch (error) {
      setActionState({ error: error.message, success: '' });
    }
  }

  function nextImage() {
    setActiveImage((index) => (index + 1) % pet.images.length);
  }

  function previousImage() {
    setActiveImage((index) => (index === 0 ? pet.images.length - 1 : index - 1));
  }

  const mapsUrl =
    pet.latitude && pet.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${pet.latitude},${pet.longitude}`
      : null;
  const safeActiveImage = Math.min(activeImage, pet.images.length - 1);

  return (
    <PageTransition>
      <div className="details-layout">
        <section className="section-card details-gallery" ref={galleryRef}>
          <motion.img
            key={pet.images[safeActiveImage]}
            className="details-main-image"
            src={pet.images[safeActiveImage]}
            alt={`${pet.name} gallery image ${safeActiveImage + 1}`}
            style={{ y: parallaxY }}
            initial={{ opacity: 0.4, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />

          <div className="gallery-controls">
            <button type="button" onClick={previousImage}>
              Previous
            </button>
            <button type="button" onClick={nextImage}>
              Next
            </button>
          </div>

          <div className="thumb-row">
            {pet.images.map((image, index) => (
              <button
                key={image}
                type="button"
                className={safeActiveImage === index ? 'is-active' : ''}
                onClick={() => setActiveImage(index)}
              >
                <img src={image} alt={`${pet.name} thumbnail ${index + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        </section>

        <RevealStagger className="section-card details-info">
          <p className="eyebrow">Pet Profile</p>
          <h1>{pet.name}</h1>
          <p className="details-subline">
            {pet.breed} | {pet.age} | {pet.location}
          </p>

          <p>{pet.description}</p>

          <ul className="detail-list">
            <li>
              <span>Gender</span>
              <strong>{pet.gender}</strong>
            </li>
            <li>
              <span>Size</span>
              <strong>{pet.size}</strong>
            </li>
            <li>
              <span>Listing Type</span>
              <strong>{pet.listingType.replace('_', ' ')}</strong>
            </li>
            <li>
              <span>Health Status</span>
              <strong>{pet.health.join(', ')}</strong>
            </li>
          </ul>

          <div className="chip-row">
            {pet.temperament.map((item) => (
              <span className="chip" key={item}>
                {item}
              </span>
            ))}
          </div>

          <div className="details-actions">
            {canRequest ? (
              <MagneticButton
                className="cta-pulse"
                variant="primary"
                onClick={() => {
                  setShowRequestForm((current) => !current);
                  setShowReportForm(false);
                }}
              >
                {requestLabel}
              </MagneticButton>
            ) : null}
            {canSave ? (
              <MagneticButton
                variant={saved ? 'secondary' : 'ghost'}
                onClick={handleSaveToggle}
              >
                {saved ? 'Saved' : 'Save Pet'}
              </MagneticButton>
            ) : null}
            <MagneticButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowReportForm((current) => !current);
                setShowRequestForm(false);
              }}
            >
              Report Animal
            </MagneticButton>
            {mapsUrl ? (
              <MagneticButton
                variant="ghost"
                size="sm"
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open Map
              </MagneticButton>
            ) : null}
          </div>

          {pet.listingType === 'LOST_FOUND' ? (
            <p className="auth-footnote">
              Lost &amp; found listings do not accept adoption requests. Use reports for
              moderation issues and the map to verify location details.
            </p>
          ) : null}

          {showRequestForm ? (
            <form className="chat-form" onSubmit={handleAdoptionRequest}>
              <textarea
                value={requestMessage}
                onChange={(event) => setRequestMessage(event.target.value)}
                rows={3}
                placeholder="Add a short note for the rescue team..."
              />
              <div className="inline-actions">
                <button type="submit" className="auth-submit">
                  Send Request
                </button>
                <button
                  type="button"
                  className="inline-link"
                  onClick={() => {
                    setShowRequestForm(false);
                    setRequestMessage('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          {showReportForm ? (
            <form className="chat-form" onSubmit={handleReport}>
              <input
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                placeholder="Report reason"
              />
              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                rows={3}
                placeholder="Additional details (optional)"
              />
              <div className="inline-actions">
                <button type="submit" className="auth-submit">
                  Submit Report
                </button>
                <button
                  type="button"
                  className="inline-link"
                  onClick={() => {
                    setShowReportForm(false);
                    setReportDetails('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          {actionState.error ? <p className="error-text">{actionState.error}</p> : null}
          {actionState.success ? <p className="success-text">{actionState.success}</p> : null}
        </RevealStagger>
      </div>

      <section className="section-card details-story">
        <h2>Backstory</h2>
        <p>{pet.story || 'No additional backstory shared yet.'}</p>
      </section>
    </PageTransition>
  );
}
