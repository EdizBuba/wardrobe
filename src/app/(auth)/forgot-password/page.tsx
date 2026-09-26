import { Suspense } from "react";
import { AuthForm } from "@/modules/auth/presentation/auth-form";
export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="forgot" />
    </Suspense>
  );
}
