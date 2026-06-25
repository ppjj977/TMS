"use client";

import { capturePod } from "@/actions/bookings";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { SignaturePad } from "./signature-pad";

/** Proof-of-delivery capture: signer name, signature, optional notes. */
export function PodForm({ stopId, jobId }: { stopId: string; jobId: string }) {
  return (
    <form action={capturePod.bind(null, stopId, jobId)} className="space-y-3">
      <Field label="Received / signed by" required>
        <Input name="podName" required placeholder="Name of person signing" />
      </Field>
      <Field label="Signature">
        <SignaturePad name="podSignature" />
      </Field>
      <Field label="Notes">
        <Textarea name="podNotes" rows={2} placeholder="e.g. left with reception" />
      </Field>
      <Button type="submit" className="w-full justify-center">
        Capture POD &amp; complete stop
      </Button>
    </form>
  );
}
