"use client";

import { useEffect, useState } from "react";
import { Settings, Lock, Check, AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import { Candidate, Edition, DeathRecord } from "@/lib/types";

export default function AdminPage() {
  const [adminPin, setAdminPin] = useState("0000");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [deaths, setDeaths] = useState<DeathRecord[]>([]);
  const [edition, setEdition] = useState<Edition | null>(null);

  // Formulario defunción
  const [selectedCandId, setSelectedCandId] = useState<number | "">("");
  const [deathDate, setDeathDate] = useState(new Date().toISOString().split("T")[0]);
  const [deathAge, setDeathAge] = useState(80);
  const [deathSource, setDeathSource] = useState("");

  // Formulario edición
  const [lockDate, setLockDate] = useState("");
  const [isEditionActive, setIsEditionActive] = useState(true);
  const [maxBets, setMaxBets] = useState(10);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadAdminState();
  }, []);

  async function loadAdminState() {
    try {
      const res = await fetch("/api/state");
      const data = await res.json();
      if (!data.error) {
        setEdition(data.edition);
        setDeaths(data.deaths || []);
        setIsEditionActive(data.edition.is_active === 1);
        setLockDate(data.edition.lock_date || "");
        setMaxBets(data.edition.max_bets_per_user || 10);
      }

      const cRes = await fetch("/api/candidates");
      const cData = await cRes.json();
      if (cData.candidates) {
        const alive = cData.candidates.filter((c: Candidate) => c.is_deceased !== 1);
        setCandidates(alive);
        if (alive.length > 0) {
          setSelectedCandId(alive[0].id);
          setDeathAge(alive[0].estimated_age);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (adminPin.trim()) {
      setIsUnlocked(true);
      setMessage(null);
    }
  }

  async function handleRecordDeath(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCandId) return;
    setMessage(null);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_pin: adminPin,
          action: "record_death",
          candidate_id: selectedCandId,
          death_date: deathDate,
          age_at_death: deathAge,
          cause_or_source: deathSource.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessage({ type: "success", text: "Defunción registrada y clasificaciones actualizadas." });
      loadAdminState();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleDeleteDeath(candidateId: number) {
    if (!confirm("¿Anular esta defunción y revertir los puntos?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_pin: adminPin,
          action: "delete_death",
          candidate_id: candidateId,
        }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        setMessage({ type: "success", text: "Defunción anulada." });
        loadAdminState();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUpdateEdition(e: React.FormEvent) {
    e.preventDefault();
    if (!edition) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_pin: adminPin,
          action: "update_edition",
          edition_id: edition.id,
          lock_date: lockDate || null,
          is_active: isEditionActive,
          max_bets: maxBets,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage({ type: "success", text: "Ajustes de la edición guardados." });
      loadAdminState();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleSeedDemo() {
    if (!confirm("¿Cargar datos de demostración con 5 participantes y 3 defunciones de prueba?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_pin: adminPin, action: "seed_demo" }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        setMessage({ type: "success", text: "Datos de demostración cargados." });
        loadAdminState();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleResetDb() {
    if (!confirm("¿Vaciar completamente la base de datos a cero? Se eliminarán todos los participantes, apuestas y defunciones.")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_pin: adminPin, action: "reset_db" }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        setMessage({ type: "success", text: "Base de datos vaciada a cero." });
        loadAdminState();
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="border-b border-zinc-800/80 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <Settings className="h-5 w-5 text-zinc-400" />
          Ajustes del sistema
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Liquidación de defunciones, plazos de competición y mantenimiento
        </p>

        {!isUnlocked && (
          <form onSubmit={handleUnlock} className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center gap-3">
            <span className="text-xs text-zinc-400">PIN de administración:</span>
            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="w-24 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-xs tracking-widest text-zinc-100 focus:outline-none focus:border-zinc-500"
              placeholder="0000"
            />
            <button
              type="submit"
              className="rounded-md bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-900 hover:bg-white transition-colors"
            >
              Desbloquear
            </button>
          </form>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-md text-xs flex items-center gap-2 ${
            message.type === "success"
              ? "bg-zinc-800 text-zinc-200"
              : "bg-rose-950/20 text-rose-300 border border-rose-900/40"
          }`}
        >
          {message.type === "success" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />}
          <span>{message.text}</span>
        </div>
      )}

      {isUnlocked && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registrar Defunción */}
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Registrar defunción oficial
            </h2>
            <p className="text-xs text-zinc-500">
              Confirma el deceso de un candidato para liquidar las puntuaciones.
            </p>

            {candidates.length === 0 ? (
              <p className="text-xs text-zinc-500">No hay candidatos activos registrados.</p>
            ) : (
              <form onSubmit={handleRecordDeath} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 mb-1 block">
                    Candidato fallecido
                  </label>
                  <select
                    value={selectedCandId}
                    onChange={(e) => {
                      const cid = Number(e.target.value);
                      setSelectedCandId(cid);
                      const found = candidates.find((c) => c.id === cid);
                      if (found) setDeathAge(found.estimated_age);
                    }}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.estimated_age} años, {c.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Fecha de defunción</label>
                    <input
                      type="date"
                      required
                      value={deathDate}
                      onChange={(e) => setDeathDate(e.target.value)}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Edad al morir</label>
                    <input
                      type="number"
                      min={1}
                      max={130}
                      required
                      value={deathAge}
                      onChange={(e) => setDeathAge(Number(e.target.value))}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 mb-1 block">
                    Fuente de la noticia (EFE, Reuters, prensa...)
                  </label>
                  <input
                    type="text"
                    value={deathSource}
                    onChange={(e) => setDeathSource(e.target.value)}
                    placeholder="ej. Comunicado oficial familiar, EFE"
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-md bg-zinc-100 hover:bg-white p-2 text-xs font-semibold text-zinc-900 transition-colors"
                >
                  Confirmar defunción
                </button>
              </form>
            )}

            {/* Bajas para anular */}
            {deaths.length > 0 && (
              <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 block">
                  Defunciones registradas ({deaths.length})
                </span>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {deaths.map((d) => (
                    <div
                      key={d.candidate_id}
                      className="flex items-center justify-between p-2 rounded bg-zinc-950 text-xs border border-zinc-800/60"
                    >
                      <span className="text-zinc-300 truncate pr-2">
                        {d.full_name} ({d.age_at_death} años)
                      </span>
                      <button
                        onClick={() => handleDeleteDeath(d.candidate_id)}
                        className="text-[11px] text-zinc-500 hover:text-rose-400 transition-colors shrink-0"
                      >
                        Anular
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Control de Edición y Mantenimiento */}
          <div className="space-y-5">
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Fases de la edición
              </h2>

              <form onSubmit={handleUpdateEdition} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 mb-1 block">
                    Fecha límite de apuestas (Lock Date)
                  </label>
                  <input
                    type="date"
                    value={lockDate}
                    onChange={(e) => setLockDate(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    Dejar en blanco para mantener apuestas abiertas sin fecha fija.
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="active-check"
                    checked={isEditionActive}
                    onChange={(e) => setIsEditionActive(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-zinc-300 focus:ring-0"
                  />
                  <label htmlFor="active-check" className="text-xs text-zinc-300 cursor-pointer">
                    Competición activa (desmarcar para congelar en solo lectura)
                  </label>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 mb-1 block">
                    Máximo de candidatos por plantilla
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={25}
                    value={maxBets}
                    onChange={(e) => setMaxBets(Number(e.target.value))}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-md bg-zinc-800 hover:bg-zinc-700 p-2 text-xs font-semibold text-zinc-100 transition-colors"
                >
                  Guardar configuración
                </button>
              </form>
            </div>

            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Mantenimiento de datos
              </h2>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleSeedDemo}
                  className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900 transition-colors text-left flex items-center justify-between"
                >
                  <span>Cargar datos de demostración (5 jugadores de prueba)</span>
                  <RotateCcw className="h-3 w-3 text-zinc-500" />
                </button>

                <button
                  onClick={handleResetDb}
                  className="rounded-md border border-zinc-800/80 bg-zinc-950 p-2 text-xs font-medium text-zinc-400 hover:text-rose-400 hover:border-zinc-700 transition-colors text-left flex items-center justify-between"
                >
                  <span>Vaciar base de datos a cero</span>
                  <Trash2 className="h-3 w-3 text-zinc-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
