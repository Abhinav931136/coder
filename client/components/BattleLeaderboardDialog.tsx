import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api";
import { TrophyIcon } from "lucide-react";

const LeaderRow: React.FC<{ user: any; index: number }> = ({ user, index }) => {
  const name = user.fullName || user.username || "Unknown";
  const avatar = user.avatar || user.profile_image || "";
  const points =
    user.battlePoints ?? user.battle_points ?? user.stats?.battlesWon ?? 0;
  return (
    <div className="flex items-center justify-between gap-3 rounded p-2 hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar} />
          <AvatarFallback>
            {(user.username || "?").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div>
          <div className="font-semibold text-sm">{name}</div>
          <div className="text-xs text-muted-foreground">{user.username}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-muted-foreground">
          #{user.rank || index + 1}
        </div>
        <div className="text-lg font-bold text-brand-600 mt-1">
          {points} pts
        </div>
      </div>
    </div>
  );
};

const BattleLeaderboardDialog: React.FC = () => {
  const [compactLeaders, setCompactLeaders] = useState<any[]>([]);
  const [fullLeaders, setFullLeaders] = useState<any[]>([]);
  const [loadingCompact, setLoadingCompact] = useState(true);
  const [loadingFull, setLoadingFull] = useState(false);
  const [open, setOpen] = useState(false);

  // load compact (top 5) and poll
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingCompact(true);
      try {
        const resp = await apiFetch(
          "/api/leaderboard?type=battles&per_page=10",
        );
        const d = await resp.json().catch(() => null);
        if (resp.ok && d?.success && Array.isArray(d.data?.items)) {
          const items = d.data.items.filter(
            (u: any) => (u.battlePoints ?? u.stats?.battlesWon ?? 0) > 0,
          );
          if (mounted) setCompactLeaders(items.slice(0, 5));
        } else {
          if (mounted) setCompactLeaders([]);
        }
      } catch (e) {
        if (mounted) setCompactLeaders([]);
      } finally {
        if (mounted) setLoadingCompact(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  // load full leaderboard when dialog opens
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoadingFull(true);
    const loadFull = async () => {
      try {
        const resp = await apiFetch(
          "/api/leaderboard?type=battles&per_page=100",
        );
        const d = await resp.json().catch(() => null);
        if (resp.ok && d?.success && Array.isArray(d.data?.items)) {
          const items = d.data.items.filter(
            (u: any) => (u.battlePoints ?? u.stats?.battlesWon ?? 0) > 0,
          );
          if (mounted) setFullLeaders(items);
        } else {
          if (mounted) setFullLeaders([]);
        }
      } catch (e) {
        if (mounted) setFullLeaders([]);
      } finally {
        if (mounted) setLoadingFull(false);
      }
    };
    loadFull();
    const t = setInterval(loadFull, 15000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div>
        <DialogTrigger asChild>
          <Card className="bg-white shadow-md cursor-pointer hover:shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-center">
                <TrophyIcon className="h-10 w-10 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                {loadingCompact ? (
                  <span className="sr-only">Loading</span>
                ) : (
                  <span className="sr-only">Open Battle Leaderboard</span>
                )}
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Battle Leaderboard</DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          {loadingFull ? (
            <div className="text-sm text-muted-foreground p-6">
              Loading full leaderboard...
            </div>
          ) : fullLeaders.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6">
              No participants yet
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh] p-2">
              <div className="space-y-2">
                {fullLeaders.map((u, idx) => (
                  <LeaderRow key={u.username || idx} user={u} index={idx} />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BattleLeaderboardDialog;
