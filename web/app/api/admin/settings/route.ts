import { NextResponse } from "next/server";
import { getSiteSettings, updateSiteSetting } from "@/lib/db";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    await updateSiteSetting(key, value);
    const updated = await getSiteSettings();
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
