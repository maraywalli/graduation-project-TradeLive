export function HomeSkeleton({ viewMode = 'classic' }: { viewMode?: 'classic' | 'bento' }) {
  if (viewMode === 'bento') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-pulse">
        <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          ))}
        </div>
        <ItemGridSkeleton />
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-pulse">
      <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full shrink-0" />
        ))}
      </div>
      <ItemGridSkeleton />
    </div>
  );
}

export function ItemGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          <div className="aspect-square bg-zinc-200 dark:bg-zinc-800" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
