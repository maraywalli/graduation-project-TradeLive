export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-pulse">
      <div className="h-10 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
