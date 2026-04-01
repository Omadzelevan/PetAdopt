import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MagneticButton } from '../components/MagneticButton';
import { PageTransition } from '../components/PageTransition';
import { useAuthStore } from '../store/authStore';
import { usePetStore } from '../store/petStore';

const steps = ['Basic Info', 'Photos Upload', 'Health Details', 'Confirmation'];

const initialForm = {
  name: '',
  species: 'Dog',
  listingType: 'ADOPTION',
  breed: '',
  age: '',
  gender: 'Female',
  size: 'Medium',
  location: '',
  health: '',
  notes: '',
  photos: [],
  agree: false,
};

function buildDescription(form) {
  const notes = form.notes.trim();
  const health = form.health.trim();

  if (notes) {
    return notes;
  }

  return `Health summary: ${health}`;
}

function validateStep(step, form) {
  const errors = {};

  if (step === 0) {
    if (form.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }
    if (form.breed.trim().length < 2) {
      errors.breed = 'Breed must be at least 2 characters.';
    }
    if (!form.age.trim()) {
      errors.age = 'Age is required.';
    }
    if (!form.location.trim()) {
      errors.location = 'Location is required.';
    }
  }

  if (step === 1 && form.photos.length === 0) {
    errors.photos = 'Upload at least one photo.';
  }

  if (step === 2) {
    if (form.health.trim().length < 3) {
      errors.health = 'Health summary must be at least 3 characters.';
    }

    if (buildDescription(form).trim().length < 10) {
      errors.notes = 'Add a bit more detail for the listing description.';
    }
  }

  if (step === 3 && !form.agree) {
    errors.agree = 'Please confirm the information is accurate.';
  }

  return errors;
}

function inferAgeGroup(age) {
  const normalized = String(age || '').toLowerCase();

  if (normalized.includes('month') || normalized.includes('puppy') || normalized.includes('kitten')) {
    return 'baby';
  }

  const numericAge = Number.parseFloat(normalized);
  if (!Number.isNaN(numericAge)) {
    if (numericAge < 1) {
      return 'baby';
    }
    if (numericAge < 3) {
      return 'young';
    }
    if (numericAge < 7) {
      return 'adult';
    }
    return 'senior';
  }

  return 'adult';
}

export default function PostAnimalPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const token = useAuthStore((state) => state.token);
  const createPet = usePetStore((state) => state.createPet);

  const progress = ((step + 1) / steps.length) * 100;
  const photoItems = useMemo(
    () =>
      form.photos.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
      })),
    [form.photos],
  );

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function triggerShake() {
    setIsShaking(false);
    window.requestAnimationFrame(() => setIsShaking(true));
    window.setTimeout(() => setIsShaking(false), 420);
  }

  function applyValidation(currentStep) {
    const validationErrors = validateStep(currentStep, form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      triggerShake();
      return false;
    }

    return true;
  }

  function handlePhotoInput(files) {
    const nextFiles = Array.from(files || []);
    if (nextFiles.length === 0) {
      return;
    }

    setForm((current) => ({
      ...current,
      photos: [...current.photos, ...nextFiles].slice(0, 6),
    }));

    setErrors((current) => ({ ...current, photos: undefined }));
  }

  function goNext() {
    if (!applyValidation(step)) {
      return;
    }
    setErrors({});
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
  }

  async function submitForm(event) {
    event.preventDefault();

    if (!applyValidation(step)) {
      return;
    }

    if (!token) {
      setErrors((current) => ({
        ...current,
        submit: 'Please sign in before publishing a listing.',
      }));
      return;
    }

    setIsSubmitting(true);

    try {
      const description = buildDescription(form);
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('species', form.species.trim());
      formData.append('breed', form.breed.trim());
      formData.append('age', form.age.trim());
      formData.append('ageGroup', inferAgeGroup(form.age));
      formData.append('gender', form.gender.trim());
      formData.append('size', form.size.trim());
      formData.append('location', form.location.trim());
      formData.append('health', form.health.trim());
      formData.append('description', description);

      if (form.notes.trim()) {
        formData.append('story', form.notes.trim());
      }

      formData.append('listingType', form.listingType.trim());

      form.photos.forEach((file) => {
        formData.append('photos', file);
      });

      await createPet({ formData, token });
      setSubmitted(true);
    } catch (error) {
      const fieldErrors = error.details?.fieldErrors;

      setErrors((current) => ({
        ...current,
        name: fieldErrors?.name?.[0] || current.name,
        breed: fieldErrors?.breed?.[0] || current.breed,
        age: fieldErrors?.age?.[0] || current.age,
        location: fieldErrors?.location?.[0] || current.location,
        health: fieldErrors?.health?.[0] || current.health,
        notes: fieldErrors?.description?.[0] || current.notes,
        submit: error.message,
      }));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <PageTransition>
        <section className="section-card success-card">
          <div className="success-check" aria-hidden="true" />
          <h1>Listing Submitted</h1>
          <p>
            Your post is now in moderation. Once approved, it will appear in Browse Pets
            and organization feeds.
          </p>
          <MagneticButton to="/dashboard" variant="primary">
            Open Dashboard
          </MagneticButton>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <section className="section-card post-shell">
        {!token ? (
          <p className="auth-footnote">
            You need an account to publish listings. <Link to="/auth">Sign in here</Link>.
          </p>
        ) : null}
        <p className="eyebrow">Post an Animal</p>
        <h1>Multi-step rescue intake form</h1>

        <div className="steps-line">
          {steps.map((label, index) => (
            <span key={label} className={index <= step ? 'is-active' : ''}>
              {label}
            </span>
          ))}
        </div>

        <div className="progress-track" aria-hidden="true">
          <motion.span
            className="progress-fill"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>

        <form
          className={`post-form ${isShaking ? 'is-shaking' : ''}`}
          onSubmit={submitForm}
          noValidate
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="step-panel"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
            >
              {step === 0 ? (
                <div className="form-grid">
                  <label>
                    Pet Name
                    <input
                      name="name"
                      value={form.name}
                      onChange={updateField}
                      placeholder="Milo"
                    />
                    {errors.name ? <small className="error-text">{errors.name}</small> : null}
                  </label>

                  <label>
                    Listing Type
                    <select name="listingType" value={form.listingType} onChange={updateField}>
                      <option value="ADOPTION">Adoption</option>
                      <option value="FOSTER">Foster</option>
                      <option value="LOST_FOUND">Lost &amp; Found</option>
                    </select>
                  </label>

                  <label>
                    Species
                    <select name="species" value={form.species} onChange={updateField}>
                      <option>Dog</option>
                      <option>Cat</option>
                    </select>
                  </label>

                  <label>
                    Breed
                    <input
                      name="breed"
                      value={form.breed}
                      onChange={updateField}
                      placeholder="Golden Retriever"
                    />
                    {errors.breed ? <small className="error-text">{errors.breed}</small> : null}
                  </label>

                  <label>
                    Age
                    <input
                      name="age"
                      value={form.age}
                      onChange={updateField}
                      placeholder="2 years"
                    />
                    {errors.age ? <small className="error-text">{errors.age}</small> : null}
                  </label>

                  <label>
                    Gender
                    <select name="gender" value={form.gender} onChange={updateField}>
                      <option>Female</option>
                      <option>Male</option>
                    </select>
                  </label>

                  <label>
                    Size
                    <select name="size" value={form.size} onChange={updateField}>
                      <option>Small</option>
                      <option>Medium</option>
                      <option>Large</option>
                    </select>
                  </label>

                  <label className="full-width">
                    Location
                    <input
                      name="location"
                      value={form.location}
                      onChange={updateField}
                      placeholder="Tbilisi"
                    />
                    {errors.location ? (
                      <small className="error-text">{errors.location}</small>
                    ) : null}
                  </label>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="upload-step">
                  <label
                    className={`upload-dropzone ${dragOver ? 'is-dragover' : ''}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragOver(false);
                      handlePhotoInput(event.dataTransfer.files);
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => handlePhotoInput(event.target.files)}
                    />
                    <strong>Drop photos here or click to upload</strong>
                    <span>Up to 6 images. First image becomes card preview.</span>
                  </label>

                  {errors.photos ? <small className="error-text">{errors.photos}</small> : null}

                  {photoItems.length > 0 ? (
                    <ul className="file-list">
                      {photoItems.map((file) => (
                        <li key={file.id}>{file.name}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="form-grid">
                  <label className="full-width">
                    Health Information
                    <textarea
                      name="health"
                      value={form.health}
                      onChange={updateField}
                      rows={4}
                      placeholder="Vaccination status, conditions, medications..."
                    />
                    {errors.health ? <small className="error-text">{errors.health}</small> : null}
                  </label>

                  <label className="full-width">
                    Additional Notes
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={updateField}
                      rows={4}
                      placeholder="Temperament, behavior around kids, foster notes..."
                    />
                    {errors.notes ? <small className="error-text">{errors.notes}</small> : null}
                  </label>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="confirmation-step">
                  <h3>Review Before Submit</h3>

                  <ul>
                    <li>
                      <strong>Name:</strong> {form.name || '-'}
                    </li>
                    <li>
                      <strong>Species / Breed:</strong> {form.species} / {form.breed || '-'}
                    </li>
                    <li>
                      <strong>Listing Type:</strong> {form.listingType.replace('_', ' ')}
                    </li>
                    <li>
                      <strong>Age / Gender / Size:</strong> {form.age || '-'} / {form.gender} /{' '}
                      {form.size}
                    </li>
                    <li>
                      <strong>Location:</strong> {form.location || '-'}
                    </li>
                    <li>
                      <strong>Photos:</strong> {form.photos.length}
                    </li>
                  </ul>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      name="agree"
                      checked={form.agree}
                      onChange={updateField}
                    />
                    I confirm the listing details are accurate.
                  </label>
                  {errors.agree ? <small className="error-text">{errors.agree}</small> : null}
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          <div className="step-actions">
            {step > 0 ? (
              <MagneticButton type="button" variant="ghost" onClick={goBack}>
                Back
              </MagneticButton>
            ) : (
              <span aria-hidden="true" />
            )}

            {step < steps.length - 1 ? (
              <MagneticButton type="button" variant="primary" onClick={goNext}>
                Next Step
              </MagneticButton>
            ) : (
              <button
                className={`submit-btn ${isSubmitting ? 'loading' : ''}`}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? <span className="spinner" /> : 'Publish Listing'}
              </button>
            )}
          </div>
          {errors.submit ? <p className="error-text">{errors.submit}</p> : null}
        </form>
      </section>
    </PageTransition>
  );
}
