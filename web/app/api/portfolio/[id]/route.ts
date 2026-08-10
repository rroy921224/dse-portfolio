import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB, Transaction } from "../../../../../shared/index.js";

const updateSchema = z.object({
  quantity: z.number().positive().optional(),
  price: z.number().nonnegative().optional(),
  commissionPercent: z.number().min(0).max(5).optional(),
  date: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.errors[0]?.message ?? "Invalid input",
        },
        { status: 400 },
      );
    }

    await connectDB();

    const existing = await Transaction.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Transaction not found" },
        { status: 404 },
      );
    }

    // NOTE: this does not re-validate that editing an old BUY still leaves
    // enough quantity for any SELLs that happened after it — an edge case
    // worth handling later (e.g. re-run computeHoldings across all of this
    // stock's transactions after the edit, reject if any point goes negative).
    if (parsed.data.quantity !== undefined)
      existing.quantity = parsed.data.quantity;
    if (parsed.data.price !== undefined) existing.price = parsed.data.price;
    if (parsed.data.commissionPercent !== undefined)
      existing.commissionPercent = parsed.data.commissionPercent;
    if (parsed.data.notes !== undefined) existing.notes = parsed.data.notes;
    if (parsed.data.date) existing.date = new Date(parsed.data.date);

    await existing.save();

    return NextResponse.json({ ok: true, transaction: existing });
  } catch (err) {
    console.error("PUT /api/portfolio/[id] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update transaction." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;

  await connectDB();

  const existing = await Transaction.findOne({
    _id: id,
    userId: session.user.id,
  });
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Transaction not found" },
      { status: 404 },
    );
  }

  await Transaction.deleteOne({ _id: id });

  return NextResponse.json({ ok: true });
}
