import { NextResponse } from "next/server";
import {
  getActiveEdition,
  getUserBets,
  getAvailableCandidatesForUser,
  authenticateUser,
  placeBet,
  deleteBet,
  setCaptain,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get("user_id"));
    if (!userId) {
      return NextResponse.json({ error: "user_id es requerido" }, { status: 400 });
    }

    const edition = await getActiveEdition();
    const bets = await getUserBets(userId, edition.id);
    const available = await getAvailableCandidatesForUser(edition.id, userId);

    return NextResponse.json({ bets, available, edition });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, pin, candidate_id, is_captain } = body;

    const user = await authenticateUser(Number(user_id), String(pin));
    if (!user) {
      return NextResponse.json({ error: "PIN incorrecto o usuario no válido" }, { status: 401 });
    }

    const edition = await getActiveEdition();
    if (edition.is_active === 0) {
      return NextResponse.json({ error: "Las apuestas están cerradas para esta edición" }, { status: 403 });
    }

    if (edition.lock_date) {
      const lockDate = new Date(edition.lock_date);
      if (new Date() > lockDate) {
        return NextResponse.json({ error: "La fecha límite de apuestas ha expirado" }, { status: 403 });
      }
    }

    const currentBets = await getUserBets(user.id, edition.id);
    if (currentBets.length >= edition.max_bets_per_user) {
      return NextResponse.json({ error: `Límite alcanzado (${edition.max_bets_per_user} candidatos)` }, { status: 400 });
    }

    const betId = await placeBet(edition.id, user.id, Number(candidate_id), Boolean(is_captain));
    return NextResponse.json({ success: true, bet_id: betId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { user_id, pin, bet_id } = body;

    const user = await authenticateUser(Number(user_id), String(pin));
    if (!user) {
      return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
    }

    const edition = await getActiveEdition();
    if (edition.is_active === 0) {
      return NextResponse.json({ error: "Las apuestas están bloqueadas en modo solo lectura" }, { status: 403 });
    }

    await deleteBet(Number(bet_id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { user_id, pin, bet_id } = body;

    const user = await authenticateUser(Number(user_id), String(pin));
    if (!user) {
      return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
    }

    const edition = await getActiveEdition();
    if (edition.is_active === 0) {
      return NextResponse.json({ error: "Las apuestas están bloqueadas" }, { status: 403 });
    }

    await setCaptain(Number(bet_id), user.id, edition.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
