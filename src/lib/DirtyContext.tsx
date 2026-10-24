"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import { isUpdateReady, setPageDirty } from "@/lib/version";

type DirtyContextType = {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  handleNavigation: (path: string) => void;
};

const DirtyContext = createContext<DirtyContextType>({
  isDirty: false,
  setIsDirty: () => {},
  handleNavigation: () => {},
});

export function DirtyProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const router = useRouter();

  // Read by the unload guard; a ref so "Discard changes" takes effect before a full-page navigation.
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = isDirty;
    // The update checker never reloads automatically while there are unsaved changes.
    setPageDirty(isDirty);
  }, [isDirty]);

  // Browser-level guard for hard refreshes and tab closing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome to show prompt
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // After a new deploy, the next page change loads fresh so the newer version is picked up quietly.
  const go = (path: string) => {
    if (isUpdateReady()) window.location.assign(path);
    else router.push(path);
  };

  const handleNavigation = (path: string) => {
    if (isDirty) {
      setPendingPath(path);
    } else {
      go(path);
    }
  };

  const confirmNavigation = () => {
    setIsDirty(false);
    dirtyRef.current = false;
    setPageDirty(false);
    if (pendingPath) {
      go(pendingPath);
      setPendingPath(null);
    }
  };

  const cancelNavigation = () => {
    setPendingPath(null);
  };

  return (
    <DirtyContext.Provider value={{ isDirty, setIsDirty, handleNavigation }}>
      {children}
      <Modal isOpen={!!pendingPath} onClose={cancelNavigation} title="Unsaved Changes">
        <p className="text-muted-foreground mb-6">
          You have unsaved changes in your workspace. Are you sure you want to discard them and leave?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={cancelNavigation}
            className="px-4 py-2 text-sm font-medium hover:text-muted-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmNavigation}
            className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950/30 rounded-md transition-colors border border-transparent hover:border-red-900"
          >
            Discard Changes
          </button>
        </div>
      </Modal>
    </DirtyContext.Provider>
  );
}

export const useDirty = () => useContext(DirtyContext);
