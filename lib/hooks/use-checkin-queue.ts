"use client";

import { useEffect, useCallback, useState } from "react";
import { type CheckinInput } from "@/lib/validation/checkin";

const QUEUE_KEY = "lifepilot_checkin_queue";
const MAX_RETRIES = 3;

interface QueuedCheckin extends CheckinInput {
  checked_in_at: string;
  localId: string;
}

function readQueue(): QueuedCheckin[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedCheckin[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

async function postCheckin(item: QueuedCheckin): Promise<boolean> {
  const res = await fetch("/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  // 422 = stale — discard silently
  if (res.status === 422) return true;
  return res.ok;
}

let _isDraining = false;

async function drainQueue(): Promise<void> {
  if (_isDraining) return;
  _isDraining = true;
  try {
    let queue = readQueue();
    if (queue.length === 0) return;

    for (const item of [...queue]) {
      let success = false;
      let delay = 2000;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          success = await postCheckin(item);
          if (success) break;
        } catch {
          // network error — retry
        }
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
        }
      }

      if (success) {
        queue = queue.filter((q) => q.localId !== item.localId);
        writeQueue(queue);
      }
    }
  } finally {
    _isDraining = false;
  }
}

export type SyncStatus = "idle" | "syncing" | "synced" | "failed";

export function useCheckinQueue() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  // Initialise from localStorage synchronously — avoids calling setState inside an effect
  const [pendingCount, setPendingCount] = useState(() => readQueue().length);

  const refreshCount = useCallback(() => {
    setPendingCount(readQueue().length);
  }, []);

  const enqueue = useCallback((item: Omit<QueuedCheckin, "checked_in_at" | "localId">) => {
    const entry: QueuedCheckin = {
      ...item,
      checked_in_at: new Date().toISOString(),
      localId: crypto.randomUUID(),
    };
    writeQueue([...readQueue(), entry]);
    refreshCount();
  }, [refreshCount]);

  const sync = useCallback(async () => {
    if (readQueue().length === 0) return;
    setSyncStatus("syncing");
    try {
      await drainQueue();
      const remaining = readQueue().length;
      setSyncStatus(remaining === 0 ? "synced" : "failed");
      refreshCount();
      if (remaining === 0) setTimeout(() => setSyncStatus("idle"), 2000);
    } catch {
      setSyncStatus("failed");
    }
  }, [refreshCount]);

  // Auto-sync on reconnect
  useEffect(() => {
    const handleOnline = () => { void sync(); };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [sync]);

  const hasPending = useCallback((): boolean => readQueue().length > 0, []);

  const peekOldest = useCallback((): QueuedCheckin | null => {
    const q = readQueue();
    return q.length > 0 ? q[0] : null;
  }, []);

  const discardOldest = useCallback(() => {
    writeQueue(readQueue().slice(1));
    refreshCount();
  }, [refreshCount]);

  return { enqueue, sync, syncStatus, pendingCount, hasPending, peekOldest, discardOldest };
}
