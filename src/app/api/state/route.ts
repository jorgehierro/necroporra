import { NextResponse } from "next/server";
import { getActiveEdition, getLeaderboard, getDeathsGrouped, listUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const edition = await getActiveEdition();
    const users = await listUsers();
    const leaderboard = await getLeaderboard(edition.id);
    const deaths = await getDeathsGrouped(edition.id);

    const totalBets = leaderboard.reduce((acc, u) => acc + (u.total_bets || 0), 0);
    const totalPoints = leaderboard.reduce((acc, u) => acc + (u.total_points || 0), 0);

    return NextResponse.json({
      edition,
      users,
      leaderboard,
      deaths,
      summary: {
        total_users: leaderboard.length,
        total_bets: totalBets,
        total_deaths: deaths.length,
        total_points: totalPoints,
      },
    });
  } catch (error: any) {
    console.error("API State Error:", error);
    return NextResponse.json({ error: error.message || "Error al cargar estado" }, { status: 500 });
  }
}
