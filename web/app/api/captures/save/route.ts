import { NextResponse } from "next/server"
import { saveCapture } from "@/lib/captures/save"
export async function POST(request: Request) {
  try { return NextResponse.json(await saveCapture(await request.json())) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "The capture could not be saved." }, { status: 400 }) }
}
