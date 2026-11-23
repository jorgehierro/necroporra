"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2, Check, ChevronRight, UserPlus, Calendar } from "lucide-react";
import { LeaderboardEntry, DeathRecord, Edition } from "@/lib/types";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [deaths, setDeaths] = useState<DeathRecord[]>([]);
  const [summary, setSummary] = useState({
    total_users: 0,
    total_bets: 0,
    total_deaths: 0,
    total_points: 0,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchState();
  }, []);

  async function fetchState() {
    try {
      const res = await fetch("/api/state");
      const data = await res.json();
      if (!data.error) {
        setEdition(data.edition);
        setLeaderboard(data.leaderboard || []);
        setDeaths(data.deaths || []);
        setSummary(data.summary || { total_users: 0, total_bets: 0, total_deaths: 0, total_points: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Progreso de la temporada
  const currentYear = edition?.year || new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1).getTime();
  const endOfYear = new Date(currentYear, 11, 31).getTime();
  const now = new Date().getTime();
  const totalDays = Math.round((endOfYear - startOfYear) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.round((now - startOfYear) / (1000 * 60 * 60 * 24))));
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const progressPercent = Math.round((elapsedDays / totalDays) * 100);

  function copyWhatsAppSummary() {
    const todayStr = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const lines = [
      `*NECROPORRA ${currentYear} — CLASIFICACIÓN*`,
      `_Fecha: ${todayStr}_\n`,
    ];

    leaderboard.forEach((u, idx) => {
      const cap = u.captain_hits > 0 ? `, ${u.captain_hits} cap` : "";
      lines.push(`${idx + 1}. *${u.display_name}* — ${u.total_points} pts (${u.hits_count} aciertos${cap})`);
    });

    if (deaths.length > 0) {
      lines.push("\n*Bajas recientes confirmadas:*");
      deaths.slice(0, 3).forEach((d) => {
        lines.push(`- *${d.full_name}* (+${d.total_points_given} pts — ${d.bettors})`);
      });
    }

    lines.push(`\nTemporada: ${remainingDays} días restantes (${progressPercent}% completado)`);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
      {/* Cabecera minimalista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Temporada {currentYear}
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-[11px] text-zinc-400">
              {edition?.is_active === 1 ? "Competición activa" : "Edición cerrada"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
            Clasificación general
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Registro de pronósticos y puntuaciones de la temporada en curso
          </p>
        </div>

        {leaderboard.length > 0 && (
          <button
            onClick={copyWhatsAppSummary}
            className="flex items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors shadow-sm self-start sm:self-auto"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado al portapapeles</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-zinc-400" />
                <span>Copiar para WhatsApp</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Métricas y Progreso */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Participantes</span>
          <div className="text-xl font-semibold text-zinc-100 mt-1 tabular-nums">{summary.total_users}</div>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Apuestas</span>
          <div className="text-xl font-semibold text-zinc-100 mt-1 tabular-nums">{summary.total_bets}</div>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Bajas</span>
          <div className="text-xl font-semibold text-zinc-100 mt-1 tabular-nums">{summary.total_deaths}</div>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Puntos</span>
          <div className="text-xl font-semibold text-zinc-100 mt-1 tabular-nums">{summary.total_points}</div>
        </div>
      </div>

      {/* Barra de progreso sutil */}
      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-3">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 font-medium">
          <span className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
            <Calendar className="h-3 w-3" />
            Progreso anual
          </span>
          <span className="text-[11px] tabular-nums">
            <strong className="text-zinc-300 font-semibold">{remainingDays}</strong> días restantes ({progressPercent}%)
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-zinc-400 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Estado vacío o contenido */}
      {leaderboard.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 mb-3">
            <UserPlus className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">No hay participantes registrados</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-5">
            Comienza dando de alta al primer jugador desde la sección de plantilla.
          </p>
          <Link
            href="/roster"
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3.5 py-2 text-xs font-medium text-zinc-900 hover:bg-white transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Crear participante
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabla de Clasificación */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Tabla de puntuaciones
            </h2>

            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
              <div className="divide-y divide-zinc-800/80">
                {leaderboard.map((entry, idx) => {
                  const isLeader = idx === 0;
                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center justify-between p-3.5 transition-colors ${
                        isLeader ? "bg-zinc-800/30" : "hover:bg-zinc-800/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded text-xs font-mono font-medium text-zinc-400 bg-zinc-800/60 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-zinc-100 truncate">
                            {entry.display_name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>{entry.hits_count} de {entry.total_bets} aciertos</span>
                            {entry.captain_hits > 0 && (
                              <span className="text-[10px] text-amber-400 font-medium">
                                Capitán acertado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                        <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-base font-bold text-zinc-100 tabular-nums">
                            {entry.total_points}
                          </span>
                          <span className="text-xs text-zinc-500 ml-1">pts</span>
                        </div>
                        <Link
                          href={`/roster?user_id=${entry.user_id}`}
                          className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                          title="Ver plantilla"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bajas Confirmadas */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Bajas confirmadas ({deaths.length})
            </h2>

            {deaths.length === 0 ? (
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/20 p-6 text-center text-xs text-zinc-500">
                Sin defunciones registradas en la edición actual.
              </div>
            ) : (
              <div className="space-y-2">
                {deaths.map((death) => (
                  <div
                    key={death.candidate_id}
                    className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-xs text-zinc-200">{death.full_name}</h4>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {death.age_at_death} años · {death.category}
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold text-zinc-300 tabular-nums">
                        +{death.total_points_given} pts
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-zinc-500 border-t border-zinc-800/60 pt-1.5">
                      <span>Acertaron: </span>
                      <span className="text-zinc-300 font-medium">{death.bettors}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
