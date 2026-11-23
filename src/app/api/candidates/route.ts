import { NextResponse } from "next/server";
import { searchOrCreateCandidate, listCandidates } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const candidates = await listCandidates();
    return NextResponse.json({ candidates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, estimated_age, category, wikipedia_url, notes } = body;

    if (!full_name || !estimated_age) {
      return NextResponse.json({ error: "Nombre y edad estimada son obligatorios" }, { status: 400 });
    }

    const candidateId = await searchOrCreateCandidate(
      String(full_name),
      Number(estimated_age),
      String(category || "General"),
      wikipedia_url ? String(wikipedia_url) : undefined,
      notes ? String(notes) : undefined
    );

    return NextResponse.json({ success: true, candidate_id: candidateId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
