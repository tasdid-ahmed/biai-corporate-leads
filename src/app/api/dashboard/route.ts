import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/leadService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getDashboardData());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}