import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import PortfolioView from "@/components/portfolio/PortfolioView";

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-6">Portfolio</h1>
        <PortfolioView />
      </main>
    </>
  );
}
