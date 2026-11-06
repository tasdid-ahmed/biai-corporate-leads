"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Sparkles } from "lucide-react";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="bg-slate-900 text-slate-200 md:min-h-screen md:w-60 md:shrink-0">
      <div className="px-5 py-4 md:py-6">
        <p className="text-sm font-semibold tracking-wide text-white">BIAI Sales Intelligence</p>
        <p className="text-xs text-slate-400">Corporate leads pipeline</p>
      </div>
      <nav className="flex gap-1 px-3 pb-3 md:flex-col md:pb-0">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}