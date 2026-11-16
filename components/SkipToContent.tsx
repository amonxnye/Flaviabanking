'use client';

const SkipToContent = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-surface focus:text-brand focus:shadow-float focus:outline-none focus:ring-2 focus:ring-brand font-medium"
    >
      Skip to main content
    </a>
  );
};

export default SkipToContent;
