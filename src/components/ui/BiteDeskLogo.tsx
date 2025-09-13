import React from 'react';

interface BiteDeskLogoProps {
  className?: string;
  iconOnly?: boolean;
}

const BiteDeskLogo: React.FC<BiteDeskLogoProps> = ({ className, iconOnly = false }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <svg
        className="w-8 h-8 text-blue-700"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        <g transform="rotate(-20 12 12) translate(-1, 1)">
            <path d="M12 15V7" />
            <path d="M12 7c0-1.1.9-2 2-2s2 .9 2 2" />
            <path d="M12 7c0-1.1-.9-2-2-2s-2 .9-2 2" />
        </g>
      </svg>
      {!iconOnly && <span className="text-2xl font-bold text-gray-800">BiteDesk</span>}
    </div>
  );
};

export default BiteDeskLogo;
