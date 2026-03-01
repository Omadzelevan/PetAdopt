import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePetStore } from '../store/petStore';
import { MagneticButton } from './MagneticButton';

function shortTemperament(temperament) {
  return temperament.slice(0, 2).join(' | ');
}

export function PetCard({ pet }) {
  const navigate = useNavigate();
  const savedIds = usePetStore((state) => state.savedIds);
  const toggleSaved = usePetStore((state) => state.toggleSaved);
  const token = useAuthStore((state) => state.token);
  const saved = savedIds.includes(pet.id);

  async function handleSave() {
    const result = await toggleSaved(pet.id, token);

    if (result?.requiresAuth) {
      navigate('/auth');
    }
  }

  return (
    <motion.article layout className="pet-card" whileHover={{ y: -6 }}>
      <Link
        className="pet-card-image-wrap"
        to={`/pets/${pet.id}`}
        aria-label={`View details for ${pet.name}`}
      >
        <img src={pet.images[0]} alt={`${pet.name} the ${pet.breed}`} loading="lazy" />
        <span className="pet-card-badge">{pet.species}</span>
      </Link>

      <div className="pet-card-body">
        <div className="pet-card-head">
          <div>
            <h3>
              <Link to={`/pets/${pet.id}`}>{pet.name}</Link>
            </h3>
            <p>{pet.breed}</p>
          </div>

          <button
            type="button"
            className={`heart-btn ${saved ? 'saved' : ''}`}
            onClick={handleSave}
            aria-label={saved ? `Remove ${pet.name} from saved` : `Save ${pet.name}`}
          >
            <span className="heart-icon" aria-hidden="true" />
          </button>
        </div>

        <ul className="pet-meta" aria-label="Pet details">
          <li>{pet.age}</li>
          <li>{pet.gender}</li>
          <li>{pet.location}</li>
        </ul>

        <p className="pet-temperament">{shortTemperament(pet.temperament)}</p>

        <MagneticButton to={`/pets/${pet.id}`} variant="secondary" size="sm">
          Adopt Me
        </MagneticButton>
      </div>
    </motion.article>
  );
}
