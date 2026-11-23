import { NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { display_name, pin } = body;

    if (!display_name || !display_name.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const cleanName = display_name.trim();
    const cleanUsername = cleanName.toLowerCase().replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cleanPin = pin && pin.trim().length === 4 ? pin.trim() : "1234";

    const userId = await createUser(cleanUsername, cleanName, cleanPin);
    return NextResponse.json({ success: true, user_id: userId, display_name: cleanName });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "Ya existe un participante con ese nombre" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
