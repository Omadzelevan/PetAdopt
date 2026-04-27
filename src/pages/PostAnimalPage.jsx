import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MagneticButton } from '../components/MagneticButton';
import { PageTransition } from '../components/PageTransition';
import {
  buildDescription,
  getListingTypeGuidance,
  inferAgeGroup,
  initialPostForm,
  postSteps,
  validatePostStep,
} from '../lib/postPetForm';
import { useAuthStore } from '../store/authStore';
import { usePetStore } from '../store/petStore';

function buildPhotoId(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function PostAnimalPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialPostForm);
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const token = useAuthStore((state) => state.token);
  const createPet = usePetStore((state) => state.createPet);

  const progress = ((step + 1) / postSteps.length) * 100;
  const listingGuidance = getListingTypeGuidance(form.listingType);
  const photoItems = useMemo(
    () =>
      form.photos.map((file) => ({
        id: buildPhotoId(file),
        name: file.name,
        previewUrl: URL.createObjectURL(file),
      })),
    [form.photos],
  );

  useEffect(
    () => () => {
      photoItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    },
    [photoItems],
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
    const validationErrors = validatePostStep(currentStep, form);
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
      photos: [...current.photos, ...nextFiles]
        .slice(0, 6)
        .filter(
          (file, index, list) =>
            list.findIndex((entry) => buildPhotoId(entry) === buildPhotoId(file)) === index,
        ),
    }));

    setErrors((current) => ({ ...current, photos: undefined }));
  }

  function removePhoto(id) {
    setForm((current) => ({
      ...current,
      photos: current.photos.filter((file) => buildPhotoId(file) !== id),
    }));
  }

  function goNext() {
    if (!applyValidation(step)) {
      return;
    }
    setErrors({});
    setStep((current) => Math.min(current + 1, postSteps.length - 1));
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

      if (form.latitude.trim()) {
        formData.append('latitude', form.latitude.trim());
      }

      if (form.longitude.trim()) {
        formData.append('longitude', form.longitude.trim());
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
        latitude: fieldErrors?.latitude?.[0] || current.latitude,
        longitude: fieldErrors?.longitude?.[0] || current.longitude,
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
      <section className="section-card post-shell post-shell-enhanced">
        <div className="post-header">
          <div>
            {!token ? (
              <p className="auth-footnote">
                You need an account to publish listings. <Link to="/auth">Sign in here</Link>.
              </p>
            ) : null}
            <p className="eyebrow">Post an Animal</p>
            <h1>Build a clear, trustworthy rescue listing</h1>
            <p className="post-subcopy">
              The stronger the details, the faster moderators and adopters can respond with
              confidence.
            </p>
          </div>

          <div className="post-guidance-card">
            <span className="status-pill">Current flow</span>
            <p>{listingGuidance}</p>
          </div>
        </div>

        <div className="steps-line">
          {postSteps.map((label, index) => (
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

        <div className="post-layout">
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

                    {form.listingType === 'LOST_FOUND' ? (
                      <>
                        <label>
                          Latitude
                          <input
                            name="latitude"
                            value={form.latitude}
                            onChange={updateField}
                            placeholder="41.7151"
                          />
                          {errors.latitude ? (
                            <small className="error-text">{errors.latitude}</small>
                          ) : null}
                        </label>

                        <label>
                          Longitude
                          <input
                            name="longitude"
                            value={form.longitude}
                            onChange={updateField}
                            placeholder="44.8271"
                          />
                          {errors.longitude ? (
                            <small className="error-text">{errors.longitude}</small>
                          ) : null}
                        </label>
                      </>
                    ) : null}
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
                      <span>Up to 6 images. First image becomes the card preview.</span>
                    </label>

                    {errors.photos ? <small className="error-text">{errors.photos}</small> : null}

                    {photoItems.length > 0 ? (
                      <div className="photo-preview-grid">
                        {photoItems.map((file, index) => (
                          <article key={file.id} className="photo-preview-card">
                            <img src={file.previewUrl} alt={file.name} />
                            <div className="photo-preview-meta">
                              <strong>{index === 0 ? 'Cover image' : `Photo ${index + 1}`}</strong>
                              <span>{file.name}</span>
                            </div>
                            <button
                              type="button"
                              className="inline-link"
                              onClick={() => removePhoto(file.id)}
                            >
                              Remove
                            </button>
                          </article>
                        ))}
                      </div>
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

              {step < postSteps.length - 1 ? (
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

          <aside className="post-review-panel">
            <p className="eyebrow">Live Summary</p>
            <h2>{form.name || 'Unnamed listing'}</h2>
            <p className="post-review-subline">
              {form.listingType.replace('_', ' ')} | {form.species} | {form.location || 'Location pending'}
            </p>

            <div className="post-review-stack">
              <article className="post-review-card">
                <span className="status-pill">Moderation</span>
                <p>
                  Non-admin posts go through moderation before they become visible in public browse.
                </p>
              </article>

              <article className="post-review-card">
                <span className="status-pill">Description</span>
                <p>{buildDescription(form)}</p>
              </article>

              <article className="post-review-card">
                <span className="status-pill">Checklist</span>
                <ul>
                  <li>{form.photos.length > 0 ? 'Photos attached' : 'Add at least one photo'}</li>
                  <li>{form.health.trim() ? 'Health notes added' : 'Add health notes'}</li>
                  <li>{form.location.trim() ? 'Location set' : 'Set a location'}</li>
                </ul>
              </article>
            </div>
          </aside>
        </div>
      </section>
    </PageTransition>
  );
}
