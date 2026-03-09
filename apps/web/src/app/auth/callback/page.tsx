"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Dang xac minh magic link...");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setStatus("Khong tim thay token trong URL.");
      return;
    }

    async function verifyMagicLink() {
      try {
        const response = await fetch(`${API_URL}/auth/verify-magic-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = (await response.json()) as {
          email?: string;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.message ?? "Magic link khong hop le.");
        }

        setStatus(`Dang nhap thanh cong: ${data.email ?? "PTIT user"}`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Xac minh that bai.");
      }
    }

    void verifyMagicLink();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center p-6">
      <section className="w-full rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-8 text-center shadow-[0_18px_70px_rgba(21,34,56,0.08)]">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">PTIT Date</h1>
        <p className="mt-4 text-sm text-[#2d3f59]">{status}</p>
      </section>
    </main>
  );
}
