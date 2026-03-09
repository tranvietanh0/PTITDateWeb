"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function DiscoveryPage() {
  const [status, setStatus] = useState("Dang kiem tra profile...");
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<
    Array<{
      userId: string;
      profile: { displayName: string; bio: string; gender: string };
      photos: Array<{ id: string; url: string }>;
    }>
  >([]);
  const [matches, setMatches] = useState<
    Array<{
      matchId: string;
      partner: {
        userId: string;
        email: string;
        profile?: { displayName?: string };
        photos?: Array<{ id: string; url: string }>;
      };
    }>
  >([]);

  const fetchDiscovery = useCallback(async () => {
    const accessToken = localStorage.getItem("ptitdate_access_token");

    const response = await fetch(
      `${API_URL}/discovery?limit=20`,
      {
        headers: {
          ...(accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {}),
        },
      },
    );
    const data = (await response.json()) as {
      message?: string;
      items?: Array<{
        userId: string;
        profile: { displayName: string; bio: string; gender: string };
        photos: Array<{ id: string; url: string }>;
      }>;
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Khong tai duoc discovery feed");
    }

    setItems(data.items ?? []);
  }, []);

  const fetchMatches = useCallback(async () => {
    const accessToken = localStorage.getItem("ptitdate_access_token");

    const response = await fetch(`${API_URL}/matches`, {
      headers: {
        ...(accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : {}),
      },
    });
    const data = (await response.json()) as {
      message?: string;
      matches?: Array<{
        matchId: string;
        partner: {
          userId: string;
          email: string;
          profile?: { displayName?: string };
          photos?: Array<{ id: string; url: string }>;
        };
      }>;
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Khong tai duoc danh sach match");
    }

    setMatches(data.matches ?? []);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchDiscovery(), fetchMatches()]);
  }, [fetchDiscovery, fetchMatches]);

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
          `${API_URL}/profiles`,
          {
            headers: {
              ...(localStorage.getItem("ptitdate_access_token")
                ? {
                    Authorization: `Bearer ${localStorage.getItem("ptitdate_access_token") ?? ""}`,
                  }
                : {}),
            },
          },
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
          await refreshAll();
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
  }, [refreshAll]);

  async function handleSwipe(targetUserId: string, action: "LIKE" | "PASS") {
    if (!email) {
      return;
    }

    setLoading(true);
    setStatus(action === "LIKE" ? "Dang like..." : "Dang pass...");

    try {
      const response = await fetch(`${API_URL}/swipes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("ptitdate_access_token")
            ? {
                Authorization: `Bearer ${localStorage.getItem("ptitdate_access_token") ?? ""}`,
              }
            : {}),
        },
        body: JSON.stringify({
          targetUserId,
          action,
        }),
      });

      const data = (await response.json()) as {
        matched?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message ?? "Swipe that bai");
      }

      if (data.matched) {
        setStatus("Da match! Kiem tra danh sach match ben duoi.");
      } else {
        setStatus("Swipe thanh cong.");
      }

      await refreshAll();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Swipe that bai");
    } finally {
      setLoading(false);
    }
  }

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
        <>
          <section className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6">
            <h2 className="text-xl font-semibold">Discovery Feed</h2>
            {items.length === 0 ? (
              <p className="mt-3 text-sm text-[#2d3f59]">
                Khong con profile moi de swipe trong luc nay.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {items.map((item) => (
                  <article
                    key={item.userId}
                    className="rounded-2xl border border-[#d8c5b3] bg-white p-4"
                  >
                    <h3 className="text-lg font-semibold">{item.profile.displayName}</h3>
                    <p className="mt-1 text-sm text-[#4b5c77]">{item.profile.gender}</p>
                    <p className="mt-2 text-sm text-[#1d2e4d]">{item.profile.bio}</p>
                    {item.photos[0] ? (
                      <Image
                        src={item.photos[0].url}
                        alt={item.profile.displayName}
                        width={640}
                        height={360}
                        unoptimized
                        className="mt-3 h-44 w-full rounded-xl object-cover"
                      />
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSwipe(item.userId, "PASS")}
                        className="rounded-lg border border-[#b04b29] px-3 py-2 text-sm font-semibold text-[#b04b29] disabled:opacity-50"
                      >
                        Pass
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSwipe(item.userId, "LIKE")}
                        className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Like
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6">
            <h2 className="text-xl font-semibold">Matches</h2>
            {matches.length === 0 ? (
              <p className="mt-3 text-sm text-[#2d3f59]">Chua co match nao.</p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {matches.map((match) => (
                  <div
                    key={match.matchId}
                    className="rounded-2xl border border-[#d8c5b3] bg-white p-4"
                  >
                    <p className="font-semibold">
                      {match.partner.profile?.displayName ?? match.partner.email}
                    </p>
                    <p className="text-sm text-[#4b5c77]">{match.partner.email}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
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
