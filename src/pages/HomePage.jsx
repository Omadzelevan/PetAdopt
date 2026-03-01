import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { adoptionStats, howItWorksSteps } from '../data/pets';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { MagneticButton } from '../components/MagneticButton';
import { PageTransition } from '../components/PageTransition';
import { PetCard } from '../components/PetCard';
import { Reveal, RevealStagger } from '../components/ScrollReveal';
import { usePetStore } from '../store/petStore';

const heroTitle = 'Give Them a Second Chance';

export default function HomePage() {
  const pets = usePetStore((state) => state.pets);
  const initialized = usePetStore((state) => state.initialized);
  const fetchPets = usePetStore((state) => state.fetchPets);

  useEffect(() => {
    if (!initialized) {
      fetchPets();
    }
  }, [fetchPets, initialized]);

  const featuredPets = useMemo(
    () => pets.filter((pet) => pet.featured).slice(0, 6),
    [pets],
  );

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
              <AnimatedCounter from={3200} to={adoptionStats.liveAdoptions} duration={2.4} />
            </p>
            <p className="metric-label">Successful adoptions</p>
          </article>

          <article className="metric-card">
            <p className="metric-value">
              <AnimatedCounter from={700} to={adoptionStats.fosterHomes} duration={2.1} />
            </p>
            <p className="metric-label">Active foster homes</p>
          </article>

          <article className="metric-card">
            <p className="metric-value">
              <AnimatedCounter from={540} to={adoptionStats.reunions} duration={2.1} />
            </p>
            <p className="metric-label">Lost pets reunited</p>
          </article>

          <article className="metric-card">
            <p className="metric-value">
              <AnimatedCounter from={30} to={adoptionStats.partnerOrganizations} duration={2.1} />
            </p>
            <p className="metric-label">Partner organizations</p>
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
          {featuredPets.map((pet) => (
            <PetCard key={pet.id} pet={pet} />
          ))}
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
        <h2>Live Adoption Counter</h2>
        <p className="counter-value">
          <AnimatedCounter from={3000} to={adoptionStats.liveAdoptions} duration={2.8} />+
        </p>
        <p className="counter-copy">
          Animals already matched with loving homes through the PetAdopt community.
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
