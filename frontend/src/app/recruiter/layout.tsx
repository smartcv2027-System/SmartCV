import { RoleGuard } from "@/components/RoleGuard";

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["recruiter", "admin"]}>{children}</RoleGuard>;
}
