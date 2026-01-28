import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET(request: Request) {
  // (opcional) protege o endpoint com um segredo simples
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 });
    }
  }

  const { data, error } = await supabase
    .from("scan_runs")
    .insert({
      items_coletados: 0,
      briefings_generated: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", data });
}