import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function DatabaseError({ message }: { message?: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>Database connection needed</AlertTitle>
      <AlertDescription>
        Set `DATABASE_URL` and `DIRECT_URL`, run Prisma migrations and seed data, then refresh.
        {message ? ` Details: ${message}` : ""}
      </AlertDescription>
    </Alert>
  );
}
