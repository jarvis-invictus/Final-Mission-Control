"use client";

import { usePathname } from "next/navigation";
import CommandSearch from "./CommandSearch";

export default function CommandSearchWrapper() {
  const pathname = usePathname();
  // Don't show search on login page
  if (pathname === "/login") return null;
  return <CommandSearch />;
}
