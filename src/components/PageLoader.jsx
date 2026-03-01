export function PageLoader({ fullScreen = false }) {
  return (
    <div className={`paw-loader ${fullScreen ? 'is-fullscreen' : ''}`} role="status">
      <div className="paw-track" aria-hidden="true">
        <span className="paw paw-1" />
        <span className="paw paw-2" />
        <span className="paw paw-3" />
        <span className="paw paw-4" />
      </div>
      <p>Loading shelter...</p>
    </div>
  );
}
