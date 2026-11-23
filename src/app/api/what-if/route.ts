import { NextResponse } from "next/server";
import { getActiveEdition, simulateDeathImpact } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { candidate_id, simulated_age } = body;

    if (!candidate_id) {
      return NextResponse.json({ error: "candidate_id es requerido" }, { status: 400 });
    }

    const edition = await getActiveEdition();
    const result = await simulateDeathImpact(
      edition.id,
      Number(candidate_id),
      simulated_age ? Number(simulated_age) : undefined
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
