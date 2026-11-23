import { NextResponse } from "next/server";
import { getActiveEdition, getHeadToHead } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user1Id = Number(searchParams.get("user1_id"));
    const user2Id = Number(searchParams.get("user2_id"));

    if (!user1Id || !user2Id) {
      return NextResponse.json({ error: "user1_id y user2_id son requeridos" }, { status: 400 });
    }

    const edition = await getActiveEdition();
    const result = await getHeadToHead(edition.id, user1Id, user2Id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
