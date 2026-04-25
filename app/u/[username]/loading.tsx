export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        <div className="space-y-2">
          <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
