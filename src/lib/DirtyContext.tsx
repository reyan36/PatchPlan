"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";

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

  // Browser-level guard for hard refreshes and tab closing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome to show prompt
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleNavigation = (path: string) => {
    if (isDirty) {
      setPendingPath(path);
    } else {
      router.push(path);
    }
  };

  const confirmNavigation = () => {
    setIsDirty(false);
    if (pendingPath) {
      router.push(pendingPath);
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
