"""
seed_data.py - Generador de datos iniciales de demostración.
"""

import database as db


def populate_demo_data(db_path: str = db.DB_PATH, reset_first: bool = False):
    """Genera una edición completa con participantes, candidatos y resultados parciales."""
    if reset_first:
        db.reset_db(db_path)
    else:
        db.init_db(db_path)

    edition = db.get_or_create_edition(2026, "Necroporra 2026", db_path=db_path)
    eid = edition["id"]

    # --- Participantes ---
    users = {}
    for uname, dname in [("jorge", "Jorge"), ("carlos", "Carlos"), ("lucia", "Lucía"),
                          ("marcos", "Marcos"), ("elena", "Elena")]:
        existing = {u["username"]: u["id"] for u in db.list_users(db_path=db_path)}
        if uname in existing:
            users[uname] = existing[uname]
        else:
            users[uname] = db.create_user(uname, dname, "", db_path=db_path)

    # --- Candidatos ---
    # (nombre, edad, categoría, fecha_nacimiento, wikipedia, notas)
    cands = [
        ("Clint Eastwood", 96, "Cine", "1930-05-31",
         "https://es.wikipedia.org/wiki/Clint_Eastwood", "Actor y director"),
        ("Noam Chomsky", 97, "Pensamiento", "1928-12-07",
         "https://es.wikipedia.org/wiki/Noam_Chomsky", "Lingüista y filósofo"),
        ("Ozzy Osbourne", 77, "Música", "1948-12-03",
         "https://es.wikipedia.org/wiki/Ozzy_Osbourne", "Vocalista de Black Sabbath, Parkinson"),
        ("Brigitte Bardot", 92, "Cine", "1934-09-28",
         "https://es.wikipedia.org/wiki/Brigitte_Bardot", "Actriz e icono francés"),
        ("Juan Carlos I", 88, "Realeza", "1938-01-05",
         "https://es.wikipedia.org/wiki/Juan_Carlos_I_de_Espa%C3%B1a", "Rey emérito de España"),
        ("Gene Hackman", 96, "Cine", "1930-01-30",
         "https://es.wikipedia.org/wiki/Gene_Hackman", "Retirado, problemas de salud"),
        ("Willie Nelson", 93, "Música", "1933-04-29",
         "https://es.wikipedia.org/wiki/Willie_Nelson", "Leyenda del country"),
        ("Joe Biden", 83, "Política", "1942-11-20",
         "https://es.wikipedia.org/wiki/Joe_Biden", "Expresidente de EE.UU."),
        ("Keith Richards", 82, "Música", "1943-12-18",
         "https://es.wikipedia.org/wiki/Keith_Richards", "Guitarrista de los Rolling Stones"),
        ("Rupert Murdoch", 95, "Empresa", "1931-03-11",
         "https://en.wikipedia.org/wiki/Rupert_Murdoch", "Magnate de medios"),
        ("Bob Newhart", 97, "Comedia", "1929-09-05",
         "https://en.wikipedia.org/wiki/Bob_Newhart", "Comediante legendario"),
        ("Dick Van Dyke", 100, "Cine", "1925-12-13",
         "https://es.wikipedia.org/wiki/Dick_Van_Dyke", "Actor centenario"),
        ("Sofía Loren", 92, "Cine", "1934-09-20",
         "https://es.wikipedia.org/wiki/Sof%C3%ADa_Loren", "Actriz italiana, Óscar honorífico"),
        ("Yoko Ono", 93, "Arte", "1933-02-18",
         "https://es.wikipedia.org/wiki/Yoko_Ono", "Artista, viuda de John Lennon"),
        ("Mick Jagger", 83, "Música", "1943-07-26",
         "https://es.wikipedia.org/wiki/Mick_Jagger", "Vocalista de los Rolling Stones"),
        ("Al Pacino", 86, "Cine", "1940-04-25",
         "https://es.wikipedia.org/wiki/Al_Pacino", "Actor, padre reciente a los 83"),
        ("Bob Dylan", 85, "Música", "1941-05-24",
         "https://es.wikipedia.org/wiki/Bob_Dylan", "Nobel de Literatura, en gira aún"),
        ("Charlie Sheen", 61, "Cine", "1965-09-03",
         "https://es.wikipedia.org/wiki/Charlie_Sheen", "Actor, vida turbulenta"),
        ("Bam Margera", 47, "Entretenimiento", "1979-09-28",
         "https://es.wikipedia.org/wiki/Bam_Margera", "Jackass, adicciones"),
        ("Kanye West", 49, "Música", "1977-06-08",
         "https://es.wikipedia.org/wiki/Kanye_West", "Rapero, comportamiento errático"),
    ]

    cids = {}
    for name, age, cat, bdate, wiki, note in cands:
        cids[name] = db.search_or_create_candidate(
            full_name=name, estimated_age=age, category=cat,
            birth_date=bdate, wikipedia_url=wiki, notes=note, db_path=db_path)

    # --- Apuestas (7 por participante, 1 capitán cada uno) ---
    picks = {
        "jorge": [
            ("Dick Van Dyke", True),   # Capitán - centenario, apuesta segura
            ("Ozzy Osbourne", False),
            ("Clint Eastwood", False),
            ("Juan Carlos I", False),
            ("Bam Margera", False),    # Joven, alto riesgo
            ("Mick Jagger", False),
            ("Rupert Murdoch", False),
        ],
        "carlos": [
            ("Clint Eastwood", True),  # Capitán
            ("Ozzy Osbourne", False),
            ("Gene Hackman", False),
            ("Joe Biden", False),
            ("Keith Richards", False),
            ("Bob Dylan", False),
            ("Al Pacino", False),
        ],
        "lucia": [
            ("Noam Chomsky", True),    # Capitán
            ("Brigitte Bardot", False),
            ("Willie Nelson", False),
            ("Juan Carlos I", False),
            ("Charlie Sheen", False),
            ("Sofía Loren", False),
            ("Yoko Ono", False),
        ],
        "marcos": [
            ("Gene Hackman", True),    # Capitán
            ("Noam Chomsky", False),
            ("Keith Richards", False),
            ("Ozzy Osbourne", False),
            ("Bob Newhart", False),
            ("Dick Van Dyke", False),
            ("Kanye West", False),     # Joven, alto riesgo
        ],
        "elena": [
            ("Willie Nelson", True),   # Capitán
            ("Brigitte Bardot", False),
            ("Joe Biden", False),
            ("Clint Eastwood", False),
            ("Bam Margera", False),
            ("Rupert Murdoch", False),
            ("Al Pacino", False),
        ],
    }

    for uname, user_picks in picks.items():
        uid = users[uname]
        existing = {b["candidate_id"] for b in db.get_user_bets(uid, eid, db_path=db_path)}
        for cname, is_cap in user_picks:
            if cids[cname] not in existing:
                db.place_bet(eid, uid, cids[cname], is_captain=is_cap, db_path=db_path)

    # --- Defunciones confirmadas (para que el leaderboard muestre acción) ---

    # Dick Van Dyke - centenario, primer fallecimiento del año
    db.record_death(cids["Dick Van Dyke"], "2026-02-03", 100,
                    "Causas naturales", db_path=db_path)

    # Ozzy Osbourne - 77 años, muchos lo tenían
    db.record_death(cids["Ozzy Osbourne"], "2026-05-19", 77,
                    "Complicaciones derivadas del Parkinson", db_path=db_path)

    # Bob Newhart - 97 años, solo Marcos lo tenía (exclusivo)
    db.record_death(cids["Bob Newhart"], "2026-08-14", 97,
                    "Fallecimiento natural", db_path=db_path)

    db.recalculate_edition_points(eid, db_path=db_path)
    print("Datos de demostración cargados correctamente.")


if __name__ == "__main__":
    populate_demo_data(reset_first=True)
