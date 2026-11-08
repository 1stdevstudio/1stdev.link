import React from 'react';

/** Inline SVG keeps the logo available on both Pages and the custom-domain Worker. */
export const BrandMark: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 112 112"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    focusable="false"
  >
      <path fill="#0DAD62" d="M27 25c0-4 2-7 6-9L78 1c11-4 19 2 19 13v50c0 8-3 13-10 17l-10 6V34c0-11-7-16-16-12L27 39z" />
      <path fill="#91D6AE" d="M26 34c0-3 2-6 5-7L70 12c10-4 18 2 18 13v41c0 7-4 12-10 15l-9 5V37c0-9-7-14-16-10L26 41z" />
      <path fill="#064A36" d="M14 50 56 32c10-4 18 2 18 13v38c0 8-4 13-11 17l-29 12c-8 4-14 0-14-8V72L9 77C2 80 0 76 0 69V63c0-6 4-10 14-13z" />
  </svg>
);
