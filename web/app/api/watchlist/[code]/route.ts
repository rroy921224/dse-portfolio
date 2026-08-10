import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB, Watchlist } from "../../../../../shared/index.js";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;
  const tradingCode = code.toUpperCase();

  await connectDB();
  await Watchlist.deleteOne({ userId: session.user.id, tradingCode });

  return NextResponse.json({ ok: true });
}
