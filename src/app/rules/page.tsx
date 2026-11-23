"use client";

import { useState } from "react";
import { BookOpen, Calculator, ShieldCheck } from "lucide-react";
import { calculatePointsBreakdown } from "@/lib/scoring";

export default function RulesPage() {
  const [age, setAge] = useState(78);
  const [isCaptain, setIsCaptain] = useState(false);
  const [isExclusive, setIsExclusive] = useState(false);
  const [isFirstBlood, setIsFirstBlood] = useState(false);

  const breakdown = calculatePointsBreakdown({
    ageAtDeath: age,
    isCaptain,
    isExclusive,
    isFirstBlood,
  });

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="border-b border-zinc-800/80 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-zinc-400" />
          Reglamento y calculadora
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Bases oficiales de la competición y simulador interactivo de puntuación
        </p>
      </div>

      {/* Calculadora */}
      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Calculator className="h-4 w-4" />
          Calculadora de liquidación
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-zinc-300 mb-2">
                <span>Edad en el momento de la defunción</span>
                <span className="font-mono text-zinc-100 font-bold tabular-nums">{age} años</span>
              </div>
              <input
                type="range"
                min={18}
                max={110}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full accent-zinc-200 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-800/80 text-xs text-zinc-300">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCaptain}
                  onChange={(e) => setIsCaptain(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-zinc-200 focus:ring-0"
                />
                <span>Capitán designado (duplica puntos base x2)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isExclusive}
                  onChange={(e) => setIsExclusive(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-zinc-200 focus:ring-0"
                />
                <span>Acierto exclusivo (+10 pts si solo tú lo tenías)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFirstBlood}
                  onChange={(e) => setIsFirstBlood(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-zinc-200 focus:ring-0"
                />
                <span>Primer acierto de la temporada (+10 pts)</span>
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-2.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 block">
              Puntos calculados
            </span>
            <div className="text-3xl font-bold text-zinc-100 tabular-nums">
              {breakdown.total_points} <span className="text-xs font-normal text-zinc-500">puntos</span>
            </div>

            <div className="space-y-1.5 text-xs text-zinc-400 border-t border-zinc-800/80 pt-2.5">
              <div className="flex justify-between">
                <span>Puntos base (100 − {age}):</span>
                <span className="font-mono text-zinc-200 tabular-nums">{breakdown.base_points}</span>
              </div>
              {breakdown.captain_points > 0 && (
                <div className="flex justify-between text-zinc-300">
                  <span>Bonus Capitán (x2 base):</span>
                  <span className="font-mono tabular-nums">+{breakdown.captain_points}</span>
                </div>
              )}
              {breakdown.bonus_exclusive > 0 && (
                <div className="flex justify-between text-zinc-300">
                  <span>Bonus Exclusividad:</span>
                  <span className="font-mono tabular-nums">+{breakdown.bonus_exclusive}</span>
                </div>
              )}
              {breakdown.bonus_first_blood > 0 && (
                <div className="flex justify-between text-zinc-300">
                  <span>Bonus Primer acierto:</span>
                  <span className="font-mono tabular-nums">+{breakdown.bonus_first_blood}</span>
                </div>
              )}
              {breakdown.bonus_youth > 0 && (
                <div className="flex justify-between text-zinc-300">
                  <span>Bonus Juventud (&lt;55 años):</span>
                  <span className="font-mono tabular-nums">+{breakdown.bonus_youth}</span>
                </div>
              )}
              {breakdown.bonus_centenarian > 0 && (
                <div className="flex justify-between text-zinc-300">
                  <span>Bonus Centenario (&ge;100 años):</span>
                  <span className="font-mono tabular-nums">+{breakdown.bonus_centenarian}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Normativa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-1.5">
          <h3 className="font-semibold text-xs text-zinc-200 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" /> 1. Fórmula y Riesgo
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Se premia el riesgo relativo: pronosticar a figuras jóvenes aporta recompensas mayores que a personas de edad avanzada.
          </p>
          <div className="font-mono text-xs text-zinc-300 pt-1">
            Puntos base = max(1, 100 − Edad al fallecer)
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-1.5">
          <h3 className="font-semibold text-xs text-zinc-200 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" /> 2. Formato y Capitán
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Cada jugador selecciona hasta 10 candidatos y designa a un único Capitán. En caso de acierto, los puntos base de esa personalidad se duplican (×2).
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-1.5">
          <h3 className="font-semibold text-xs text-zinc-200 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" /> 3. Elegibilidad
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Personalidades públicas con presencia verificable en medios o Wikipedia. Deben estar vivas al inicio de la edición. Se excluyen condenados a pena capital.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-1.5">
          <h3 className="font-semibold text-xs text-zinc-200 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" /> 4. Criterio de Desempate
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            1º Mayor número de aciertos totales; 2º Mayor número de aciertos de Capitán; 3º Orden alfabético del participante.
          </p>
        </div>
      </div>
    </div>
  );
}
