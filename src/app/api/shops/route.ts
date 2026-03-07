import { NextResponse } from "next/server";
import { getPublishedShops } from "@/lib/queries";

export async function GET() {
  try {
    const shops = await getPublishedShops();
    return NextResponse.json({ shops });
  } catch {
    return NextResponse.json({ shops: [] }, { status: 500 });
  }
}
