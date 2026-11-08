import React from 'react';

/** Reusable layered-one brand mark for the public site and workspace. */
export const BrandMark: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className,
}) => (
  <img
    src="/brand/one-mark.svg"
    alt=""
    aria-hidden="true"
    width={size}
    height={size}
    className={className}
    draggable={false}
  />
);
