import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import ScreenerView from "@/components/screener/ScreenerView";

export default async function ScreenerPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-6">Stock Screener</h1>
        <ScreenerView />
      </main>
    </>
  );
}
