/** Shown instantly while the next page's code loads during navigation. */
export default function Loading() {
  return (
    <div className="fixed top-0 inset-x-0 z-50 h-0.5 overflow-hidden" role="progressbar" aria-label="Loading page">
      <div className="h-full w-1/3 bg-[#c8ff00]/80 pp-progress" />
    </div>
  );
}
