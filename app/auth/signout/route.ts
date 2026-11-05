import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// Plain form POST (not a server action) so sign-out keeps working right after a new deploy.
export async function POST(req: Request) {
  await (await supabaseServer()).auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
