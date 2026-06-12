"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type ExportStatus = "idle" | "loading" | "success" | "error";
type DeleteStatus = "idle" | "loading" | "error";

export default function DataActions() {
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportError, setExportError] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>("idle");
  const [deleteError, setDeleteError] = useState("");

  async function handleExport() {
    if (exportStatus === "loading") return;
    setExportStatus("loading");
    setExportError("");
    const res = await fetch("/api/export", { method: "POST" });
    if (res.ok) {
      setExportStatus("success");
    } else {
      const json = await res.json().catch(() => ({}));
      setExportError(
        (json as { error?: { message?: string } })?.error?.message ??
          "Something went wrong. Please try again."
      );
      setExportStatus("error");
    }
  }

  async function handleDelete() {
    if (deleteStatus === "loading") return;
    setDeleteStatus("loading");
    setDeleteError("");
    const res = await fetch("/api/profile", { method: "DELETE" });
    if (res.ok) {
      window.location.href = "/sign-in?message=account_deleted";
    } else {
      setDeleteStatus("error");
      setDeleteError("Something went wrong. Please try again.");
      setShowConfirmDialog(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Export section */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Export your data</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Request a full copy of all the data LifePilot holds about you.
          We&apos;ll email you a download link within a few minutes.
        </p>
        {exportStatus === "success" ? (
          <CoachVoiceLine variant="closing">
            Your export is being prepared — you&apos;ll receive an email when it&apos;s ready.
          </CoachVoiceLine>
        ) : (
          <>
            {exportStatus === "error" && (
              <div
                role="alert"
                className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4"
              >
                {exportError}
              </div>
            )}
            <Button onClick={handleExport} disabled={exportStatus === "loading"}>
              {exportStatus === "loading" ? "Requesting…" : "Request data export"}
            </Button>
          </>
        )}
      </div>

      <hr className="border-border" />

      {/* Delete section */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Delete your account</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        {deleteStatus === "error" && (
          <div
            role="alert"
            className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4"
          >
            {deleteError}
          </div>
        )}
        <Button variant="destructive" onClick={() => setShowConfirmDialog(true)}>
          Delete my account
        </Button>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogHeader>
          <DialogTitle>Delete your account</DialogTitle>
          <DialogDescription>
            This will permanently delete your account and all associated data — briefings,
            check-ins, goals, and profile. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="default"
            onClick={() => setShowConfirmDialog(false)}
            disabled={deleteStatus === "loading"}
          >
            Keep my account
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteStatus === "loading"}
          >
            {deleteStatus === "loading" ? "Deleting…" : "Delete my account permanently"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
