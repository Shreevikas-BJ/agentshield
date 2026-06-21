"use client";

import { useState } from "react";
import { BookmarkCheck, Check, HelpCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ReviewDecision = "agree" | "disagree" | "needs_further_review";

type ResultReviewActionsProps = {
  resultId: string;
  initialDecision?: ReviewDecision;
  initialNotes?: string;
  regressionSaved: boolean;
};

export function ResultReviewActions({
  resultId,
  initialDecision,
  initialNotes = "",
  regressionSaved,
}: ResultReviewActionsProps) {
  const [decision, setDecision] = useState<ReviewDecision | undefined>(initialDecision);
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(regressionSaved);
  const [busy, setBusy] = useState<"review" | "regression" | null>(null);
  const [message, setMessage] = useState<string>();

  async function saveReview() {
    if (!decision) {
      setMessage("Choose a review decision first.");
      return;
    }
    setBusy("review");
    setMessage(undefined);
    try {
      const response = await fetch(`/api/results/${resultId}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes }),
      });
      if (!response.ok) throw new Error("Unable to save review.");
      setMessage("Review saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save review.");
    } finally {
      setBusy(null);
    }
  }

  async function saveRegression() {
    setBusy("regression");
    setMessage(undefined);
    try {
      const response = await fetch(`/api/results/${resultId}/regression`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save regression test.");
      setSaved(true);
      setMessage("Saved to the regression suite.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save regression test.");
    } finally {
      setBusy(null);
    }
  }

  const options: Array<{ value: ReviewDecision; label: string; icon: React.ReactNode }> = [
    { value: "agree", label: "Agree", icon: <Check /> },
    { value: "disagree", label: "Disagree", icon: <X /> },
    { value: "needs_further_review", label: "Review", icon: <HelpCircle /> },
  ];

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={decision === option.value ? "default" : "outline"}
            onClick={() => setDecision(option.value)}
          >
            {option.icon}
            {option.label}
          </Button>
        ))}
      </div>
      <Textarea
        aria-label="Reviewer notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={3}
        placeholder="Reviewer notes"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={saveReview} disabled={busy !== null}>Save review</Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={saveRegression}
          disabled={saved || busy !== null}
        >
          <BookmarkCheck className="size-4" />
          {saved ? "Regression saved" : "Save as regression test"}
        </Button>
      </div>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
