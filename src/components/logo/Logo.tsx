"use client";

import React from "react";
import Link from "next/link";

interface LogoProps {
  background?: string;
  width?: number;
  height?: number;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({
  background = "#6366f1",
  width = 40,
  height = 40,
  className,
}) => {
  return (
    <Link href="/" className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Squircle background */}
        <path
          d="M0 25.6C0 16.6392 0 12.1587 1.7439 8.73615C3.27787 5.72556 5.72556 3.27787 8.73615 1.7439C12.1587 0 16.6392 0 25.6 0H34.4C43.3608 0 47.8413 0 51.2638 1.7439C54.2744 3.27787 56.7221 5.72556 58.2561 8.73615C60 12.1587 60 16.6392 60 25.6V34.4C60 43.3608 60 47.8413 58.2561 51.2638C56.7221 54.2744 54.2744 56.7221 51.2638 58.2561C47.8413 60 43.3608 60 34.4 60H25.6C16.6392 60 12.1587 60 8.73615 58.2561C5.72556 56.7221 3.27787 54.2744 1.7439 51.2638C0 47.8413 0 43.3608 0 34.4V25.6Z"
          fill={background}
        />
        {/* Letter C */}
        <path
          d="M42 20C38.5 18.5 34 18 30 18C22 18 18 22 18 30C18 38 22 42 30 42C34 42 38.5 41.5 42 40"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </Link>
  );
};

export default Logo;
