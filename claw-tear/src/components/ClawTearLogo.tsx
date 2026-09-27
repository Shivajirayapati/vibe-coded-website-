import React from 'react';

interface ClawTearLogoProps {
  className?: string;
}

export const ClawTearLogo: React.FC<ClawTearLogoProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Sleek, sharp geometric Claw Tear icon */}
      <path
        d="M6 3.5C6 3.5 7.8 8.5 7.2 13.5C6.7 17.5 5 20.5 5 20.5C5 20.5 8.5 18 9.5 13C10.3 9 9 3.5 9 3.5"
        fill="currentColor"
      />
      <path
        d="M11 2.5C11 2.5 13 8 12.3 14C11.8 18.5 10 21.5 10 21.5C10 21.5 14 18.8 15 13.2C15.8 8.8 14.2 2.5 14.2 2.5"
        fill="currentColor"
      />
      <path
        d="M16 4C16 4 17.8 8.8 17.2 13.8C16.8 17.5 15.5 20 15.5 20C15.5 20 18.8 17.8 19.5 13C20.2 9.2 18.8 4 18.8 4"
        fill="currentColor"
      />
    </svg>
  );
};
