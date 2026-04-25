export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-pulse">
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded-3xl h-48" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
