import { useRef } from 'react';
import { Link } from 'react-router-dom';

function joinClassNames(...values) {
  return values.filter(Boolean).join(' ');
}

export function MagneticButton({
  children,
  to,
  href,
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...rest
}) {
  const wrapperRef = useRef(null);

  function handlePointerMove(event) {
    if (!window.matchMedia('(pointer:fine)').matches) {
      return;
    }

    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    const bounds = wrapper.getBoundingClientRect();
    const x = ((event.clientX - bounds.left - bounds.width / 2) / bounds.width) * 18;
    const y =
      ((event.clientY - bounds.top - bounds.height / 2) / bounds.height) * 18;

    wrapper.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function resetPosition() {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.style.transform = 'translate3d(0, 0, 0)';
    }
  }

  const buttonClassName = joinClassNames(
    'magnetic-btn',
    `variant-${variant}`,
    `size-${size}`,
  );

  return (
    <div
      ref={wrapperRef}
      className={joinClassNames('magnetic-wrap', className)}
      onMouseMove={handlePointerMove}
      onMouseLeave={resetPosition}
    >
      {to ? (
        <Link className={buttonClassName} to={to} {...rest}>
          {children}
        </Link>
      ) : href ? (
        <a className={buttonClassName} href={href} {...rest}>
          {children}
        </a>
      ) : (
        <button className={buttonClassName} type={type} {...rest}>
          {children}
        </button>
      )}
    </div>
  );
}
