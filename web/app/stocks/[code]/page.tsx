import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import StockDetailView from "@/components/stocks/StockDetailView";

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { code } = await params;

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto p-6">
        <StockDetailView tradingCode={code.toUpperCase()} />
      </main>
    </>
  );
}
