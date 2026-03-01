import { animate, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export function AnimatedCounter({ from = 0, to = 100, duration = 2 }) {
  const counterRef = useRef(null);
  const inView = useInView(counterRef, { once: true, amount: 0.7 });
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!inView) {
      return undefined;
    }

    const controls = animate(from, to, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setValue(Math.floor(latest));
      },
    });

    return () => controls.stop();
  }, [duration, from, inView, to]);

  return <span ref={counterRef}>{value.toLocaleString()}</span>;
}
