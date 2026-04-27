import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { howItWorksSteps } from '../data/pets';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { MagneticButton } from '../components/MagneticButton';
import { PageTransition } from '../components/PageTransition';
import { PetCard } from '../components/PetCard';
import { Reveal, RevealStagger } from '../components/ScrollReveal';
import { usePetStore } from '../store/petStore';

const heroTitle = 'Give Them a Second Chance';

export default function HomePage() {
  const featuredPets = usePetStore((state) => state.featuredPets);
  const stats = usePetStore((state) => state.stats);
  const featuredLoading = usePetStore((state) => state.featuredLoading);
  const fetchFeaturedPets = usePetStore((state) => state.fetchFeaturedPets);
  const fetchPetStats = usePetStore((state) => state.fetchPetStats);

  useEffect(() => {
    void Promise.all([fetchFeaturedPets(), fetchPetStats()]);
  }, [fetchFeaturedPets, fetchPetStats]);

  return (
    <PageTransition>
      <section className="hero-section section-card">
        <p className="eyebrow">Digital shelter for adoption, foster, and recovery</p>

        <h1 className="hero-title" aria-label={heroTitle}>
          {heroTitle.split('').map((char, index) => (
            <motion.span
              key={`${char}-${index}`}
              className="hero-letter"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035, duration: 0.4 }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </h1>

        <p className="hero-subtitle">
          PetAdopt combines verified listings, foster coordination, lost-pet support,
          and organization collaboration in one clean experience.
        </p>

        <div className="hero-actions">
          <MagneticButton to="/pets" variant="primary" className="breathing">
            Start Adopting
          </MagneticButton>
          <MagneticButton to="/post" variant="ghost">
            Post Animal
          </MagneticButton>
        </div>

        <div className="hero-metrics">
          <article className="metric-card">
            <p className="metric-value">
              <AnimatedCounter from={0} to={stats.activeListings} duration={2.4} />
            </p>
            <p className="metric-label">Active listings</p>
          </article>

          <article className="metric-card">
            <p className="metric-value">
              <AnimatedCounter from={0} to={stats.featuredPets} duration={2.1} />
            </p>
            <p className="metric-label">Featured listings</p>
          </article>

          <article className="metric-card">
            <p className="metric-value">
              <AnimatedCounter from={0} to={stats.fosterListings} duration={2.1} />
            </p>
            <p className="metric-label">Foster listings</p>
          </article>

          <article className="metric-card">
            <p className="metric-value">
              <AnimatedCounter from={0} to={stats.lostFoundListings} duration={2.1} />
            </p>
            <p className="metric-label">Lost & found alerts</p>
          </article>
        </div>
      </section>

      <Reveal className="section-card section-block">
        <div className="section-heading">
          <h2>Featured Pets</h2>
          <MagneticButton to="/pets" variant="ghost" size="sm">
            View all
          </MagneticButton>
        </div>

        <div className="pet-grid">
          {featuredLoading && featuredPets.length === 0
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="metric-card">
                  Loading featured pets...
                </div>
              ))
            : featuredPets.map((pet) => <PetCard key={pet.id} pet={pet} />)}
        </div>
      </Reveal>

      <RevealStagger className="section-card section-block">
        <div className="section-heading">
          <h2>How It Works</h2>
          <p>Clear 3-step flow designed for speed, trust, and emotional confidence.</p>
        </div>

        <div className="steps-grid">
          {howItWorksSteps.map((step, index) => (
            <article key={step.title} className="step-card">
              <p className="step-index">0{index + 1}</p>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </RevealStagger>

      <Reveal className="section-card counter-block">
        <h2>Partner Network</h2>
        <p className="counter-value">
          <AnimatedCounter from={0} to={stats.partnerOrganizations} duration={2.8} />+
        </p>
        <p className="counter-copy">
          Rescue organizations already connected through the PetAdopt network.
        </p>

        <div className="counter-actions">
          <MagneticButton to="/dashboard" variant="secondary">
            Open Dashboard
          </MagneticButton>
          <MagneticButton to="/auth" variant="ghost">
            Join Community
          </MagneticButton>
        </div>
      </Reveal>
    </PageTransition>
  );
}
