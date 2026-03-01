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

  const [pet, setPet] = useState(() => getPetById(id));
  const [loading, setLoading] = useState(!pet);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [actionState, setActionState] = useState({ error: '', success: '' });

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
      const remotePet = await fetchPetById(id);

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
  }, [fetchPetById, getPetById, id]);

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

  function requireAuth() {
    if (!token) {
      navigate('/auth');
      return false;
    }

    return true;
  }

  async function handleSaveToggle() {
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

  async function handleAdoptionRequest() {
    if (!requireAuth()) {
      return;
    }

    const message = window.prompt('Add a short note for the rescue team (optional):', '');

    setActionState({ error: '', success: '' });

    try {
      await apiRequest('/adoptions', {
        method: 'POST',
        token,
        body: {
          petId: pet.id,
          message: message || '',
        },
      });

      setActionState({
        error: '',
        success: 'Adoption request sent successfully.',
      });
    } catch (error) {
      setActionState({ error: error.message, success: '' });
    }
  }

  async function handleReport() {
    if (!requireAuth()) {
      return;
    }

    const reason = window.prompt('Report reason (required):', 'Suspicious information');

    if (!reason) {
      return;
    }

    const details = window.prompt('Additional details (optional):', '');

    setActionState({ error: '', success: '' });

    try {
      await apiRequest('/reports', {
        method: 'POST',
        token,
        body: {
          petId: pet.id,
          reason,
          details: details || '',
        },
      });

      setActionState({
        error: '',
        success: 'Report submitted for moderation review.',
      });
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
            <MagneticButton className="cta-pulse" variant="primary" onClick={handleAdoptionRequest}>
              Start Adoption Request
            </MagneticButton>
            <MagneticButton
              variant={saved ? 'secondary' : 'ghost'}
              onClick={handleSaveToggle}
            >
              {saved ? 'Saved' : 'Save Pet'}
            </MagneticButton>
            <MagneticButton variant="ghost" size="sm" onClick={handleReport}>
              Report Animal
            </MagneticButton>
            {mapsUrl ? (
              <MagneticButton variant="ghost" size="sm" href={mapsUrl} target="_blank" rel="noreferrer">
                Open Map
              </MagneticButton>
            ) : null}
          </div>

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
