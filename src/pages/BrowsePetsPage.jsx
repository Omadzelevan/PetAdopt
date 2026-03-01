import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MagneticButton } from '../components/MagneticButton';
import { PageTransition } from '../components/PageTransition';
import { PetCard } from '../components/PetCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { usePetStore } from '../store/petStore';
import { filterPets, uniqueValues } from '../utils/filterPets';

const ageOptions = [
  { value: 'all', label: 'All Ages' },
  { value: 'baby', label: 'Baby' },
  { value: 'young', label: 'Young' },
  { value: 'adult', label: 'Adult' },
  { value: 'senior', label: 'Senior' },
];

const genderOptions = ['all', 'Female', 'Male'];
const sizeOptions = ['all', 'Small', 'Medium', 'Large'];
const listingTypeOptions = [
  { value: 'all', label: 'All Listings' },
  { value: 'ADOPTION', label: 'Adoption' },
  { value: 'FOSTER', label: 'Foster' },
  { value: 'LOST_FOUND', label: 'Lost & Found' },
];

export default function BrowsePetsPage() {
  const pets = usePetStore((state) => state.pets);
  const filters = usePetStore((state) => state.filters);
  const setFilter = usePetStore((state) => state.setFilter);
  const resetFilters = usePetStore((state) => state.resetFilters);

  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadingTimerRef = useRef(null);

  const filteredPets = useMemo(() => filterPets(pets, filters), [pets, filters]);
  const breeds = useMemo(() => uniqueValues(pets, 'breed'), [pets]);
  const locations = useMemo(() => uniqueValues(pets, 'location'), [pets]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 280);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(
    () => () => {
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current);
      }
    },
    [],
  );

  function runLoadingTransition() {
    setLoading(true);
    if (loadingTimerRef.current) {
      window.clearTimeout(loadingTimerRef.current);
    }
    loadingTimerRef.current = window.setTimeout(() => setLoading(false), 220);
  }

  function updateFilter(key, value) {
    setFilter(key, value);
    runLoadingTransition();
  }

  function clearFilters() {
    resetFilters();
    runLoadingTransition();
  }

  return (
    <PageTransition>
      <section className="section-card browse-top">
        <div>
          <p className="eyebrow">Browse and filter adoptable animals</p>
          <h1>Find the right companion in minutes</h1>
        </div>

        <MagneticButton
          variant="ghost"
          size="sm"
          className="filter-toggle-mobile"
          aria-expanded={showFilters}
          aria-controls="filters-panel"
          onClick={() => setShowFilters((open) => !open)}
        >
          {showFilters ? 'Close Filters' : 'Open Filters'}
        </MagneticButton>
      </section>

      <div className="browse-layout">
        <aside
          id="filters-panel"
          className={`filter-panel section-card ${showFilters ? 'is-open' : ''}`}
          aria-label="Pet filters"
        >
          <div className="filter-row">
            <label htmlFor="listingType">Listing Type</label>
            <select
              id="listingType"
              value={filters.listingType}
              onChange={(event) => updateFilter('listingType', event.target.value)}
            >
              {listingTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-row">
            <label htmlFor="breed">Breed</label>
            <select
              id="breed"
              value={filters.breed}
              onChange={(event) => updateFilter('breed', event.target.value)}
            >
              <option value="all">All Breeds</option>
              {breeds.map((breed) => (
                <option key={breed} value={breed}>
                  {breed}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-row">
            <label htmlFor="age">Age</label>
            <select
              id="age"
              value={filters.age}
              onChange={(event) => updateFilter('age', event.target.value)}
            >
              {ageOptions.map((age) => (
                <option key={age.value} value={age.value}>
                  {age.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-row">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              value={filters.gender}
              onChange={(event) => updateFilter('gender', event.target.value)}
            >
              {genderOptions.map((gender) => (
                <option key={gender} value={gender}>
                  {gender === 'all' ? 'All Genders' : gender}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-row">
            <label htmlFor="size">Size</label>
            <select
              id="size"
              value={filters.size}
              onChange={(event) => updateFilter('size', event.target.value)}
            >
              {sizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size === 'all' ? 'All Sizes' : size}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-row">
            <label htmlFor="location">Location</label>
            <select
              id="location"
              value={filters.location}
              onChange={(event) => updateFilter('location', event.target.value)}
            >
              <option value="all">All Locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <MagneticButton variant="secondary" size="sm" onClick={clearFilters}>
            Reset Filters
          </MagneticButton>
        </aside>

        <section className="browse-content section-card">
          <div className="results-head">
            <p>
              Showing <strong>{filteredPets.length}</strong> pets
            </p>
            <p>Grid updates with smooth animated transitions on every filter change.</p>
          </div>

          <LayoutGroup>
            <motion.div layout className="pet-grid browse-grid">
              {loading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <SkeletonCard key={index} />
                  ))
                : null}

              {!loading ? (
                <AnimatePresence>
                  {filteredPets.map((pet) => (
                    <motion.div
                      key={pet.id}
                      layout
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -18 }}
                      transition={{ duration: 0.32 }}
                    >
                      <PetCard pet={pet} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : null}
            </motion.div>
          </LayoutGroup>

          {!loading && filteredPets.length === 0 ? (
            <div className="empty-state">
              <h3>No pets matched these filters</h3>
              <p>Try broadening location or age filters to see more companions.</p>
              <MagneticButton onClick={clearFilters} variant="primary" size="sm">
                Clear Filters
              </MagneticButton>
            </div>
          ) : null}
        </section>
      </div>
    </PageTransition>
  );
}
