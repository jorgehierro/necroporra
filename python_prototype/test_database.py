"""
test_database.py - Pruebas automáticas de integración de la base de datos y cálculo de puntos.
"""

import os
import database as db

TEST_DB = "test_necroporra.db"


def test_db_flow():
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

    db.init_db(TEST_DB)

    # 1. Crear Edición
    ed = db.get_or_create_edition(2026, "Necroporra 2026 Test", db_path=TEST_DB)
    assert ed["year"] == 2026

    # 2. Crear Usuarios
    u1 = db.create_user("jorge", "Jorge", "", db_path=TEST_DB)
    u2 = db.create_user("carlos", "Carlos", "", db_path=TEST_DB)
    assert len(db.list_users(db_path=TEST_DB)) == 2

    # 3. Crear Candidatos
    c1 = db.search_or_create_candidate(
        "Jimmy Carter", 101, "Política", db_path=TEST_DB
    )
    c2 = db.search_or_create_candidate(
        "Ozzy Osbourne", 77, "Música", db_path=TEST_DB
    )
    c3 = db.search_or_create_candidate(
        "Macaulay Culkin", 45, "Cine", db_path=TEST_DB
    )

    # 4. Registrar Apuestas
    # Jorge apuesta por Jimmy Carter (Capitán) y Ozzy Osbourne
    b1 = db.place_bet(ed["id"], u1, c1, is_captain=True, db_path=TEST_DB)
    b2 = db.place_bet(ed["id"], u1, c2, is_captain=False, db_path=TEST_DB)

    # Carlos apuesta por Ozzy Osbourne y Macaulay Culkin (Capitán)
    b3 = db.place_bet(ed["id"], u2, c2, is_captain=False, db_path=TEST_DB)
    b4 = db.place_bet(ed["id"], u2, c3, is_captain=True, db_path=TEST_DB)

    # Comprobar apuestas antes de defunciones
    bets_u1 = db.get_user_bets(u1, ed["id"], db_path=TEST_DB)
    assert len(bets_u1) == 2
    assert all(b["points_awarded"] == 0 for b in bets_u1)

    # 5. Registrar primera defunción: Jimmy Carter a los 101 años
    # Como sólo Jorge lo tenía:
    # Base: max(1, 100 - 101) = 1
    # Capitán: +1 (x2)
    # Exclusivo: +10
    # First Blood: +10
    # Centenario: +5
    # Total esperado para Jorge: 1 + 1 + 10 + 10 + 5 = 27 pts
    db.record_death(c1, "2026-02-15", 101, "Causas naturales", db_path=TEST_DB)

    lb = db.get_leaderboard(ed["id"], db_path=TEST_DB)
    assert lb[0]["user_id"] == u1
    assert lb[0]["total_points"] == 27
    assert lb[0]["hits_count"] == 1
    assert lb[1]["user_id"] == u2
    assert lb[1]["total_points"] == 0

    # 6. Registrar segunda defunción: Ozzy Osbourne a los 77 años
    # Ambos lo tenían, así que NO es exclusivo (+0) y NO es first blood (+0)
    # Base: 100 - 77 = 23 pts
    # Ninguno lo tenía como capitán (+0)
    # Total esperado: +23 pts para ambos
    db.record_death(c2, "2026-05-10", 77, "Complicaciones de salud", db_path=TEST_DB)

    lb = db.get_leaderboard(ed["id"], db_path=TEST_DB)
    # Jorge: 27 + 23 = 50 pts, 2 aciertos
    assert lb[0]["user_id"] == u1
    assert lb[0]["total_points"] == 50
    assert lb[0]["hits_count"] == 2

    # Carlos: 23 pts, 1 acierto
    assert lb[1]["user_id"] == u2
    assert lb[1]["total_points"] == 23
    assert lb[1]["hits_count"] == 1

    # 7. Comprobar nuevas funciones: resumen, grouped deaths, available candidates, simulación y H2H
    summary = db.get_edition_summary(ed["id"], db_path=TEST_DB)
    assert summary["total_users"] == 2
    assert summary["total_bets"] == 4
    assert summary["total_deaths"] == 2

    avail = db.get_available_candidates_for_user(ed["id"], u1, db_path=TEST_DB)
    assert any(c["id"] == c3 for c in avail)

    sim = db.simulate_death_impact(ed["id"], c3, simulated_age=45, db_path=TEST_DB)
    assert "simulated_leaderboard" in sim
    # Carlos tenía a c3 como capitán a los 45 años: 100 - 45 = 55 base, x2 capitán = +110, exclusivo = +10, juventud = +15 -> enorme subida
    assert sim["gains"][u2]["points_gained"] > 50

    h2h = db.get_head_to_head(ed["id"], u1, u2, db_path=TEST_DB)
    assert len(h2h["shared_bets"]) == 1  # Ozzy
    assert h2h["leader"] == "Jorge"

    # Limpieza
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

    print("¡Pruebas de base de datos y recálculo de puntos superadas con éxito!")


if __name__ == "__main__":
    test_db_flow()
