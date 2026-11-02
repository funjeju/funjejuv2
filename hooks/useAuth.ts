"use client";

import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";

// Firebase 설정이 비어 있으면(로컬 .env 등) getAuth 가 throw 해서 페이지 전체가 죽는다 → 비로그인으로 진행
const FIREBASE_CONFIGURED = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(FIREBASE_CONFIGURED);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) return;
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);

      // 로그인 시 users 컬렉션에 프로필 자동 생성/업데이트
      if (u) {
        try {
          const db = getFirebaseDb();
          const userRef = doc(db, "users", u.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            // 첫 로그인 → 프로필 생성
            await setDoc(userRef, {
              displayName: u.displayName ?? u.email?.split("@")[0] ?? "여행자",
              email: u.email,
              photoURL: u.photoURL,
              isBusiness: false,
              createdAt: serverTimestamp(),
              lastSeenAt: serverTimestamp(),
            });
          } else {
            // 이름/사진 변경됐을 수도 → 머지 업데이트
            await setDoc(
              userRef,
              {
                displayName: u.displayName ?? snap.data().displayName,
                photoURL: u.photoURL ?? snap.data().photoURL,
                email: u.email ?? snap.data().email,
                lastSeenAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
        } catch {
          // 프로필 생성 실패해도 로그인은 계속
        }
      }
    });
    return unsub;
  }, []);

  async function signInWithGoogle() {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function logout() {
    const auth = getFirebaseAuth();
    await signOut(auth);
  }

  return { user, loading, signInWithGoogle, logout };
}
