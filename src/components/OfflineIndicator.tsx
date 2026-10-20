import React from "react";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 sm:right-auto sm:left-4 z-50 flex items-center gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-950/90 px-4 py-2 text-xs font-semibold text-amber-200 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
      </span>
      <WifiOff className="h-4 w-4 text-amber-300 shrink-0" />
      <span>Mode Offline — Draf formulir tetap aman tersimpan di browser ini.</span>
    </div>
  );
};
