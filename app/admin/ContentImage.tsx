"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { safeUrl } from "../public-content";

export function ContentImage({ value, label, disabled = false, onChange, onUploading }: { value: string; label: string; disabled?: boolean; onChange: (url: string) => void; onUploading: (busy: boolean) => void }) {
  const inFlight = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  async function upload(file?: File) {
    if (!file || disabled || inFlight.current) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Choose a JPG, PNG or WebP image up to 5 MB."); return; }
    inFlight.current = true;
    setUploading(true); onUploading(true);
    try {
      const form = new FormData(); form.set("image", file);
      const response = await fetch("/api/admin/images", { method: "POST", body: form });
      const result = await response.json() as { url: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Upload failed");
      onChange(result.url);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed. Please try again."); }
    finally { inFlight.current = false; setUploading(false); onUploading(false); }
  }
  return <div className="content-image-upload"><div className={`image-drop-zone${dragging ? " is-dragging" : ""}`} role="group" aria-label={`Upload ${label} image`} aria-busy={uploading}
    onDragOver={event => { event.preventDefault(); if (!disabled && !uploading) {event.dataTransfer.dropEffect = "copy"; setDragging(true);} }}
    onDragLeave={event => {if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);}}
    onDrop={event => {event.preventDefault();setDragging(false);if(disabled || uploading) return;if(event.dataTransfer.files.length !== 1){setError("Drop one image at a time.");return;}void upload(event.dataTransfer.files[0]);}}>
    <strong>Drag and drop your {label} image here</strong><span>or choose a file from your device</span><label>Upload {label} image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || uploading} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label></div><small>JPG, PNG or WebP · up to 5 MB. Save the record as Published to show it on the website.</small>{uploading && <p role="status">Uploading image…</p>}{error && <p role="alert" className="console-error">{error}</p>}{safeUrl(value) && <><Image unoptimized src={safeUrl(value)!} alt={`${label} image preview`} width={480} height={280} style={{ width: "100%", maxHeight: 240, objectFit: "contain" }} /><button type="button" disabled={disabled || uploading} onClick={() => onChange("")}>Remove image</button></>}<label>Image URL (or upload above)<input value={value} maxLength={5000} disabled={disabled || uploading} onChange={event => onChange(event.target.value)} /></label></div>;
}
