"""
database.py - Capa de persistencia SQLite para la plataforma Necroporra.
"""

import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from scoring import calculate_points_breakdown, calculate_base_points

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "necroporra.db")


def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    """Obtiene una conexión a la base de datos SQLite con soporte para Row como diccionario."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path: str = DB_PATH):
    """Inicializa el esquema de la base de datos si no existe."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS editions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        year INTEGER NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1,
        start_date TEXT,
        lock_date TEXT,
        max_bets_per_user INTEGER NOT NULL DEFAULT 10,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        avatar_emoji TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL UNIQUE,
        birth_date TEXT,
        estimated_age INTEGER NOT NULL,
        category TEXT DEFAULT 'General',
        wikipedia_url TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        edition_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        candidate_id INTEGER NOT NULL,
        is_captain INTEGER NOT NULL DEFAULT 0,
        points_awarded INTEGER DEFAULT 0,
        is_exclusive INTEGER DEFAULT 0,
        is_first_blood INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
        UNIQUE(edition_id, user_id, candidate_id)
    );

    CREATE TABLE IF NOT EXISTS deaths (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id INTEGER NOT NULL UNIQUE,
        death_date TEXT NOT NULL,
        age_at_death INTEGER NOT NULL,
        cause_or_source TEXT,
        recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    );
    """)

    conn.commit()
    conn.close()


# ---------------- EDITIONS ----------------
def get_or_create_edition(year: int = 2026, name: Optional[str] = None, db_path: str = DB_PATH) -> Dict[str, Any]:
    if name is None:
        name = f"Necroporra {year}"
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT * FROM editions WHERE year = ?", (year,))
    row = cur.fetchone()
    if row:
        res = dict(row)
        conn.close()
        return res

    cur.execute(
        "INSERT INTO editions (name, year, is_active, max_bets_per_user) VALUES (?, ?, 1, 10)",
        (name, year),
    )
    conn.commit()
    cur.execute("SELECT * FROM editions WHERE year = ?", (year,))
    res = dict(cur.fetchone())
    conn.close()
    return res


def get_active_edition(db_path: str = DB_PATH) -> Dict[str, Any]:
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT * FROM editions WHERE is_active = 1 ORDER BY year DESC LIMIT 1")
    row = cur.fetchone()
    conn.close()
    if row:
        return dict(row)
    return get_or_create_edition(datetime.now().year, db_path=db_path)


def list_editions(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT * FROM editions ORDER BY year DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


# ---------------- USERS ----------------
def create_user(username: str, display_name: str, avatar_emoji: str = "", db_path: str = DB_PATH) -> int:
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (username, display_name, avatar_emoji) VALUES (?, ?, ?)",
        (username.strip().lower(), display_name.strip(), avatar_emoji.strip()),
    )
    conn.commit()
    user_id = cur.lastrowid
    conn.close()
    return user_id


def list_users(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT * FROM users ORDER BY display_name ASC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def get_user_by_id(user_id: int, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


# ---------------- CANDIDATES ----------------
def search_or_create_candidate(
    full_name: str,
    estimated_age: int,
    category: str = "General",
    birth_date: Optional[str] = None,
    wikipedia_url: Optional[str] = None,
    notes: Optional[str] = None,
    db_path: str = DB_PATH,
) -> int:
    name_clean = full_name.strip()
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT id FROM candidates WHERE LOWER(full_name) = LOWER(?)", (name_clean,))
    row = cur.fetchone()
    if row:
        candidate_id = row["id"]
        # Actualizamos edad o detalles si se proporcionan
        cur.execute(
            """
            UPDATE candidates 
            SET estimated_age = COALESCE(?, estimated_age),
                category = COALESCE(?, category),
                wikipedia_url = COALESCE(?, wikipedia_url),
                notes = COALESCE(?, notes)
            WHERE id = ?
            """,
            (estimated_age, category, wikipedia_url, notes, candidate_id),
        )
        conn.commit()
        conn.close()
        return candidate_id

    cur.execute(
        """
        INSERT INTO candidates (full_name, birth_date, estimated_age, category, wikipedia_url, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (name_clean, birth_date, estimated_age, category, wikipedia_url, notes),
    )
    conn.commit()
    candidate_id = cur.lastrowid
    conn.close()
    return candidate_id


def list_candidates(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("""
        SELECT c.*, 
               d.death_date, 
               d.age_at_death, 
               d.cause_or_source,
               CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END as is_deceased
        FROM candidates c
        LEFT JOIN deaths d ON c.id = d.candidate_id
        ORDER BY c.full_name ASC
    """)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


# ---------------- BETS ----------------
def place_bet(
    edition_id: int,
    user_id: int,
    candidate_id: int,
    is_captain: bool = False,
    db_path: str = DB_PATH,
) -> int:
    conn = get_connection(db_path)
    cur = conn.cursor()

    # Si se marca como capitán, desmarcar otros capitanes del mismo usuario en esta edición
    if is_captain:
        cur.execute(
            "UPDATE bets SET is_captain = 0 WHERE edition_id = ? AND user_id = ?",
            (edition_id, user_id),
        )

    cur.execute(
        """
        INSERT INTO bets (edition_id, user_id, candidate_id, is_captain)
        VALUES (?, ?, ?, ?)
        """,
        (edition_id, user_id, candidate_id, 1 if is_captain else 0),
    )
    conn.commit()
    bet_id = cur.lastrowid
    conn.close()

    # Recalcular puntos por si este candidato ya estaba fallecido o por exclusividad
    recalculate_edition_points(edition_id, db_path=db_path)
    return bet_id


def delete_bet(bet_id: int, db_path: str = DB_PATH):
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT edition_id FROM bets WHERE id = ?", (bet_id,))
    row = cur.fetchone()
    edition_id = row["edition_id"] if row else None

    cur.execute("DELETE FROM bets WHERE id = ?", (bet_id,))
    conn.commit()
    conn.close()

    if edition_id:
        recalculate_edition_points(edition_id, db_path=db_path)


def set_captain(bet_id: int, user_id: int, edition_id: int, db_path: str = DB_PATH):
    conn = get_connection(db_path)
    cur = conn.cursor()
    # Desmarcar todos los capitanes del usuario
    cur.execute(
        "UPDATE bets SET is_captain = 0 WHERE edition_id = ? AND user_id = ?",
        (edition_id, user_id),
    )
    # Marcar el seleccionado
    cur.execute(
        "UPDATE bets SET is_captain = 1 WHERE id = ? AND user_id = ? AND edition_id = ?",
        (bet_id, user_id, edition_id),
    )
    conn.commit()
    conn.close()

    recalculate_edition_points(edition_id, db_path=db_path)


def get_user_bets(user_id: int, edition_id: int, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("""
        SELECT b.*,
               c.full_name,
               c.birth_date,
               c.estimated_age,
               c.category,
               c.wikipedia_url,
               c.notes,
               d.death_date,
               d.age_at_death,
               d.cause_or_source,
               CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END as is_deceased
        FROM bets b
        JOIN candidates c ON b.candidate_id = c.id
        LEFT JOIN deaths d ON c.id = d.candidate_id
        WHERE b.user_id = ? AND b.edition_id = ?
        ORDER BY b.is_captain DESC, b.points_awarded DESC, c.full_name ASC
    """, (user_id, edition_id))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


# ---------------- DEATHS & RECALCULATE ----------------
def record_death(
    candidate_id: int,
    death_date: str,
    age_at_death: int,
    cause_or_source: Optional[str] = None,
    db_path: str = DB_PATH,
) -> int:
    conn = get_connection(db_path)
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO deaths (candidate_id, death_date, age_at_death, cause_or_source)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(candidate_id) DO UPDATE SET
            death_date = excluded.death_date,
            age_at_death = excluded.age_at_death,
            cause_or_source = excluded.cause_or_source
        """,
        (candidate_id, death_date, age_at_death, cause_or_source),
    )
    conn.commit()
    death_id = cur.lastrowid
    conn.close()

    # Recalcular puntos de todas las ediciones activas
    editions = list_editions(db_path=db_path)
    for ed in editions:
        recalculate_edition_points(ed["id"], db_path=db_path)

    return death_id


def delete_death(candidate_id: int, db_path: str = DB_PATH):
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("DELETE FROM deaths WHERE candidate_id = ?", (candidate_id,))
    conn.commit()
    conn.close()

    editions = list_editions(db_path=db_path)
    for ed in editions:
        recalculate_edition_points(ed["id"], db_path=db_path)


def recalculate_edition_points(edition_id: int, db_path: str = DB_PATH):
    """
    Recalcula los puntos de todas las apuestas para una edición dada, aplicando:
    - Puntos base por edad al morir
    - Multiplicador de capitán
    - Bonificación por exclusividad (si sólo 1 usuario tenía a esa persona)
    - Bonificación por primer fallecimiento del año ('First Blood')
    - Bonificación por juventud (<55) y centenario (>=100)
    """
    conn = get_connection(db_path)
    cur = conn.cursor()

    # 1. Obtener todos los fallecimientos de candidatos apostados en esta edición
    cur.execute("""
        SELECT DISTINCT d.id, d.candidate_id, d.death_date, d.age_at_death
        FROM deaths d
        JOIN bets b ON d.candidate_id = b.candidate_id
        WHERE b.edition_id = ?
        ORDER BY d.death_date ASC, d.id ASC
    """, (edition_id,))
    deaths_in_edition = [dict(r) for r in cur.fetchall()]

    # El primer candidato en la lista ordenada por fecha de defunción es First Blood
    first_blood_candidate_id = deaths_in_edition[0]["candidate_id"] if deaths_in_edition else None

    # 2. Conteo de apostantes por candidato para calcular exclusividad
    cur.execute("""
        SELECT candidate_id, COUNT(*) as bettor_count
        FROM bets
        WHERE edition_id = ?
        GROUP BY candidate_id
    """, (edition_id,))
    candidate_counts = {r["candidate_id"]: r["bettor_count"] for r in cur.fetchall()}

    # 3. Obtener todas las apuestas de la edición con información de defunción
    cur.execute("""
        SELECT b.id as bet_id, b.candidate_id, b.is_captain,
               d.death_date, d.age_at_death
        FROM bets b
        LEFT JOIN deaths d ON b.candidate_id = d.candidate_id
        WHERE b.edition_id = ?
    """, (edition_id,))
    all_bets = [dict(r) for r in cur.fetchall()]

    for bet in all_bets:
        bet_id = bet["bet_id"]
        cid = bet["candidate_id"]
        is_captain = bool(bet["is_captain"])
        age_at_death = bet["age_at_death"]

        if age_at_death is not None:
            # El candidato ha fallecido
            is_exclusive = (candidate_counts.get(cid, 0) == 1)
            is_first_blood = (cid == first_blood_candidate_id)

            breakdown = calculate_points_breakdown(
                age_at_death=age_at_death,
                is_captain=is_captain,
                is_exclusive=is_exclusive,
                is_first_blood=is_first_blood,
            )

            cur.execute("""
                UPDATE bets
                SET points_awarded = ?,
                    is_exclusive = ?,
                    is_first_blood = ?
                WHERE id = ?
            """, (
                breakdown["total_points"],
                1 if is_exclusive else 0,
                1 if is_first_blood else 0,
                bet_id,
            ))
        else:
            # Aún vive
            cur.execute("""
                UPDATE bets
                SET points_awarded = 0,
                    is_exclusive = 0,
                    is_first_blood = 0
                WHERE id = ?
            """, (bet_id,))

    conn.commit()
    conn.close()


# ---------------- LEADERBOARD & STATS ----------------
def get_leaderboard(edition_id: int, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Obtiene la clasificación general de usuarios ordenada por puntos totales y aciertos."""
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("""
        SELECT u.id as user_id,
               u.display_name,
               u.avatar_emoji,
               COUNT(b.id) as total_bets,
               SUM(CASE WHEN b.points_awarded > 0 THEN 1 ELSE 0 END) as hits_count,
               SUM(CASE WHEN b.is_captain = 1 AND b.points_awarded > 0 THEN 1 ELSE 0 END) as captain_hits,
               COALESCE(SUM(b.points_awarded), 0) as total_points
        FROM users u
        LEFT JOIN bets b ON u.id = b.user_id AND b.edition_id = ?
        GROUP BY u.id
        ORDER BY total_points DESC, hits_count DESC, display_name ASC
    """, (edition_id,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def get_recent_deaths(edition_id: int, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Lista las defunciones de candidatos apostados en esta edición, con quién acertó y puntos."""
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("""
        SELECT d.id as death_id,
               c.id as candidate_id,
               c.full_name,
               c.category,
               c.wikipedia_url,
               d.death_date,
               d.age_at_death,
               d.cause_or_source,
               u.display_name as winner_name,
               u.avatar_emoji as winner_avatar,
               b.is_captain,
               b.is_exclusive,
               b.is_first_blood,
               b.points_awarded
        FROM deaths d
        JOIN candidates c ON d.candidate_id = c.id
        JOIN bets b ON c.id = b.candidate_id AND b.edition_id = ?
        JOIN users u ON b.user_id = u.id
        ORDER BY d.death_date DESC, b.points_awarded DESC
    """, (edition_id,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def get_candidate_popularity(edition_id: int, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Obtiene el listado del 'Panteón': candidatos más apostados en la edición."""
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("""
        SELECT c.id,
               c.full_name,
               c.category,
               c.estimated_age,
               c.wikipedia_url,
               COUNT(b.id) as bettor_count,
               GROUP_CONCAT(u.display_name, ', ') as bettors_list,
               CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END as is_deceased,
               d.death_date,
               d.age_at_death
        FROM candidates c
        JOIN bets b ON c.id = b.candidate_id AND b.edition_id = ?
        JOIN users u ON b.user_id = u.id
        LEFT JOIN deaths d ON c.id = d.candidate_id
        GROUP BY c.id
        ORDER BY bettor_count DESC, c.estimated_age DESC
    """, (edition_id,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def get_edition_summary(edition_id: int, db_path: str = DB_PATH) -> Dict[str, Any]:
    """Returns aggregate stats for the dashboard."""
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            (SELECT COUNT(DISTINCT user_id) FROM bets WHERE edition_id = ?) as total_users,
            (SELECT COUNT(*) FROM bets WHERE edition_id = ?) as total_bets,
            (SELECT COUNT(DISTINCT d.candidate_id) 
             FROM deaths d 
             JOIN bets b ON d.candidate_id = b.candidate_id 
             WHERE b.edition_id = ?) as total_deaths,
            (SELECT COALESCE(SUM(points_awarded), 0) FROM bets WHERE edition_id = ?) as total_points
    """, (edition_id, edition_id, edition_id, edition_id))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else {"total_users": 0, "total_bets": 0, "total_deaths": 0, "total_points": 0}


def get_deaths_grouped(edition_id: int, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Returns deaths grouped by candidate with aggregated bettor info."""
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            c.id as candidate_id,
            c.full_name,
            c.category,
            c.wikipedia_url,
            d.death_date,
            d.age_at_death,
            d.cause_or_source,
            COUNT(b.id) as bettor_count,
            GROUP_CONCAT(
                u.display_name || 
                CASE WHEN b.is_captain THEN ' (CAP)' ELSE '' END, 
                ', '
            ) as bettors,
            SUM(b.points_awarded) as total_points_given,
            MAX(b.is_first_blood) as is_first_blood
        FROM deaths d
        JOIN candidates c ON d.candidate_id = c.id
        JOIN bets b ON c.id = b.candidate_id AND b.edition_id = ?
        JOIN users u ON b.user_id = u.id
        GROUP BY d.candidate_id
        ORDER BY d.death_date DESC
    """, (edition_id,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def update_edition(
    edition_id: int,
    name: Optional[str] = None,
    lock_date: Optional[str] = None,
    is_active: Optional[int] = None,
    max_bets: Optional[int] = None,
    db_path: str = DB_PATH,
):
    """Actualiza la configuración y fecha límite de una edición."""
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("""
        UPDATE editions 
        SET name = COALESCE(?, name),
            lock_date = COALESCE(?, lock_date),
            is_active = COALESCE(?, is_active),
            max_bets_per_user = COALESCE(?, max_bets_per_user)
        WHERE id = ?
    """, (name, lock_date, is_active, max_bets, edition_id))
    conn.commit()
    conn.close()


def get_available_candidates_for_user(
    edition_id: int, user_id: int, db_path: str = DB_PATH
) -> List[Dict[str, Any]]:
    """Devuelve los candidatos vivos registrados en el sistema que este usuario aún no ha seleccionado."""
    conn = get_connection(db_path)
    cur = conn.cursor()
    cur.execute("""
        SELECT c.*,
               (SELECT COUNT(*) FROM bets b WHERE b.candidate_id = c.id AND b.edition_id = ?) as global_bettors_count
        FROM candidates c
        LEFT JOIN deaths d ON c.id = d.candidate_id
        WHERE d.id IS NULL
          AND c.id NOT IN (
              SELECT candidate_id FROM bets WHERE user_id = ? AND edition_id = ?
          )
        ORDER BY global_bettors_count DESC, c.full_name ASC
    """, (edition_id, user_id, edition_id))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def simulate_death_impact(
    edition_id: int,
    candidate_id: int,
    simulated_age: Optional[int] = None,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """
    Simulador 'What-If': Proyecta cómo cambiaría la clasificación de la edición
    si el candidato indicado falleciera en este momento.
    """
    conn = get_connection(db_path)
    cur = conn.cursor()

    # Datos del candidato
    cur.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,))
    candidate = dict(cur.fetchone())

    # Comprobar si ya está fallecido
    cur.execute("SELECT * FROM deaths WHERE candidate_id = ?", (candidate_id,))
    if cur.fetchone():
        conn.close()
        return {"error": "El candidato ya ha fallecido oficialmente."}

    age = simulated_age if simulated_age is not None else candidate["estimated_age"]

    # Clasificación actual antes de la simulación
    current_lb = get_leaderboard(edition_id, db_path=db_path)
    current_ranks = {u["user_id"]: idx + 1 for idx, u in enumerate(current_lb)}
    current_points = {u["user_id"]: u["total_points"] for u in current_lb}

    # Apostantes de este candidato en esta edición
    cur.execute("""
        SELECT b.id, b.user_id, b.is_captain, u.display_name
        FROM bets b
        JOIN users u ON b.user_id = u.id
        WHERE b.edition_id = ? AND b.candidate_id = ?
    """, (edition_id, candidate_id))
    bettors = [dict(r) for r in cur.fetchall()]

    # ¿Exclusivo?
    is_exclusive = (len(bettors) == 1)

    # ¿First blood?
    cur.execute("""
        SELECT COUNT(*) as death_count 
        FROM deaths d 
        JOIN bets b ON d.candidate_id = b.candidate_id 
        WHERE b.edition_id = ?
    """, (edition_id,))
    is_first_blood = (cur.fetchone()["death_count"] == 0)

    # Calcular puntos ganados por cada apostante
    gains = {}
    for b in bettors:
        breakdown = calculate_points_breakdown(
            age_at_death=age,
            is_captain=bool(b["is_captain"]),
            is_exclusive=is_exclusive,
            is_first_blood=is_first_blood,
        )
        gains[b["user_id"]] = {
            "display_name": b["display_name"],
            "is_captain": bool(b["is_captain"]),
            "is_exclusive": is_exclusive,
            "is_first_blood": is_first_blood,
            "points_gained": breakdown["total_points"],
            "breakdown": breakdown,
        }

    # Generar tabla simulada
    simulated_lb = []
    for u in current_lb:
        uid = u["user_id"]
        gain_info = gains.get(uid)
        pts_add = gain_info["points_gained"] if gain_info else 0
        hits_add = 1 if gain_info else 0
        cap_add = 1 if (gain_info and gain_info["is_captain"]) else 0

        simulated_lb.append({
            "user_id": uid,
            "display_name": u["display_name"],
            "avatar_emoji": u.get("avatar_emoji", ""),
            "total_bets": u["total_bets"],
            "hits_count": u["hits_count"] + hits_add,
            "captain_hits": u["captain_hits"] + cap_add,
            "total_points": u["total_points"] + pts_add,
            "points_gained": pts_add,
            "prev_rank": current_ranks[uid],
            "prev_points": current_points[uid],
        })

    # Ordenar tabla simulada
    simulated_lb.sort(key=lambda x: (x["total_points"], x["hits_count"]), reverse=True)

    # Asignar nuevo rango y cambio de posición
    for new_rank, u in enumerate(simulated_lb, start=1):
        u["new_rank"] = new_rank
        u["rank_delta"] = u["prev_rank"] - new_rank  # Positivo = sube puestos

    conn.close()

    return {
        "candidate": candidate,
        "simulated_age": age,
        "bettors_count": len(bettors),
        "is_exclusive": is_exclusive,
        "is_first_blood": is_first_blood,
        "gains": gains,
        "current_leaderboard": current_lb,
        "simulated_leaderboard": simulated_lb,
    }


def get_head_to_head(
    edition_id: int, user1_id: int, user2_id: int, db_path: str = DB_PATH
) -> Dict[str, Any]:
    """
    Compara las plantillas de dos participantes cara a cara:
    - Coincidencias en candidatos
    - Candidatos diferenciales de cada uno
    - Edad media y perfil de riesgo
    - Puntos potenciales restantes
    """
    bets1 = get_user_bets(user1_id, edition_id, db_path=db_path)
    bets2 = get_user_bets(user2_id, edition_id, db_path=db_path)

    u1 = get_user_by_id(user1_id, db_path=db_path)
    u2 = get_user_by_id(user2_id, db_path=db_path)

    cands1 = {b["candidate_id"]: b for b in bets1}
    cands2 = {b["candidate_id"]: b for b in bets2}

    shared_ids = set(cands1.keys()) & set(cands2.keys())
    diff1_ids = set(cands1.keys()) - set(cands2.keys())
    diff2_ids = set(cands2.keys()) - set(cands1.keys())

    shared_bets = [cands1[cid] for cid in shared_ids]
    diff_user1 = [cands1[cid] for cid in diff1_ids]
    diff_user2 = [cands2[cid] for cid in diff2_ids]

    # Estadísticas de usuario 1
    alive1 = [b for b in bets1 if not b["is_deceased"]]
    avg_age1 = sum(b["estimated_age"] for b in alive1) / len(alive1) if alive1 else 0
    pts1 = sum(b["points_awarded"] for b in bets1)
    potential1 = pts1 + sum(
        calculate_base_points(b["estimated_age"]) * (2 if b["is_captain"] else 1)
        for b in alive1
    )

    # Estadísticas de usuario 2
    alive2 = [b for b in bets2 if not b["is_deceased"]]
    avg_age2 = sum(b["estimated_age"] for b in alive2) / len(alive2) if alive2 else 0
    pts2 = sum(b["points_awarded"] for b in bets2)
    potential2 = pts2 + sum(
        calculate_base_points(b["estimated_age"]) * (2 if b["is_captain"] else 1)
        for b in alive2
    )

    def get_risk_profile(avg_age: float) -> str:
        if avg_age == 0:
            return "Sin apuestas activas"
        if avg_age >= 88:
            return "Conservador (apuestas de edad muy avanzada)"
        elif avg_age >= 75:
            return "Equilibrado (combinación de veteranía y puntos)"
        else:
            return "Audaz (alto riesgo y alta recompensa)"

    return {
        "user1": u1,
        "user2": u2,
        "points1": pts1,
        "points2": pts2,
        "points_gap": abs(pts1 - pts2),
        "leader": u1["display_name"] if pts1 > pts2 else (u2["display_name"] if pts2 > pts1 else "Empate"),
        "avg_age1": round(avg_age1, 1),
        "avg_age2": round(avg_age2, 1),
        "profile1": get_risk_profile(avg_age1),
        "profile2": get_risk_profile(avg_age2),
        "potential1": potential1,
        "potential2": potential2,
        "shared_bets": shared_bets,
        "diff_user1": diff_user1,
        "diff_user2": diff_user2,
    }


def reset_db(db_path: str = DB_PATH):
    """Borra y recrea las tablas (útil para pruebas o reinicio total)."""
    if os.path.exists(db_path):
        os.remove(db_path)
    init_db(db_path)

