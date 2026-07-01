"use client";

/** Visually hidden until focused — jumps keyboard/screen-reader users to main content. */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-farumasi-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
    >
      Skip to main content
    </a>
  );
}
