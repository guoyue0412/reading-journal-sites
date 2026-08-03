import type { ReactNode } from "react";
import { ResearchShell } from "./research-shell";

export function SiteShell({ children }: { children: ReactNode }) {
  return <ResearchShell>{children}</ResearchShell>;
}
