import { NextResponse } from "next/server";
import { recordDeath, deleteDeath, seedDemoData, client } from "@/lib/db";

export const dynamic = "force-dynamic";

// PIN de administración configurable por variable de entorno o por defecto '0000'
const ADMIN_PIN = process.env.ADMIN_PIN || "0000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { admin_pin, action } = body;

    if (String(admin_pin) !== ADMIN_PIN) {
      return NextResponse.json({ error: "PIN de administrador incorrecto" }, { status: 401 });
    }

    if (action === "record_death") {
      const { candidate_id, death_date, age_at_death, cause_or_source } = body;
      await recordDeath(Number(candidate_id), String(death_date), Number(age_at_death), cause_or_source);
      return NextResponse.json({ success: true, message: "Defunción registrada con éxito" });
    }

    if (action === "delete_death") {
      const { candidate_id } = body;
      await deleteDeath(Number(candidate_id));
      return NextResponse.json({ success: true, message: "Defunción anulada" });
    }

    if (action === "seed_demo") {
      await seedDemoData();
      return NextResponse.json({ success: true, message: "Datos de demostración cargados" });
    }

    if (action === "update_edition") {
      const { edition_id, lock_date, is_active, max_bets } = body;
      await client.execute({
        sql: `UPDATE editions 
              SET lock_date = ?,
                  is_active = ?,
                  max_bets_per_user = ?
              WHERE id = ?`,
        args: [lock_date || null, is_active ? 1 : 0, Number(max_bets || 10), Number(edition_id)],
      });
      return NextResponse.json({ success: true, message: "Edición actualizada" });
    }

    if (action === "reset_db") {
      await client.executeMultiple(`
        DELETE FROM deaths;
        DELETE FROM bets;
        DELETE FROM candidates;
        DELETE FROM users;
      `);
      return NextResponse.json({ success: true, message: "Base de datos restablecida" });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
