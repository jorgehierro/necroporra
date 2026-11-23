import { createClient } from "@libsql/client";
import { calculatePointsBreakdown } from "./scoring";
import { Edition, User, Candidate, Bet, LeaderboardEntry, DeathRecord } from "./types";

// Si hay TURSO_DATABASE_URL (en Vercel), se conecta a la nube sin servidores.
// En local, se conecta automáticamente a un archivo SQLite 'necroporra.db'.
const url = process.env.TURSO_DATABASE_URL || "file:necroporra.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export const client = createClient({
  url,
  authToken,
});

export async function initDb() {
  await client.executeMultiple(`
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
      pin TEXT DEFAULT '1234',
      is_admin INTEGER DEFAULT 0,
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
  `);

  try {
    await client.execute("ALTER TABLE users ADD COLUMN pin TEXT DEFAULT '1234'");
  } catch {}
  try {
    await client.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0");
  } catch {}
}

export async function getActiveEdition(): Promise<Edition> {
  await initDb();
  const currentYear = new Date().getFullYear();
  const res = await client.execute({
    sql: "SELECT * FROM editions WHERE is_active = 1 ORDER BY year DESC LIMIT 1",
    args: [],
  });

  if (res.rows.length > 0) {
    return res.rows[0] as unknown as Edition;
  }

  // Crear edición para el año actual si no existe
  await client.execute({
    sql: "INSERT INTO editions (name, year, is_active, max_bets_per_user) VALUES (?, ?, 1, 10)",
    args: [`Necroporra ${currentYear}`, currentYear],
  });

  const created = await client.execute({
    sql: "SELECT * FROM editions WHERE year = ?",
    args: [currentYear],
  });
  return created.rows[0] as unknown as Edition;
}

export async function listUsers(): Promise<User[]> {
  await initDb();
  const res = await client.execute("SELECT id, username, display_name, is_admin FROM users ORDER BY display_name ASC");
  return res.rows as unknown as User[];
}

export async function getUserById(id: number): Promise<User | null> {
  const res = await client.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] });
  return (res.rows[0] as unknown as User) || null;
}

export async function authenticateUser(userId: number, pin: string): Promise<User | null> {
  const res = await client.execute({
    sql: "SELECT * FROM users WHERE id = ? AND pin = ?",
    args: [userId, pin],
  });
  return (res.rows[0] as unknown as User) || null;
}

export async function createUser(username: string, displayName: string, pin: string = "1234"): Promise<number> {
  await initDb();
  const res = await client.execute({
    sql: "INSERT INTO users (username, display_name, pin) VALUES (?, ?, ?)",
    args: [username.trim().toLowerCase(), displayName.trim(), pin.trim()],
  });
  return Number(res.lastInsertRowid);
}

export async function listCandidates(): Promise<Candidate[]> {
  await initDb();
  const res = await client.execute(`
    SELECT c.*, 
           d.death_date, 
           d.age_at_death, 
           d.cause_or_source,
           CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END as is_deceased
    FROM candidates c
    LEFT JOIN deaths d ON c.id = d.candidate_id
    ORDER BY c.full_name ASC
  `);
  return res.rows as unknown as Candidate[];
}

export async function searchOrCreateCandidate(
  fullName: string,
  estimatedAge: number,
  category: string = "General",
  wikipediaUrl?: string,
  notes?: string
): Promise<number> {
  await initDb();
  const cleanName = fullName.trim();
  const existing = await client.execute({
    sql: "SELECT id FROM candidates WHERE LOWER(full_name) = LOWER(?)",
    args: [cleanName],
  });

  if (existing.rows.length > 0) {
    const id = Number(existing.rows[0].id);
    await client.execute({
      sql: `UPDATE candidates 
            SET estimated_age = COALESCE(?, estimated_age),
                category = COALESCE(?, category),
                wikipedia_url = COALESCE(?, wikipedia_url),
                notes = COALESCE(?, notes)
            WHERE id = ?`,
      args: [estimatedAge, category, wikipediaUrl || null, notes || null, id],
    });
    return id;
  }

  const inserted = await client.execute({
    sql: `INSERT INTO candidates (full_name, estimated_age, category, wikipedia_url, notes)
          VALUES (?, ?, ?, ?, ?)`,
    args: [cleanName, estimatedAge, category, wikipediaUrl || null, notes || null],
  });
  return Number(inserted.lastInsertRowid);
}

export async function getUserBets(userId: number, editionId: number): Promise<Bet[]> {
  await initDb();
  const res = await client.execute({
    sql: `
      SELECT b.*,
             c.full_name,
             c.estimated_age,
             c.category,
             c.wikipedia_url,
             d.death_date,
             d.age_at_death,
             d.cause_or_source,
             CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END as is_deceased
      FROM bets b
      JOIN candidates c ON b.candidate_id = c.id
      LEFT JOIN deaths d ON c.id = d.candidate_id
      WHERE b.user_id = ? AND b.edition_id = ?
      ORDER BY b.is_captain DESC, b.points_awarded DESC, c.full_name ASC
    `,
    args: [userId, editionId],
  });
  return res.rows as unknown as Bet[];
}

export async function placeBet(editionId: number, userId: number, candidateId: number, isCaptain: boolean = false): Promise<number> {
  if (isCaptain) {
    await client.execute({
      sql: "UPDATE bets SET is_captain = 0 WHERE edition_id = ? AND user_id = ?",
      args: [editionId, userId],
    });
  }

  const res = await client.execute({
    sql: `INSERT INTO bets (edition_id, user_id, candidate_id, is_captain)
          VALUES (?, ?, ?, ?)`,
    args: [editionId, userId, candidateId, isCaptain ? 1 : 0],
  });

  await recalculateEditionPoints(editionId);
  return Number(res.lastInsertRowid);
}

export async function deleteBet(betId: number): Promise<void> {
  const betRow = await client.execute({
    sql: "SELECT edition_id FROM bets WHERE id = ?",
    args: [betId],
  });
  const editionId = betRow.rows[0]?.edition_id ? Number(betRow.rows[0].edition_id) : null;

  await client.execute({ sql: "DELETE FROM bets WHERE id = ?", args: [betId] });

  if (editionId) {
    await recalculateEditionPoints(editionId);
  }
}

export async function setCaptain(betId: number, userId: number, editionId: number): Promise<void> {
  await client.execute({
    sql: "UPDATE bets SET is_captain = 0 WHERE edition_id = ? AND user_id = ?",
    args: [editionId, userId],
  });
  await client.execute({
    sql: "UPDATE bets SET is_captain = 1 WHERE id = ? AND user_id = ? AND edition_id = ?",
    args: [betId, userId, editionId],
  });
  await recalculateEditionPoints(editionId);
}

export async function recordDeath(
  candidateId: number,
  deathDate: string,
  ageAtDeath: number,
  causeOrSource?: string
): Promise<number> {
  await client.execute({
    sql: `
      INSERT INTO deaths (candidate_id, death_date, age_at_death, cause_or_source)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(candidate_id) DO UPDATE SET
        death_date = excluded.death_date,
        age_at_death = excluded.age_at_death,
        cause_or_source = excluded.cause_or_source
    `,
    args: [candidateId, deathDate, ageAtDeath, causeOrSource || null],
  });

  const editions = await client.execute("SELECT id FROM editions");
  for (const row of editions.rows) {
    await recalculateEditionPoints(Number(row.id));
  }
  return candidateId;
}

export async function deleteDeath(candidateId: number): Promise<void> {
  await client.execute({
    sql: "DELETE FROM deaths WHERE candidate_id = ?",
    args: [candidateId],
  });

  const editions = await client.execute("SELECT id FROM editions");
  for (const row of editions.rows) {
    await recalculateEditionPoints(Number(row.id));
  }
}

export async function recalculateEditionPoints(editionId: number): Promise<void> {
  const deathsRes = await client.execute({
    sql: `
      SELECT DISTINCT d.candidate_id, d.death_date, d.age_at_death
      FROM deaths d
      JOIN bets b ON d.candidate_id = b.candidate_id
      WHERE b.edition_id = ?
      ORDER BY d.death_date ASC, d.id ASC
    `,
    args: [editionId],
  });

  const deathsInEdition = deathsRes.rows;
  const firstBloodCandidateId = deathsInEdition.length > 0 ? Number(deathsInEdition[0].candidate_id) : null;

  const countRes = await client.execute({
    sql: `SELECT candidate_id, COUNT(*) as bettor_count FROM bets WHERE edition_id = ? GROUP BY candidate_id`,
    args: [editionId],
  });
  const candidateCounts = new Map<number, number>();
  for (const r of countRes.rows) {
    candidateCounts.set(Number(r.candidate_id), Number(r.bettor_count));
  }

  const betsRes = await client.execute({
    sql: `
      SELECT b.id as bet_id, b.candidate_id, b.is_captain, d.death_date, d.age_at_death
      FROM bets b
      LEFT JOIN deaths d ON b.candidate_id = d.candidate_id
      WHERE b.edition_id = ?
    `,
    args: [editionId],
  });

  for (const bet of betsRes.rows) {
    const betId = Number(bet.bet_id);
    const cid = Number(bet.candidate_id);
    const isCap = Boolean(bet.is_captain);
    const ageAtDeath = bet.age_at_death !== null ? Number(bet.age_at_death) : null;

    if (ageAtDeath !== null) {
      const isExclusive = candidateCounts.get(cid) === 1;
      const isFirstBlood = cid === firstBloodCandidateId;

      const breakdown = calculatePointsBreakdown({
        ageAtDeath,
        isCaptain: isCap,
        isExclusive,
        isFirstBlood,
      });

      await client.execute({
        sql: `UPDATE bets SET points_awarded = ?, is_exclusive = ?, is_first_blood = ? WHERE id = ?`,
        args: [breakdown.total_points, isExclusive ? 1 : 0, isFirstBlood ? 1 : 0, betId],
      });
    } else {
      await client.execute({
        sql: `UPDATE bets SET points_awarded = 0, is_exclusive = 0, is_first_blood = 0 WHERE id = ?`,
        args: [betId],
      });
    }
  }
}

export async function getLeaderboard(editionId: number): Promise<LeaderboardEntry[]> {
  await initDb();
  const res = await client.execute({
    sql: `
      SELECT u.id as user_id,
             u.display_name,
             COUNT(b.id) as total_bets,
             SUM(CASE WHEN b.points_awarded > 0 THEN 1 ELSE 0 END) as hits_count,
             SUM(CASE WHEN b.is_captain = 1 AND b.points_awarded > 0 THEN 1 ELSE 0 END) as captain_hits,
             COALESCE(SUM(b.points_awarded), 0) as total_points
      FROM users u
      LEFT JOIN bets b ON u.id = b.user_id AND b.edition_id = ?
      GROUP BY u.id
      ORDER BY total_points DESC, hits_count DESC, display_name ASC
    `,
    args: [editionId],
  });
  return res.rows as unknown as LeaderboardEntry[];
}

export async function getDeathsGrouped(editionId: number): Promise<DeathRecord[]> {
  await initDb();
  const res = await client.execute({
    sql: `
      SELECT 
          c.id as candidate_id,
          c.full_name,
          c.category,
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
    `,
    args: [editionId],
  });
  return res.rows as unknown as DeathRecord[];
}

export async function getAvailableCandidatesForUser(editionId: number, userId: number): Promise<Candidate[]> {
  await initDb();
  const res = await client.execute({
    sql: `
      SELECT c.*,
             (SELECT COUNT(*) FROM bets b WHERE b.candidate_id = c.id AND b.edition_id = ?) as bettor_count
      FROM candidates c
      LEFT JOIN deaths d ON c.id = d.candidate_id
      WHERE d.id IS NULL
        AND c.id NOT IN (
            SELECT candidate_id FROM bets WHERE user_id = ? AND edition_id = ?
        )
      ORDER BY bettor_count DESC, c.full_name ASC
    `,
    args: [editionId, userId, editionId],
  });
  return res.rows as unknown as Candidate[];
}

export async function simulateDeathImpact(editionId: number, candidateId: number, simulatedAge?: number) {
  await initDb();
  const candRes = await client.execute({ sql: "SELECT * FROM candidates WHERE id = ?", args: [candidateId] });
  if (candRes.rows.length === 0) return { error: "Candidato no encontrado" };
  const candidate = candRes.rows[0];

  const deathRes = await client.execute({ sql: "SELECT id FROM deaths WHERE candidate_id = ?", args: [candidateId] });
  if (deathRes.rows.length > 0) return { error: "El candidato ya ha fallecido oficialmente" };

  const age = simulatedAge !== undefined ? simulatedAge : Number(candidate.estimated_age);
  const currentLb = await getLeaderboard(editionId);

  const bettorsRes = await client.execute({
    sql: `SELECT b.id, b.user_id, b.is_captain, u.display_name FROM bets b JOIN users u ON b.user_id = u.id WHERE b.edition_id = ? AND b.candidate_id = ?`,
    args: [editionId, candidateId],
  });
  const bettors = bettorsRes.rows;
  const isExclusive = bettors.length === 1;

  const countRes = await client.execute({
    sql: `SELECT COUNT(*) as death_count FROM deaths d JOIN bets b ON d.candidate_id = b.candidate_id WHERE b.edition_id = ?`,
    args: [editionId],
  });
  const isFirstBlood = Number(countRes.rows[0]?.death_count || 0) === 0;

  const gains: Record<number, { display_name: string; is_captain: boolean; points_gained: number }> = {};
  for (const b of bettors) {
    const uid = Number(b.user_id);
    const isCap = Boolean(b.is_captain);
    const breakdown = calculatePointsBreakdown({
      ageAtDeath: age,
      isCaptain: isCap,
      isExclusive,
      isFirstBlood,
    });
    gains[uid] = {
      display_name: String(b.display_name),
      is_captain: isCap,
      points_gained: breakdown.total_points,
    };
  }

  const simulatedLb = currentLb.map((u, idx) => {
    const gain = gains[u.user_id];
    const ptsAdd = gain ? gain.points_gained : 0;
    const hitsAdd = gain ? 1 : 0;
    const capAdd = gain && gain.is_captain ? 1 : 0;

    return {
      user_id: u.user_id,
      display_name: u.display_name,
      total_bets: u.total_bets,
      hits_count: u.hits_count + hitsAdd,
      captain_hits: u.captain_hits + capAdd,
      total_points: u.total_points + ptsAdd,
      points_gained: ptsAdd,
      prev_rank: idx + 1,
    };
  });

  simulatedLb.sort((a, b) => b.total_points - a.total_points || b.hits_count - a.hits_count);

  const finalSimulated = simulatedLb.map((u, idx) => ({
    ...u,
    new_rank: idx + 1,
    rank_delta: u.prev_rank - (idx + 1),
  }));

  return {
    candidate,
    simulated_age: age,
    bettors_count: bettors.length,
    is_exclusive: isExclusive,
    is_first_blood: isFirstBlood,
    gains,
    simulated_leaderboard: finalSimulated,
  };
}

export async function getHeadToHead(editionId: number, user1Id: number, user2Id: number) {
  const bets1 = await getUserBets(user1Id, editionId);
  const bets2 = await getUserBets(user2Id, editionId);

  const u1 = await getUserById(user1Id);
  const u2 = await getUserById(user2Id);

  const map1 = new Map(bets1.map((b) => [b.candidate_id, b]));
  const map2 = new Map(bets2.map((b) => [b.candidate_id, b]));

  const sharedBets: Bet[] = [];
  const diffUser1: Bet[] = [];
  const diffUser2: Bet[] = [];

  for (const b of bets1) {
    if (map2.has(b.candidate_id)) sharedBets.push(b);
    else diffUser1.push(b);
  }
  for (const b of bets2) {
    if (!map1.has(b.candidate_id)) diffUser2.push(b);
  }

  const pts1 = bets1.reduce((acc, b) => acc + (b.points_awarded || 0), 0);
  const pts2 = bets2.reduce((acc, b) => acc + (b.points_awarded || 0), 0);

  const alive1 = bets1.filter((b) => !b.is_deceased);
  const avgAge1 = alive1.length > 0 ? alive1.reduce((acc, b) => acc + (b.estimated_age || 0), 0) / alive1.length : 0;

  const alive2 = bets2.filter((b) => !b.is_deceased);
  const avgAge2 = alive2.length > 0 ? alive2.reduce((acc, b) => acc + (b.estimated_age || 0), 0) / alive2.length : 0;

  return {
    user1: u1,
    user2: u2,
    points1: pts1,
    points2: pts2,
    points_gap: Math.abs(pts1 - pts2),
    leader: pts1 > pts2 ? u1?.display_name : pts2 > pts1 ? u2?.display_name : "Empate",
    avg_age1: Number(avgAge1.toFixed(1)),
    avg_age2: Number(avgAge2.toFixed(1)),
    shared_bets: sharedBets,
    diff_user1: diffUser1,
    diff_user2: diffUser2,
  };
}

export async function seedDemoData() {
  await initDb();
  const edition = await getActiveEdition();
  const eid = edition.id;

  // Participantes con PINs simples
  const users = [
    { username: "jorge", display_name: "Jorge", pin: "1234" },
    { username: "carlos", display_name: "Carlos", pin: "1234" },
    { username: "lucia", display_name: "Lucía", pin: "1234" },
    { username: "marcos", display_name: "Marcos", pin: "1234" },
    { username: "elena", display_name: "Elena", pin: "1234" },
  ];

  const userIds: Record<string, number> = {};
  for (const u of users) {
    const existing = await client.execute({ sql: "SELECT id FROM users WHERE username = ?", args: [u.username] });
    if (existing.rows.length > 0) {
      userIds[u.username] = Number(existing.rows[0].id);
    } else {
      userIds[u.username] = await createUser(u.username, u.display_name, u.pin);
    }
  }

  // Candidatos
  const candidatesData = [
    { name: "Clint Eastwood", age: 96, cat: "Cine", wiki: "https://es.wikipedia.org/wiki/Clint_Eastwood" },
    { name: "Noam Chomsky", age: 97, cat: "Pensamiento", wiki: "https://es.wikipedia.org/wiki/Noam_Chomsky" },
    { name: "Ozzy Osbourne", age: 77, cat: "Música", wiki: "https://es.wikipedia.org/wiki/Ozzy_Osbourne" },
    { name: "Brigitte Bardot", age: 92, cat: "Cine", wiki: "https://es.wikipedia.org/wiki/Brigitte_Bardot" },
    { name: "Juan Carlos I", age: 88, cat: "Realeza", wiki: "https://es.wikipedia.org/wiki/Juan_Carlos_I_de_Espa%C3%B1a" },
    { name: "Gene Hackman", age: 96, cat: "Cine", wiki: "https://es.wikipedia.org/wiki/Gene_Hackman" },
    { name: "Willie Nelson", age: 93, cat: "Música", wiki: "https://es.wikipedia.org/wiki/Willie_Nelson" },
    { name: "Joe Biden", age: 83, cat: "Política", wiki: "https://es.wikipedia.org/wiki/Joe_Biden" },
    { name: "Keith Richards", age: 82, cat: "Música", wiki: "https://es.wikipedia.org/wiki/Keith_Richards" },
    { name: "Rupert Murdoch", age: 95, cat: "Empresa", wiki: "https://en.wikipedia.org/wiki/Rupert_Murdoch" },
    { name: "Bob Newhart", age: 97, cat: "Comedia", wiki: "https://en.wikipedia.org/wiki/Bob_Newhart" },
    { name: "Dick Van Dyke", age: 100, cat: "Cine", wiki: "https://es.wikipedia.org/wiki/Dick_Van_Dyke" },
    { name: "Sofía Loren", age: 92, cat: "Cine", wiki: "https://es.wikipedia.org/wiki/Sof%C3%ADa_Loren" },
    { name: "Mick Jagger", age: 83, cat: "Música", wiki: "https://es.wikipedia.org/wiki/Mick_Jagger" },
    { name: "Al Pacino", age: 86, cat: "Cine", wiki: "https://es.wikipedia.org/wiki/Al_Pacino" },
    { name: "Charlie Sheen", age: 61, cat: "Cine", wiki: "https://es.wikipedia.org/wiki/Charlie_Sheen" },
    { name: "Bam Margera", age: 47, cat: "Entretenimiento", wiki: "https://es.wikipedia.org/wiki/Bam_Margera" },
    { name: "Kanye West", age: 49, cat: "Música", wiki: "https://es.wikipedia.org/wiki/Kanye_West" },
  ];

  const candIds: Record<string, number> = {};
  for (const c of candidatesData) {
    candIds[c.name] = await searchOrCreateCandidate(c.name, c.age, c.cat, c.wiki);
  }

  // Apuestas
  const picks: Record<string, [string, boolean][]> = {
    jorge: [
      ["Dick Van Dyke", true],
      ["Ozzy Osbourne", false],
      ["Clint Eastwood", false],
      ["Juan Carlos I", false],
      ["Bam Margera", false],
      ["Mick Jagger", false],
      ["Rupert Murdoch", false],
    ],
    carlos: [
      ["Clint Eastwood", true],
      ["Ozzy Osbourne", false],
      ["Gene Hackman", false],
      ["Joe Biden", false],
      ["Keith Richards", false],
      ["Al Pacino", false],
    ],
    lucia: [
      ["Noam Chomsky", true],
      ["Brigitte Bardot", false],
      ["Willie Nelson", false],
      ["Juan Carlos I", false],
      ["Charlie Sheen", false],
      ["Sofía Loren", false],
    ],
    marcos: [
      ["Gene Hackman", true],
      ["Noam Chomsky", false],
      ["Keith Richards", false],
      ["Ozzy Osbourne", false],
      ["Bob Newhart", false],
      ["Dick Van Dyke", false],
      ["Kanye West", false],
    ],
    elena: [
      ["Willie Nelson", true],
      ["Brigitte Bardot", false],
      ["Joe Biden", false],
      ["Clint Eastwood", false],
      ["Bam Margera", false],
      ["Rupert Murdoch", false],
    ],
  };

  for (const [uname, userPicks] of Object.entries(picks)) {
    const uid = userIds[uname];
    const existing = await getUserBets(uid, eid);
    const existingCids = new Set(existing.map((b) => b.candidate_id));

    for (const [cname, isCap] of userPicks) {
      const cid = candIds[cname];
      if (!existingCids.has(cid)) {
        await placeBet(eid, uid, cid, isCap);
      }
    }
  }

  // Defunciones de demostración
  await recordDeath(candIds["Dick Van Dyke"], "2026-02-03", 100, "Causas naturales");
  await recordDeath(candIds["Ozzy Osbourne"], "2026-05-19", 77, "Complicaciones de salud");
  await recordDeath(candIds["Bob Newhart"], "2026-08-14", 97, "Fallecimiento natural");

  await recalculateEditionPoints(eid);
}
