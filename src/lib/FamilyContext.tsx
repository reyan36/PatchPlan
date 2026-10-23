"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

// Firestore is only needed once someone is signed in, so it's loaded on demand.
// Public visitors (landing, changelog, status, public pages) never download it.
const loadFirestore = () => import("./lazyFirestore");

export type Member = {
  uid: string;
  nickname: string;
  role: "owner" | "worker";
  email: string
};

export type Family = {
  id: string;
  name: string;
  ownerId: string;
  joinCode: string;
  members: Member[]
};

export type UserProfile = {
  uid: string;
  activeFamilyId: string | null;
  joinedFamilies: string[]
};

interface FamilyContextType {
  activeFamily: Family | null;
  userProfile: UserProfile | null;
  loading: boolean;
  setActiveFamilyId: (id: string | null) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType>({} as any);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to user profile
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setActiveFamily(null);
      setLoading(false);
      return;
    }

    // Signing in: wait for the profile so pages don't briefly load the personal workspace.
    setLoading(true);
    let unsubProfile = () => {};
    let cancelled = false;
    loadFirestore()
      .then(({ db, doc, onSnapshot, setDoc }) => {
        if (cancelled) return;
        const profileRef = doc(db, "user_profiles", user.uid);
        unsubProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          } else {
            // Initialize new user profile
            const newProfile: UserProfile = {
              uid: user.uid,
              activeFamilyId: null,
              joinedFamilies: []
            };
            setDoc(profileRef, newProfile);
            setUserProfile(newProfile);
          }
        }, (error) => {
          console.warn("UserProfile listener error:", error.message);
          setLoading(false);
        });
      })
      .catch(() => setLoading(false));

    return () => {
      cancelled = true;
      unsubProfile();
    };
  }, [user]);

  // Listen to active family
  useEffect(() => {
    if (userProfile?.activeFamilyId) {
      const familyId = userProfile.activeFamilyId;
      let unsubFamily = () => {};
      let cancelled = false;
      loadFirestore()
        .then(({ db, doc, onSnapshot }) => {
          if (cancelled) return;
          unsubFamily = onSnapshot(doc(db, "families", familyId), (snap) => {
            if (snap.exists()) {
              setActiveFamily({ id: snap.id, ...snap.data() } as Family);
            } else {
              setActiveFamily(null);
            }
            setLoading(false);
          }, (error) => {
            // e.g. removed from the studio: fall back to the personal workspace.
            console.warn("Family listener error:", error.message);
            setActiveFamily(null);
            setLoading(false);
          });
        })
        .catch(() => setLoading(false));
      return () => {
        cancelled = true;
        unsubFamily();
      };
    } else {
      setActiveFamily(null);
      if (userProfile !== null) {
        setLoading(false);
      }
    }
  }, [userProfile?.activeFamilyId]);

  const setActiveFamilyId = async (id: string | null) => {
    if (!user) return;
    const { db, doc, updateDoc } = await loadFirestore();
    await updateDoc(doc(db, "user_profiles", user.uid), { activeFamilyId: id });
  };

  return (
    <FamilyContext.Provider value={{ activeFamily, userProfile, loading, setActiveFamilyId }}>
      {children}
    </FamilyContext.Provider>
  );
}

export const useFamily = () => useContext(FamilyContext);
