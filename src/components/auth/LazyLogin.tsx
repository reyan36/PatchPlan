"use client";

import dynamic from "next/dynamic";

// The sign-in card (and its animated grid) only matters to signed-out visitors, so signed-in
// pages never download it. Same props as ./Login.
export const Login = dynamic(() => import("./Login").then((m) => m.Login), {
  ssr: false,
  loading: () => <div className="w-full max-w-[880px] h-[540px] rounded-[22px] border border-white/[0.09] bg-[#111114]" aria-busy="true" aria-label="Loading sign-in" />,
});
