"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ALLOWED_DOMAINS = ["@ptit.edu.vn", "@stu.ptit.edu.vn"];

type SessionResponse = {
  success: boolean;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [message, setMessage] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [devMagicLink, setDevMagicLink] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  async function post(path: string, body: Record<string, string>) {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const errorMessage =
        typeof data.message === "string" ? data.message : "Request failed";
      throw new Error(errorMessage);
    }

    return data;
  }

  function ensurePtitEmail() {
    const isAllowed = ALLOWED_DOMAINS.some((domain) =>
      normalizedEmail.endsWith(domain),
    );

    if (!isAllowed) {
      throw new Error("Chi ho tro @ptit.edu.vn hoac @stu.ptit.edu.vn");
    }
  }

  async function handleRequestOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("Dang gui OTP...");

    try {
      ensurePtitEmail();
      const data = await post("/auth/request-otp", { email: normalizedEmail });
      setDevOtp((data.developmentOtp as string | undefined) ?? null);
      setMessage("OTP da duoc gui. Kiem tra email PTIT cua ban.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gui OTP that bai");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("Dang xac minh OTP...");

    try {
      ensurePtitEmail();
      const data = (await post("/auth/verify-otp", {
        email: normalizedEmail,
        code: otpCode,
      })) as SessionResponse;
      setSession(data);
      localStorage.setItem("ptitdate_email", data.email);
      setMessage("Dang nhap thanh cong bang OTP.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Xac minh OTP that bai");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestMagicLink() {
    setLoading(true);
    setMessage("Dang tao magic link...");

    try {
      ensurePtitEmail();
      const data = await post("/auth/request-magic-link", {
        email: normalizedEmail,
      });
      setDevMagicLink((data.developmentMagicLink as string | undefined) ?? null);
      setMessage("Magic link da duoc gui vao email PTIT.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Tao magic link that bai",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshSession() {
    if (!session) {
      setMessage("Chua co session de refresh.");
      return;
    }

    setLoading(true);
    setMessage("Dang refresh session...");

    try {
      const data = (await post("/auth/refresh", {
        refreshToken: session.refreshToken,
      })) as SessionResponse;
      setSession(data);
      localStorage.setItem("ptitdate_email", data.email);
      setMessage("Refresh session thanh cong.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Refresh that bai");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (!session) {
      setMessage("Chua co session de logout.");
      return;
    }

    setLoading(true);
    setMessage("Dang logout...");

    try {
      await post("/auth/logout", { refreshToken: session.refreshToken });
      setSession(null);
      localStorage.removeItem("ptitdate_email");
      setMessage("Logout thanh cong.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Logout that bai");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-5 md:p-10">
      <section className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6 shadow-[0_18px_70px_rgba(21,34,56,0.08)] md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a8694e]">
          Sprint 1 - Auth Foundation
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)] md:text-5xl">
          PTIT Date Web
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-[#2d3f59] md:text-base">
          Dang nhap bang email PTIT voi OTP hoac magic link. Day la ban xay dung
          dau tien cua luong xac thuc cho MVP.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <form
          onSubmit={handleRequestOtp}
          className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6"
        >
          <h2 className="text-xl font-semibold">Yeu cau OTP</h2>
          <p className="mt-1 text-sm text-[#51617b]">
            Chi nhan @ptit.edu.vn hoac @stu.ptit.edu.vn
          </p>
          <input
            className="mt-4 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
            placeholder="mssv@stu.ptit.edu.vn"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-white disabled:opacity-60"
            type="submit"
          >
            Gui OTP
          </button>
        </form>

        <form
          onSubmit={handleVerifyOtp}
          className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6"
        >
          <h2 className="text-xl font-semibold">Xac minh OTP</h2>
          <p className="mt-1 text-sm text-[#51617b]">Nhap ma 6 chu so</p>
          <input
            className="mt-4 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
            placeholder="123456"
            maxLength={6}
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value)}
          />
          <button
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-[var(--foreground)] px-4 py-2 font-semibold text-white disabled:opacity-60"
            type="submit"
          >
            Dang nhap voi OTP
          </button>

          <button
            disabled={loading}
            type="button"
            onClick={handleRequestMagicLink}
            className="mt-3 w-full rounded-xl border border-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent)] disabled:opacity-60"
          >
            Gui magic link
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6 text-sm">
        <p>
          <strong>Status:</strong> {message}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefreshSession}
            disabled={loading || !session}
            className="rounded-lg border border-[var(--foreground)] px-3 py-1 font-semibold text-[var(--foreground)] disabled:opacity-50"
          >
            Refresh session
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading || !session}
            className="rounded-lg border border-[#b04b29] px-3 py-1 font-semibold text-[#b04b29] disabled:opacity-50"
          >
            Logout
          </button>
        </div>
        {devOtp ? (
          <p className="mt-2">
            <strong>Dev OTP:</strong> {devOtp}
          </p>
        ) : null}
        {devMagicLink ? (
          <p className="mt-2 break-all">
            <strong>Dev Magic Link:</strong> {devMagicLink}
          </p>
        ) : null}
        {session ? (
          <pre className="mt-3 overflow-auto rounded-xl bg-[#12223a] p-4 text-xs text-[#eef4ff]">
            {JSON.stringify(session, null, 2)}
          </pre>
        ) : null}
        {session ? (
          <div className="mt-3">
            <Link
              href={`/onboarding?email=${encodeURIComponent(session.email)}`}
              className="inline-flex rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
            >
              Tiep tuc sang onboarding profile
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
