import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { MagneticButton } from '../components/MagneticButton';
import { PageTransition } from '../components/PageTransition';
import { PetCard } from '../components/PetCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { usePetStore } from '../store/petStore';

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
  const facets = usePetStore((state) => state.facets);
  const page = usePetStore((state) => state.page);
  const totalCount = usePetStore((state) => state.totalCount);
  const totalPages = usePetStore((state) => state.totalPages);
  const loading = usePetStore((state) => state.loading);
  const error = usePetStore((state) => state.error);
  const setFilter = usePetStore((state) => state.setFilter);
  const resetFilters = usePetStore((state) => state.resetFilters);
  const setPage = usePetStore((state) => state.setPage);
  const fetchPets = usePetStore((state) => state.fetchPets);
  const fetchFacets = usePetStore((state) => state.fetchFacets);

  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search);
  const deferredSearch = useDeferredValue(searchInput);

  useEffect(() => {
    void fetchFacets();
  }, [fetchFacets]);

  useEffect(() => {
    if (deferredSearch !== filters.search) {
      startTransition(() => {
        setFilter('search', deferredSearch.trim());
      });
    }
  }, [deferredSearch, filters.search, setFilter]);

  useEffect(() => {
    void fetchPets();
  }, [fetchPets, filters, page]);

  function updateFilter(key, value) {
    startTransition(() => {
      setFilter(key, value);
    });
  }

  function clearFilters() {
    setSearchInput('');
    startTransition(() => {
      resetFilters();
    });
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
            <label htmlFor="search">Search</label>
            <input
              id="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name, breed, location..."
            />
          </div>

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
              {facets.breeds.map((breed) => (
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
              {facets.locations.map((location) => (
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
              Showing <strong>{totalCount}</strong> pets
            </p>
            <p>
              {loading
                ? 'Refreshing results from live listings...'
                : 'Filters now query the live backend, with search and paging included.'}
            </p>
          </div>

          {error ? <p className="error-text">{error}</p> : null}

          <LayoutGroup>
            <motion.div layout className="pet-grid browse-grid">
              {loading && pets.length === 0
                ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
                : null}

              {!loading || pets.length > 0 ? (
                <AnimatePresence>
                  {pets.map((pet) => (
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

          {!loading && pets.length === 0 ? (
            <div className="empty-state">
              <h3>No pets matched these filters</h3>
              <p>Try broadening your search or clearing some filters.</p>
              <MagneticButton onClick={clearFilters} variant="primary" size="sm">
                Clear Filters
              </MagneticButton>
            </div>
          ) : null}

          <div className="inline-actions" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="inline-link"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
            >
              Previous Page
            </button>
            <span className="status-pill">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="inline-link"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
            >
              Next Page
            </button>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
