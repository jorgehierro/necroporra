"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  User as UserIcon,
  Star,
  Trash2,
  Plus,
  Lock,
  ExternalLink,
  UserPlus,
  Check,
  AlertCircle,
} from "lucide-react";
import { User, Bet, Candidate, Edition } from "@/lib/types";
import { calculateBasePoints } from "@/lib/scoring";

function RosterContent() {
  const searchParams = useSearchParams();
  const preselectedUserId = searchParams.get("user_id");

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState("1234");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [edition, setEdition] = useState<Edition | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [availableCandidates, setAvailableCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Registro de nuevo usuario
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPin, setNewUserPin] = useState("1234");
  const [userError, setUserError] = useState("");

  // Añadir candidato
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");
  const [selectedExistingId, setSelectedExistingId] = useState<number | "">("");
  const [makeCaptain, setMakeCaptain] = useState(false);

  // Formulario nuevo candidato
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState(78);
  const [newCategory, setNewCategory] = useState("General");
  const [newWiki, setNewWiki] = useState("");
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const res = await fetch("/api/state");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        setEdition(data.edition);

        if (data.users.length === 0) {
          setShowNewUserForm(true);
        } else {
          const savedUserId = preselectedUserId || localStorage.getItem("necroporra_user_id");
          if (savedUserId) {
            const found = data.users.find((u: User) => u.id === Number(savedUserId));
            if (found) {
              setSelectedUser(found);
              const savedPin = localStorage.getItem("necroporra_pin") || "1234";
              setPin(savedPin);
              verifyAndLoadBets(found.id, savedPin);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndLoadBets(userId: number, inputPin: string) {
    try {
      const res = await fetch(`/api/bets?user_id=${userId}`);
      const data = await res.json();
      if (!data.error) {
        setBets(data.bets || []);
        setAvailableCandidates(data.available || []);
        setIsAuthenticated(true);
        setAuthError("");
        localStorage.setItem("necroporra_user_id", String(userId));
        localStorage.setItem("necroporra_pin", inputPin);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setAuthError("");
    try {
      const res = await fetch(`/api/bets?user_id=${selectedUser.id}`);
      const data = await res.json();
      if (data.error) {
        setAuthError(data.error);
        return;
      }
      setBets(data.bets || []);
      setAvailableCandidates(data.available || []);
      setIsAuthenticated(true);
      localStorage.setItem("necroporra_user_id", String(selectedUser.id));
      localStorage.setItem("necroporra_pin", pin);
    } catch (err) {
      setAuthError("Error de conexión");
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserName.trim()) return;
    setUserError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: newUserName.trim(),
          pin: newUserPin.trim() || "1234",
        }),
      });
      const data = await res.json();
      if (data.error) {
        setUserError(data.error);
      } else {
        const newUserObj: User = {
          id: data.user_id,
          username: newUserName.trim().toLowerCase(),
          display_name: data.display_name,
        };
        setUsers((prev) => [...prev, newUserObj]);
        setSelectedUser(newUserObj);
        setPin(newUserPin || "1234");
        setShowNewUserForm(false);
        setNewUserName("");
        verifyAndLoadBets(newUserObj.id, newUserPin || "1234");
      }
    } catch (err: any) {
      setUserError(err.message || "Error al crear usuario");
    }
  }

  async function handleAddExisting() {
    if (!selectedExistingId || !selectedUser) return;
    setActionMsg(null);
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          pin,
          candidate_id: selectedExistingId,
          is_captain: makeCaptain,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setActionMsg({ type: "error", text: data.error });
      } else {
        setActionMsg({ type: "success", text: "Candidato registrado en la plantilla." });
        setSelectedExistingId("");
        setMakeCaptain(false);
        verifyAndLoadBets(selectedUser.id, pin);
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    }
  }

  async function handleAddNewCandidate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !selectedUser) return;
    setActionMsg(null);

    try {
      const cRes = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newName.trim(),
          estimated_age: newAge,
          category: newCategory,
          wikipedia_url: newWiki.trim() || undefined,
        }),
      });
      const cData = await cRes.json();
      if (cData.error) throw new Error(cData.error);

      const bRes = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          pin,
          candidate_id: cData.candidate_id,
          is_captain: makeCaptain,
        }),
      });
      const bData = await bRes.json();
      if (bData.error) throw new Error(bData.error);

      setActionMsg({ type: "success", text: `${newName} añadido con éxito.` });
      setNewName("");
      setNewWiki("");
      setMakeCaptain(false);
      verifyAndLoadBets(selectedUser.id, pin);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    }
  }

  async function handleDeleteBet(betId: number) {
    if (!selectedUser) return;
    if (!confirm("¿Eliminar este candidato de tu plantilla?")) return;
    try {
      const res = await fetch("/api/bets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUser.id, pin, bet_id: betId }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else verifyAndLoadBets(selectedUser.id, pin);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSetCaptain(betId: number) {
    if (!selectedUser) return;
    try {
      const res = await fetch("/api/bets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUser.id, pin, bet_id: betId }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else verifyAndLoadBets(selectedUser.id, pin);
    } catch (err) {
      console.error(err);
    }
  }

  const isLocked = edition?.is_active === 0 || (edition?.lock_date && new Date() > new Date(edition.lock_date));
  const maxBets = edition?.max_bets_per_user || 10;
  const hasCaptain = bets.some((b) => b.is_captain === 1);
  const totalPoints = bets.reduce((acc, b) => acc + (b.points_awarded || 0), 0);

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border border-zinc-500 border-t-zinc-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector y registro de participante */}
      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-zinc-100 flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-zinc-400" />
              Gestión de plantilla
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Administración de apuestas individuales y capitán
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!showNewUserForm && (
              <select
                value={selectedUser?.id || ""}
                onChange={(e) => {
                  const uid = Number(e.target.value);
                  const found = users.find((u) => u.id === uid) || null;
                  setSelectedUser(found);
                  setIsAuthenticated(false);
                  if (found) verifyAndLoadBets(found.id, pin);
                }}
                className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
              >
                <option value="">Seleccionar participante...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowNewUserForm(!showNewUserForm)}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{showNewUserForm ? "Cancelar" : "Nuevo jugador"}</span>
            </button>
          </div>
        </div>

        {/* Formulario nuevo jugador */}
        {showNewUserForm && (
          <form onSubmit={handleCreateUser} className="mt-4 pt-4 border-t border-zinc-800/80 space-y-3">
            <span className="text-xs font-semibold text-zinc-300 block">Registrar nuevo participante</span>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                required
                placeholder="Nombre o apodo (ej. Carlos)"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
              <input
                type="password"
                maxLength={4}
                placeholder="PIN (4 dígitos)"
                value={newUserPin}
                onChange={(e) => setNewUserPin(e.target.value)}
                className="w-28 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono text-center tracking-widest focus:outline-none focus:border-zinc-500"
              />
              <button
                type="submit"
                className="rounded-md bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-white transition-colors"
              >
                Crear y acceder
              </button>
            </div>
            {userError && <p className="text-xs text-rose-400">{userError}</p>}
          </form>
        )}

        {/* PIN Prompt si no autenticado */}
        {selectedUser && !isAuthenticated && !showNewUserForm && (
          <form onSubmit={handleLogin} className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center gap-3">
            <span className="text-xs text-zinc-400">PIN de acceso (4 dígitos):</span>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-20 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-center font-mono text-xs tracking-widest text-zinc-100 focus:outline-none focus:border-zinc-500"
              placeholder="1234"
            />
            <button
              type="submit"
              className="rounded-md bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-900 hover:bg-white transition-colors"
            >
              Entrar
            </button>
            {authError && <span className="text-xs text-rose-400">{authError}</span>}
          </form>
        )}
      </div>

      {!selectedUser ? (
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-10 text-center">
          <p className="text-xs text-zinc-500">
            Selecciona tu nombre o regístrate como nuevo jugador para gestionar tus apuestas.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Alerta de bloqueo */}
          {isLocked && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span>Plazo cerrado: La plantilla se encuentra en modo solo lectura.</span>
            </div>
          )}

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3 text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Cupo</span>
              <div className="text-lg font-semibold text-zinc-100 mt-0.5 tabular-nums">
                {bets.length} <span className="text-xs text-zinc-500 font-normal">/ {maxBets}</span>
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3 text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Capitán</span>
              <div className="text-xs font-medium text-zinc-300 mt-1">
                {hasCaptain ? (
                  <span className="text-amber-400 flex items-center justify-center gap-1 font-semibold">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Designado
                  </span>
                ) : (
                  <span className="text-zinc-500">Sin asignar</span>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3 text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Puntos</span>
              <div className="text-lg font-bold text-zinc-100 mt-0.5 tabular-nums">{totalPoints} pts</div>
            </div>
          </div>

          {/* Listado de apuestas */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Plantilla actual ({bets.length})
            </h2>

            {bets.length === 0 ? (
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/20 p-6 text-center text-xs text-zinc-500">
                No tienes candidatos en tu plantilla. Utiliza el formulario inferior para añadir tus elecciones.
              </div>
            ) : (
              <div className="space-y-2">
                {bets.map((bet) => {
                  const isCap = bet.is_captain === 1;
                  const isDec = bet.is_deceased === 1;
                  const baseEst = calculateBasePoints(bet.estimated_age || 80);

                  return (
                    <div
                      key={bet.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isDec
                          ? "border-zinc-800 bg-zinc-950/40"
                          : isCap
                          ? "border-zinc-700 bg-zinc-900/80"
                          : "border-zinc-800/80 bg-zinc-900/30"
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-xs text-zinc-100 truncate">{bet.full_name}</h4>
                          {isCap && (
                            <span className="rounded bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.2 text-[10px] font-semibold text-amber-400 flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5 fill-amber-400" /> Capitán
                            </span>
                          )}
                          {isDec ? (
                            <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono font-medium text-zinc-300">
                              +{bet.points_awarded} pts
                            </span>
                          ) : (
                            <span className="rounded bg-zinc-800/50 px-1.5 py-0.2 text-[10px] text-zinc-500">
                              Activo
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                          <span>{bet.category}</span>
                          <span>•</span>
                          <span>
                            {isDec ? `${bet.age_at_death} años al morir` : `${bet.estimated_age} años (~${baseEst} pts)`}
                          </span>
                          {bet.wikipedia_url && (
                            <a
                              href={bet.wikipedia_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-500 hover:text-zinc-300"
                            >
                              <ExternalLink className="h-2.5 w-2.5 inline" />
                            </a>
                          )}
                        </div>
                      </div>

                      {!isLocked && !isDec && (
                        <div className="flex items-center gap-1 shrink-0">
                          {!isCap && (
                            <button
                              onClick={() => handleSetCaptain(bet.id)}
                              className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                              title="Nombrar Capitán (x2 puntos)"
                            >
                              Capitán
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBet(bet.id)}
                            className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Formulario Añadir Candidato */}
          {!isLocked && bets.length < maxBets && (
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Añadir candidato
              </h3>

              <div className="flex rounded-md bg-zinc-950 p-0.5 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAddMode("existing")}
                  className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                    addMode === "existing"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Directorio existente
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("new")}
                  className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                    addMode === "new"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Nueva personalidad
                </button>
              </div>

              {actionMsg && (
                <div
                  className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                    actionMsg.type === "success"
                      ? "bg-zinc-800 text-zinc-200"
                      : "bg-rose-950/20 text-rose-300 border border-rose-900/40"
                  }`}
                >
                  {actionMsg.type === "success" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  )}
                  <span>{actionMsg.text}</span>
                </div>
              )}

              {addMode === "existing" ? (
                <div className="space-y-3">
                  {availableCandidates.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      No hay figuras públicas registradas en el directorio. Utiliza la pestaña "Nueva personalidad".
                    </p>
                  ) : (
                    <>
                      <select
                        value={selectedExistingId}
                        onChange={(e) => setSelectedExistingId(Number(e.target.value) || "")}
                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                      >
                        <option value="">Selecciona una figura pública...</option>
                        {availableCandidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name} ({c.estimated_age} años, {c.category}) — {c.bettor_count || 0} selecciones
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={makeCaptain}
                            onChange={(e) => setMakeCaptain(e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-950 text-zinc-300 focus:ring-0"
                          />
                          <span>Designar como Capitán (x2)</span>
                        </label>

                        <button
                          type="button"
                          disabled={!selectedExistingId}
                          onClick={handleAddExisting}
                          className="rounded-md bg-zinc-200 hover:bg-white disabled:opacity-40 px-3.5 py-1.5 text-xs font-semibold text-zinc-900 transition-colors"
                        >
                          Añadir a plantilla
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <form onSubmit={handleAddNewCandidate} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nombre completo"
                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min={18}
                        max={120}
                        required
                        value={newAge}
                        onChange={(e) => setNewAge(Number(e.target.value))}
                        placeholder="Edad"
                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                    >
                      {["Cine", "Música", "Política", "Realeza", "Pensamiento", "Deportes", "Empresa", "Entretenimiento", "General"].map(
                        (cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        )
                      )}
                    </select>

                    <input
                      type="url"
                      value={newWiki}
                      onChange={(e) => setNewWiki(e.target.value)}
                      placeholder="Enlace Wikipedia (opcional)"
                      className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={makeCaptain}
                        onChange={(e) => setMakeCaptain(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-950 text-zinc-300 focus:ring-0"
                      />
                      <span>Designar como Capitán (x2)</span>
                    </label>

                    <button
                      type="submit"
                      className="rounded-md bg-zinc-200 hover:bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-900 transition-colors"
                    >
                      Guardar y añadir
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RosterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-72 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border border-zinc-500 border-t-zinc-100" />
        </div>
      }
    >
      <RosterContent />
    </Suspense>
  );
}
