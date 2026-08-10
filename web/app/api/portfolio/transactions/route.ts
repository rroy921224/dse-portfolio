import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB, Transaction } from "../../../../../shared/index.js";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim().toUpperCase();

  const filter: Record<string, unknown> = { userId: session.user.id };
  if (code) filter.tradingCode = code;

  const transactions = await Transaction.find(filter)
    .sort({ date: -1 }) // most recent first
    .lean();

  return NextResponse.json({ ok: true, transactions });
}
