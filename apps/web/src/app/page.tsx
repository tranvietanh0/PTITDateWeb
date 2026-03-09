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
      localStorage.setItem("ptitdate_access_token", data.accessToken);
      localStorage.setItem("ptitdate_refresh_token", data.refreshToken);
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
      localStorage.setItem("ptitdate_access_token", data.accessToken);
      localStorage.setItem("ptitdate_refresh_token", data.refreshToken);
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
      localStorage.removeItem("ptitdate_access_token");
      localStorage.removeItem("ptitdate_refresh_token");
      setMessage("Logout thanh cong.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Logout that bai");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-10 md:py-12">
      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="glass-panel fade-up relative overflow-hidden rounded-[30px] p-7 md:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[rgba(214,90,49,0.22)] blur-2xl" />
          <div className="pointer-events-none absolute -left-8 bottom-10 h-40 w-40 rounded-full bg-[rgba(46,122,127,0.15)] blur-2xl" />

          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--teal)]">
            PTIT Dating Web
          </p>
          <h1 className="mt-3 max-w-lg text-4xl font-bold leading-tight md:text-6xl">
            Match nhanh.
            <br />
            Chat that.
            <br />
            Dung chat PTIT.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-[var(--ink-soft)] md:text-base">
            Ban web duoc thiet ke theo luong Tinder/Bumble, toi uu mobile va desktop.
            Xac thuc email PTIT, quet profile, match va tro chuyen trong mot trai
            nghiem gon dep.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="float-card rounded-2xl border border-[rgba(31,36,51,0.09)] bg-white/70 px-4 py-3">
              <p className="text-xs text-[var(--ink-soft)]">Auth</p>
              <p className="mt-1 text-sm font-semibold">OTP + Magic link</p>
            </div>
            <div className="float-card rounded-2xl border border-[rgba(31,36,51,0.09)] bg-white/70 px-4 py-3 [animation-delay:180ms]">
              <p className="text-xs text-[var(--ink-soft)]">Onboarding</p>
              <p className="mt-1 text-sm font-semibold">Profile studio</p>
            </div>
            <div className="float-card rounded-2xl border border-[rgba(31,36,51,0.09)] bg-white/70 px-4 py-3 [animation-delay:320ms]">
              <p className="text-xs text-[var(--ink-soft)]">Discovery</p>
              <p className="mt-1 text-sm font-semibold">Swipe + match</p>
            </div>
          </div>
        </section>

        <section className="glass-panel fade-up rounded-[30px] p-6 md:p-8 [animation-delay:120ms]">
          <div className="rounded-2xl border border-[rgba(214,90,49,0.18)] bg-white/80 px-4 py-3 text-sm">
            <span className="font-semibold text-[var(--accent-strong)]">Status:</span>{" "}
            <span className="text-[var(--ink-soft)]">{message}</span>
          </div>

          <form onSubmit={handleRequestOtp} className="mt-5 rounded-2xl bg-white/75 p-4">
            <p className="text-sm font-semibold">Yeu cau OTP</p>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              @ptit.edu.vn hoac @stu.ptit.edu.vn
            </p>
            <input
              className="mt-3 w-full rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--ring)]"
              placeholder="mssv@stu.ptit.edu.vn"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button
              disabled={loading}
              className="mt-3 w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
              type="submit"
            >
              Gui OTP
            </button>
          </form>

          <form onSubmit={handleVerifyOtp} className="mt-4 rounded-2xl bg-white/75 p-4">
            <p className="text-sm font-semibold">Xac minh OTP</p>
            <input
              className="mt-3 w-full rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--ring)]"
              placeholder="123456"
              maxLength={6}
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                disabled={loading}
                className="rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                type="submit"
              >
                Dang nhap OTP
              </button>
              <button
                disabled={loading}
                type="button"
                onClick={handleRequestMagicLink}
                className="rounded-xl border border-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)] disabled:opacity-60"
              >
                Gui magic link
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefreshSession}
              disabled={loading || !session}
              className="rounded-lg border border-[rgba(31,36,51,0.2)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] disabled:opacity-50"
            >
              Refresh session
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading || !session}
              className="rounded-lg border border-[rgba(187,70,33,0.4)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)] disabled:opacity-50"
            >
              Logout
            </button>
          </div>

          {devOtp ? (
            <p className="mt-3 rounded-xl bg-[var(--surface)] px-3 py-2 text-xs">
              <strong>Dev OTP:</strong> {devOtp}
            </p>
          ) : null}
          {devMagicLink ? (
            <p className="mt-2 break-all rounded-xl bg-[var(--surface)] px-3 py-2 text-xs">
              <strong>Dev Link:</strong> {devMagicLink}
            </p>
          ) : null}

          {session ? (
            <div className="mt-4 rounded-2xl border border-[rgba(46,122,127,0.24)] bg-[rgba(46,122,127,0.09)] p-4 text-sm">
              <p className="font-semibold">Session san sang cho onboarding.</p>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">{session.email}</p>
              <Link
                href={`/onboarding?email=${encodeURIComponent(session.email)}`}
                className="mt-3 inline-flex rounded-lg bg-[var(--teal)] px-3 py-2 text-xs font-semibold text-white"
              >
                Tiep tuc toi Profile Studio
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
