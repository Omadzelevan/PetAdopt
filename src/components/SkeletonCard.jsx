export function SkeletonCard() {
  return (
    <article className="skeleton-card" aria-hidden="true">
      <div className="skeleton-media" />
      <div className="skeleton-row" />
      <div className="skeleton-row short" />
      <div className="skeleton-row" />
    </article>
  );
}
