"use client";
import { useEffect, useRef } from "react";
import { PublicForm, type SubmissionKind } from "./PublicForm";
export function ContactDialog({ kind, onClose }: { kind: SubmissionKind | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const current = dialog.current;
    if (kind && current && !current.open) current.showModal();
    if (!kind && current?.open) current.close();
  }, [kind]);
  return <dialog ref={dialog} className="site-contact-dialog" onClose={onClose} aria-label={kind === "rfq" ? "Request a quotation" : kind === "newsletter" ? "Newsletter subscription" : "Contact GUBA"}><button className="site-dialog-close" onClick={onClose} aria-label="Close form">×</button>{kind && <PublicForm key={kind} kind={kind} />}</dialog>;
}
