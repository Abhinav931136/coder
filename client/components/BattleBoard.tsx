import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiFetch } from "@/lib/api";
import { TrophyIcon, CrownIcon } from "lucide-react";

const BattleBoard = () => {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // request battles-only leaderboard
        const resp = await apiFetch("/api/leaderboard?type=battles");
        const d = await resp.json().catch(() => null);
        if (resp.ok && d?.success && Array.isArray(d.data?.items)) {
          // ensure only users with battlePoints are displayed
          const items = d.data.items.filter((u: any) => (u.battlePoints || u.stats?.battlesWon || 0) > 0);
          if (mounted) setLeaders(items.slice(0, 10));
        } else {
          if (mounted) setLeaders([]);
        }
      } catch (e) {
        if (mounted) setLeaders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  return (
    <Card className="bg-white shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrophyIcon className="h-5 w-5 text-amber-500" /> Battle Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading leaderboard...</div>
          ) : leaders.length === 0 ? (
            <div className="text-sm text-muted-foreground">No battle participants yet</div>
          ) : (
            leaders.map((u, idx) => (
              <div
                key={u.username || idx}
                className="flex items-center justify-between gap-3 rounded p-2 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.avatar || u.profile_image || ""} />
                    <AvatarFallback>{(u.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="font-semibold text-sm">{u.fullName || u.username}</div>
                    <div className="text-xs text-muted-foreground">{u.username}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-muted-foreground">#{u.rank || idx + 1}</div>
                  <div className="text-lg font-bold text-brand-600 mt-1">{(u.battlePoints ?? u.battle_points ?? u.stats?.battlesWon) || 0} pts</div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BattleBoard;
