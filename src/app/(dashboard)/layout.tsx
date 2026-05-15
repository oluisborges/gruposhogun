import { requireAuth } from "@/lib/auth-guards";
import { Sidebar } from "@/components/layout/sidebar";
import type { Role } from "@prisma/client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="flex h-screen bg-[#0d1410] overflow-hidden">
      <Sidebar
        user={{
          id: session.user.id,
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          role: session.user.role as Role,
        }}
      />
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div
          className="h-16 border-b border-[#1f2a23] flex items-center px-7 sticky top-0 z-10 flex-shrink-0"
          style={{ background: "rgba(13,20,16,0.85)", backdropFilter: "blur(8px)" }}
        />
        <div className="p-6 flex-1">{children}</div>
      </main>
    </div>
  );
}
