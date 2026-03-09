"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function DiscoveryPage() {
  const [status, setStatus] = useState("Dang kiem tra profile...");
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const currentEmail = localStorage.getItem("ptitdate_email") ?? "";
    setEmail(currentEmail);

    if (!currentEmail) {
      setStatus("Ban chua dang nhap. Quay ve trang chu de login.");
      return;
    }

    async function checkCompletion() {
      try {
        const response = await fetch(
          `${API_URL}/profiles?email=${encodeURIComponent(currentEmail)}`,
        );

        const data = (await response.json()) as {
          completion?: { isComplete: boolean };
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.message ?? "Khong kiem tra duoc profile.");
        }

        if (data.completion?.isComplete) {
          setAllowed(true);
          setStatus("Profile da hoan thien. Discovery san sang.");
          return;
        }

        setAllowed(false);
        setStatus("Ban can hoan thien profile truoc khi vao discovery.");
      } catch (error) {
        setAllowed(false);
        setStatus(error instanceof Error ? error.message : "Da co loi xay ra");
      }
    }

    void checkCompletion();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 p-6">
      <section className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a8694e]">
          Discovery Gate
        </p>
        <h1 className="mt-2 text-3xl font-bold">Discovery</h1>
        <p className="mt-3 text-sm text-[#2d3f59]">{status}</p>
      </section>

      {allowed ? (
        <section className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6">
          <p className="text-sm">Welcome to discovery feed (placeholder Sprint 3).</p>
        </section>
      ) : (
        <section className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6">
          <Link
            href={email ? `/onboarding?email=${encodeURIComponent(email)}` : "/"}
            className="inline-flex rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
          >
            Di toi onboarding
          </Link>
        </section>
      )}
    </main>
  );
}
