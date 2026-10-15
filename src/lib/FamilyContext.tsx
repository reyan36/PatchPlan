"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

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

    const profileRef = doc(db, "user_profiles", user.uid);
    const unsubProfile = onSnapshot(profileRef, (snap) => {
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

    return () => unsubProfile();
  }, [user]);

  // Listen to active family
  useEffect(() => {
    if (userProfile?.activeFamilyId) {
      const familyRef = doc(db, "families", userProfile.activeFamilyId);
      const unsubFamily = onSnapshot(familyRef, (snap) => {
        if (snap.exists()) {
          setActiveFamily({ id: snap.id, ...snap.data() } as Family);
        } else {
          setActiveFamily(null);
        }
        setLoading(false);
      }, (error) => {
        console.warn("Family listener error:", error.message);
        setLoading(false);
      });
      return () => unsubFamily();
    } else {
      setActiveFamily(null);
      if (userProfile !== null) {
        setLoading(false);
      }
    }
  }, [userProfile?.activeFamilyId]);

  const setActiveFamilyId = async (id: string | null) => {
    if (!user) return;
    await updateDoc(doc(db, "user_profiles", user.uid), { activeFamilyId: id });
  };

  return (
    <FamilyContext.Provider value={{ activeFamily, userProfile, loading, setActiveFamilyId }}>
      {children}
    </FamilyContext.Provider>
  );
}

export const useFamily = () => useContext(FamilyContext);
