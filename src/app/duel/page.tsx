"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, Star, ExternalLink } from "lucide-react";
import { User, Bet } from "@/lib/types";
import { calculateBasePoints } from "@/lib/scoring";

export default function DuelPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [user1Id, setUser1Id] = useState<number | "">("");
  const [user2Id, setUser2Id] = useState<number | "">("");
  const [duelData, setDuelData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/state");
      const data = await res.json();
      if (data.users && data.users.length >= 2) {
        setUsers(data.users);
        setUser1Id(data.users[0].id);
        setUser2Id(data.users[1].id);
        runDuel(data.users[0].id, data.users[1].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function runDuel(u1: number, u2: number) {
    if (!u1 || !u2 || u1 === u2) {
      setDuelData(null);
      return;
    }
    setComparing(true);
    try {
      const res = await fetch(`/api/duel?user1_id=${u1}&user2_id=${u2}`);
      const data = await res.json();
      if (!data.error) {
        setDuelData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setComparing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border border-zinc-500 border-t-zinc-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="border-b border-zinc-800/80 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-zinc-400" />
          Cara a Cara
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Comparativa directa de plantillas, coincidencias y apuestas diferenciales
        </p>

        {users.length >= 2 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-zinc-800/80">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5 block">
                Primer jugador
              </label>
              <select
                value={user1Id}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setUser1Id(val);
                  if (user2Id) runDuel(val, Number(user2Id));
                }}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 text-xs font-medium text-zinc-100 focus:outline-none focus:border-zinc-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5 block">
                Segundo jugador
              </label>
              <select
                value={user2Id}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setUser2Id(val);
                  if (user1Id) runDuel(Number(user1Id), val);
                }}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 text-xs font-medium text-zinc-100 focus:outline-none focus:border-zinc-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 mt-3">
            Se necesitan al menos dos participantes registrados para realizar una comparativa.
          </p>
        )}
      </div>

      {user1Id === user2Id ? (
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-8 text-center text-xs text-zinc-500">
          Selecciona dos participantes distintos para compararlos.
        </div>
      ) : comparing ? (
        <div className="flex h-36 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border border-zinc-500 border-t-zinc-100" />
        </div>
      ) : duelData ? (
        <div className="space-y-6">
          {/* Métricas clave */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3.5 text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Diferencia
              </span>
              <div className="text-xl font-bold text-zinc-100 mt-1 tabular-nums">
                {duelData.points_gap} <span className="text-xs font-normal text-zinc-500">pts</span>
              </div>
              <span className="text-[11px] text-zinc-400 mt-0.5 block">
                {duelData.leader === "Empate" ? "Empatados" : `Lidera ${duelData.leader}`}
              </span>
            </div>

            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3.5 text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Media de {duelData.user1?.display_name}
              </span>
              <div className="text-xl font-semibold text-zinc-100 mt-1 tabular-nums">
                {duelData.avg_age1} <span className="text-xs font-normal text-zinc-500">años</span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                {duelData.avg_age1 >= 88 ? "Conservador" : duelData.avg_age1 >= 75 ? "Equilibrado" : "Audaz"}
              </span>
            </div>

            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3.5 text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Media de {duelData.user2?.display_name}
              </span>
              <div className="text-xl font-semibold text-zinc-100 mt-1 tabular-nums">
                {duelData.avg_age2} <span className="text-xs font-normal text-zinc-500">años</span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                {duelData.avg_age2 >= 88 ? "Conservador" : duelData.avg_age2 >= 75 ? "Equilibrado" : "Audaz"}
              </span>
            </div>
          </div>

          {/* Plantillas en columnas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
              <div className="border-b border-zinc-800/80 pb-2">
                <h3 className="font-semibold text-xs text-zinc-300">
                  Coincidencias ({duelData.shared_bets.length})
                </h3>
                <p className="text-[11px] text-zinc-500">Candidatos compartidos por ambos</p>
              </div>

              {duelData.shared_bets.length === 0 ? (
                <p className="text-xs text-zinc-500 py-3 text-center">Sin coincidencias</p>
              ) : (
                <div className="space-y-1.5">
                  {duelData.shared_bets.map((b: Bet) => (
                    <div key={b.id} className="rounded p-2 bg-zinc-900/60 text-xs border border-zinc-800/60">
                      <div className="font-medium text-zinc-200 flex items-center justify-between">
                        <span>{b.full_name}</span>
                        {b.is_deceased === 1 && <span className="text-[10px] text-zinc-500">Baja</span>}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {b.estimated_age} años · {b.category}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
              <div className="border-b border-zinc-800/80 pb-2">
                <h3 className="font-semibold text-xs text-zinc-200">
                  Diferenciales de {duelData.user1?.display_name} ({duelData.diff_user1.length})
                </h3>
                <p className="text-[11px] text-zinc-500">Elecciones exclusivas</p>
              </div>

              {duelData.diff_user1.length === 0 ? (
                <p className="text-xs text-zinc-500 py-3 text-center">Sin candidatos diferenciales</p>
              ) : (
                <div className="space-y-1.5">
                  {duelData.diff_user1.map((b: Bet) => {
                    const isCap = b.is_captain === 1;
                    const isDec = b.is_deceased === 1;
                    return (
                      <div
                        key={b.id}
                        className={`rounded p-2 border text-xs ${
                          isCap ? "bg-zinc-800/40 border-zinc-700" : "bg-zinc-900/60 border-zinc-800/60"
                        }`}
                      >
                        <div className="font-medium text-zinc-200 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            {isCap && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                            {b.full_name}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 tabular-nums">
                            {isDec ? `+${b.points_awarded} pts` : `~${calculateBasePoints(b.estimated_age || 80)} pts`}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {b.estimated_age} años · {b.category}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
              <div className="border-b border-zinc-800/80 pb-2">
                <h3 className="font-semibold text-xs text-zinc-200">
                  Diferenciales de {duelData.user2?.display_name} ({duelData.diff_user2.length})
                </h3>
                <p className="text-[11px] text-zinc-500">Elecciones exclusivas</p>
              </div>

              {duelData.diff_user2.length === 0 ? (
                <p className="text-xs text-zinc-500 py-3 text-center">Sin candidatos diferenciales</p>
              ) : (
                <div className="space-y-1.5">
                  {duelData.diff_user2.map((b: Bet) => {
                    const isCap = b.is_captain === 1;
                    const isDec = b.is_deceased === 1;
                    return (
                      <div
                        key={b.id}
                        className={`rounded p-2 border text-xs ${
                          isCap ? "bg-zinc-800/40 border-zinc-700" : "bg-zinc-900/60 border-zinc-800/60"
                        }`}
                      >
                        <div className="font-medium text-zinc-200 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            {isCap && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                            {b.full_name}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 tabular-nums">
                            {isDec ? `+${b.points_awarded} pts` : `~${calculateBasePoints(b.estimated_age || 80)} pts`}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {b.estimated_age} años · {b.category}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
