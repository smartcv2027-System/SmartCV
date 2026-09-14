import { RoleGuard } from "@/components/RoleGuard";

export default function ApplicantLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={["applicant", "admin"]}>{children}</RoleGuard>;
}
