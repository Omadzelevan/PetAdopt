import { MagneticButton } from '../components/MagneticButton';
import { PageTransition } from '../components/PageTransition';

export default function NotFoundPage() {
  return (
    <PageTransition>
      <section className="section-card not-found">
        <p className="eyebrow">404</p>
        <h1>Page Not Found</h1>
        <p>The page you requested does not exist. Return to the adoption home.</p>
        <MagneticButton to="/" variant="primary">
          Go Home
        </MagneticButton>
      </section>
    </PageTransition>
  );
}
