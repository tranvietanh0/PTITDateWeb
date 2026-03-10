"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authorizedFetch, fetchCurrentUser } from "../../lib/auth-client";

type DiscoveryItem = {
  userId: string;
  profile: { displayName: string; bio: string; gender: string };
  photos: Array<{ id: string; url: string }>;
};

type MatchItem = {
  matchId: string;
  partner: {
    userId: string;
    email: string;
    profile?: { displayName?: string; bio?: string };
    photos?: Array<{ id: string; url: string }>;
  };
};

export default function DiscoveryPage() {
  const [status, setStatus] = useState("Dang kiem tra profile...");
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);

  const fetchDiscovery = useCallback(
    async (useCursor = false) => {
      const query = new URLSearchParams({ limit: "12" });
      if (useCursor && cursor) {
        query.set("cursor", cursor);
      }

      const authResponse = await authorizedFetch(`/discovery?${query.toString()}`);
      const data = (await authResponse.json()) as {
        message?: string;
        nextCursor?: string | null;
        items?: DiscoveryItem[];
      };

      if (!authResponse.ok) {
        throw new Error(data.message ?? "Khong tai duoc discovery feed");
      }

      setCursor(data.nextCursor ?? null);
      setItems((prev) => (useCursor ? [...prev, ...(data.items ?? [])] : data.items ?? []));
    },
    [cursor],
  );

  const fetchMatches = useCallback(async () => {
    const response = await authorizedFetch(`/matches`);
    const data = (await response.json()) as {
      message?: string;
      matches?: MatchItem[];
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Khong tai duoc danh sach match");
    }

    setMatches(data.matches ?? []);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchDiscovery(false), fetchMatches()]);
  }, [fetchDiscovery, fetchMatches]);

  useEffect(() => {
    async function checkCompletion() {
      try {
        const user = await fetchCurrentUser();
        if (!user) {
          setAllowed(false);
          setStatus("Session het han, dang quay ve trang chu...");
          window.setTimeout(() => {
            window.location.href = "/";
          }, 500);
          return;
        }

        setEmail(user.email);

        const response = await authorizedFetch(`/profiles`);
        const data = (await response.json()) as {
          completion?: { isComplete: boolean };
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.message ?? "Khong kiem tra duoc profile.");
        }

        if (data.completion?.isComplete) {
          setAllowed(true);
          setStatus("Feed da san sang. Bat dau swipe.");
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
    setLoading(true);
    setStatus(action === "LIKE" ? "Dang like..." : "Dang pass...");

    try {
      const response = await authorizedFetch(`/swipes`, {
        method: "POST",
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

      setStatus(
        data.matched
          ? "Da match! Kiem tra danh sach match ben phai."
          : "Swipe thanh cong.",
      );

      await refreshAll();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Swipe that bai");
    } finally {
      setLoading(false);
    }
  }

  const topCandidate = items[0] ?? null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-10 md:py-12">
      <section className="glass-panel fade-up rounded-[30px] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
              Discovery Room
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Swipe theo phong cach dating web</h1>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{email || "Chua co email session"}</p>
          </div>
          <p className="rounded-xl bg-white/70 px-4 py-2 text-sm">{status}</p>
        </div>
      </section>

      {allowed ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="glass-panel rounded-[28px] p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Swipe deck</h2>
              <button
                type="button"
                onClick={() => void fetchDiscovery(false)}
                className="rounded-lg border border-[rgba(31,36,51,0.18)] px-3 py-1.5 text-xs font-semibold"
              >
                Refresh
              </button>
            </div>

            {topCandidate ? (
              <article className="mt-4 overflow-hidden rounded-3xl border border-[rgba(31,36,51,0.12)] bg-white shadow-[0_20px_50px_rgba(31,36,51,0.15)]">
                <div className="relative">
                  <Image
                    src={topCandidate.photos[0]?.url ?? "https://picsum.photos/800/600"}
                    alt={topCandidate.profile.displayName}
                    width={900}
                    height={600}
                    unoptimized
                    className="h-[340px] w-full object-cover md:h-[420px]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-5 text-white">
                    <p className="text-2xl font-bold">{topCandidate.profile.displayName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/85">
                      {topCandidate.profile.gender}
                    </p>
                    <p className="mt-2 max-w-md text-sm text-white/90">{topCandidate.profile.bio}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleSwipe(topCandidate.userId, "PASS")}
                    className="rounded-xl border border-[rgba(187,70,33,0.45)] px-3 py-3 text-sm font-semibold text-[var(--accent-strong)] disabled:opacity-50"
                  >
                    Pass
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleSwipe(topCandidate.userId, "LIKE")}
                    className="rounded-xl bg-[var(--accent)] px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Like
                  </button>
                </div>
              </article>
            ) : (
              <p className="mt-5 text-sm text-[var(--ink-soft)]">
                Khong con profile moi. Thu load them hoac quay lai sau.
              </p>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void fetchDiscovery(true)}
                disabled={!cursor || loading}
                className="rounded-lg bg-[var(--teal)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Tai them profile
              </button>
            </div>
          </section>

          <section className="glass-panel rounded-[28px] p-5 md:p-6">
            <h2 className="text-xl font-semibold">Matches</h2>
            <div className="mt-4 space-y-3">
              {matches.length === 0 ? (
                <p className="text-sm text-[var(--ink-soft)]">Chua co match nao.</p>
              ) : (
                matches.map((match) => (
                  <article
                    key={match.matchId}
                    className="rounded-2xl border border-[rgba(31,36,51,0.12)] bg-white p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={match.partner.photos?.[0]?.url ?? "https://picsum.photos/200/200"}
                        alt={match.partner.profile?.displayName ?? match.partner.email}
                        width={64}
                        height={64}
                        unoptimized
                        className="h-14 w-14 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold">
                          {match.partner.profile?.displayName ?? match.partner.email}
                        </p>
                        <p className="text-xs text-[var(--ink-soft)]">{match.partner.email}</p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : (
        <section className="glass-panel mt-6 rounded-[28px] p-6">
          <p className="text-sm text-[var(--ink-soft)]">Chua du dieu kien vao discovery.</p>
          <Link
            href={email ? `/onboarding?email=${encodeURIComponent(email)}` : "/"}
            className="mt-3 inline-flex rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
          >
            Di toi onboarding
          </Link>
        </section>
      )}
    </main>
  );
}
