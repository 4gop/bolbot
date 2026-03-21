import { useGetLeaderboard } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ArrowLeft, Trophy, Flame, Star, Medal } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

export default function LeaderboardPage() {
  const { data, isLoading, error } = useGetLeaderboard();

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return "bg-yellow-500/10 border-yellow-500/50 text-yellow-500";
      case 2: return "bg-gray-400/10 border-gray-400/50 text-gray-300";
      case 3: return "bg-amber-700/10 border-amber-700/50 text-amber-600";
      default: return "bg-secondary border-white/5 text-muted-foreground";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy size={20} className="text-yellow-500" fill="currentColor" />;
      case 2: return <Medal size={20} className="text-gray-300" fill="currentColor" />;
      case 3: return <Medal size={20} className="text-amber-600" fill="currentColor" />;
      default: return <span className="font-bold text-lg w-5 text-center">{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display font-bold text-xl">Weekly Leaderboard</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-8">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
            <Trophy size={36} className="text-primary" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-2">Top Scholars</h2>
          {data && (
            <p className="text-muted-foreground">
              {new Date(data.weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - 
              {new Date(data.weekEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-secondary/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center p-8 bg-destructive/10 rounded-2xl border border-destructive/20 text-destructive">
            Failed to load leaderboard.
          </div>
        )}

        {data && data.entries.length > 0 && (
          <div className="space-y-3">
            {data.entries.map((entry, idx) => (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.01]",
                  getRankStyle(entry.rank)
                )}
              >
                <div className="flex-shrink-0 w-8 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                
                <div className="w-12 h-12 rounded-full bg-black/50 overflow-hidden border border-white/10 flex-shrink-0">
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-white font-bold">
                      {entry.username ? entry.username.charAt(0).toUpperCase() : 'A'}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate text-base">
                    {entry.username || "Anonymous Learmer"}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {entry.platform}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                    <span>{formatNumber(entry.points)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-orange-400">
                    <Flame size={12} fill="currentColor" />
                    {entry.streakCount} day streak
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {data && data.entries.length === 0 && (
          <div className="text-center p-12 bg-secondary rounded-3xl border border-white/5">
            <Trophy size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">No entries yet</h3>
            <p className="text-muted-foreground">Be the first to get on the leaderboard this week!</p>
          </div>
        )}
      </main>
    </div>
  );
}
