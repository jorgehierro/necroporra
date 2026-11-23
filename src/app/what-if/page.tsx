"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUp, ArrowDown, Minus, Play } from "lucide-react";
import { Candidate } from "@/lib/types";

export default function WhatIfPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | "">("");
  const [simulatedAge, setSimulatedAge] = useState<number>(80);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/candidates");
      const data = await res.json();
      if (data.candidates) {
        const alive = data.candidates.filter((c: Candidate) => c.is_deceased !== 1);
        setCandidates(alive);
        if (alive.length > 0) {
          setSelectedCandidateId(alive[0].id);
          setSimulatedAge(alive[0].estimated_age);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function runSimulation() {
    if (!selectedCandidateId) return;
    setSimulating(true);
    try {
      const res = await fetch("/api/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: selectedCandidateId,
          simulated_age: simulatedAge,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
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
          <Activity className="h-5 w-5 text-zinc-400" />
          Simulador de escenarios
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Proyección del impacto en la clasificación si falleciera hoy un candidato en activo
        </p>

        {candidates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-800/80 items-end">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5 block">
                Candidato en activo
              </label>
              <select
                value={selectedCandidateId}
                onChange={(e) => {
                  const cid = Number(e.target.value);
                  setSelectedCandidateId(cid);
                  const found = candidates.find((c) => c.id === cid);
                  if (found) setSimulatedAge(found.estimated_age);
                }}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 text-xs font-medium text-zinc-100 focus:outline-none focus:border-zinc-500"
              >
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.estimated_age} años, {c.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5 block">
                Edad simulada
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={18}
                  max={120}
                  value={simulatedAge}
                  onChange={(e) => setSimulatedAge(Number(e.target.value))}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 text-xs font-medium text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
                <button
                  type="button"
                  onClick={runSimulation}
                  disabled={simulating}
                  className="rounded-md bg-zinc-100 hover:bg-white disabled:opacity-40 px-3.5 py-2 text-xs font-semibold text-zinc-900 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Play className="h-3 w-3 fill-zinc-900" />
                  <span>Proyectar</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 mt-3">
            No hay candidatos activos registrados para simular. Añade candidatos en Mi Plantilla.
          </p>
        )}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs text-zinc-300">
            <span className="font-semibold text-zinc-100 block mb-0.5">
              Escenario: {result.candidate?.full_name} ({result.simulated_age} años)
            </span>
            {result.bettors_count === 0 ? (
              <p className="text-zinc-500">Ningún participante tiene a este candidato en su plantilla.</p>
            ) : (
              <div className="space-y-1">
                <span className="text-zinc-400">Puntúan {result.bettors_count} participante(s): </span>
                {Object.values(result.gains).map((g: any, i: number) => (
                  <span key={i} className="inline-block mr-2 font-medium text-zinc-200">
                    • {g.display_name} (+{g.points_gained} pts {g.is_captain ? "[Capitán]" : ""})
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
            <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/60">
              <h3 className="text-xs font-semibold text-zinc-400">
                Clasificación proyectada
              </h3>
            </div>

            <div className="divide-y divide-zinc-800/80">
              {result.simulated_leaderboard.map((entry: any) => {
                const delta = entry.rank_delta;
                return (
                  <div
                    key={entry.user_id}
                    className="flex items-center justify-between p-3 hover:bg-zinc-800/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded text-xs font-mono font-medium text-zinc-300 bg-zinc-800/60 tabular-nums">
                        {entry.new_rank}
                      </span>

                      <div className="w-8 flex items-center text-xs font-mono font-medium">
                        {delta > 0 ? (
                          <span className="text-emerald-400 flex items-center">
                            <ArrowUp className="h-3 w-3" />+{delta}
                          </span>
                        ) : delta < 0 ? (
                          <span className="text-rose-400 flex items-center">
                            <ArrowDown className="h-3 w-3" />{delta}
                          </span>
                        ) : (
                          <span className="text-zinc-600 flex items-center">
                            <Minus className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-semibold text-xs text-zinc-100">{entry.display_name}</h4>
                        <span className="text-[11px] text-zinc-500 tabular-nums">
                          {entry.hits_count} aciertos
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-zinc-100 tabular-nums">
                        {entry.total_points} pts
                      </span>
                      {entry.points_gained > 0 && (
                        <span className="text-xs font-mono font-semibold text-emerald-400 ml-1.5 tabular-nums">
                          (+{entry.points_gained})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
