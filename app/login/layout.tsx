import { AppShell } from "@/ui/ux/AppShell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AppShell><main className="auth-wrap">{children}</main></AppShell>;
}
