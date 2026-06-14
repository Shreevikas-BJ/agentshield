"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = ComponentProps<typeof Button> & {
  pendingText: string;
};

export function SubmitButton({ children, pendingText, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" aria-disabled={pending} disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
