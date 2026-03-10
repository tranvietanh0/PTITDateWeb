"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { authorizedFetch, fetchCurrentUser } from "../../lib/auth-client";

type ProfileResponse = {
  email: string;
  profile: {
    displayName: string;
    dob: string;
    gender: string;
    bio: string;
    faculty: string | null;
    courseYear: number | null;
  } | null;
  preferences: {
    minAge: number;
    maxAge: number;
    distanceKm: number;
    interestedIn: string | null;
  } | null;
  photos: Array<{ id: string; url: string; orderIndex: number }>;
  completion: {
    isComplete: boolean;
    completedSections: number;
    totalSections: number;
    photoCount: number;
  };
};

const GENDERS = ["MALE", "FEMALE", "NON_BINARY", "OTHER", "PREFER_NOT_TO_SAY"];

export default function OnboardingPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [dob, setDob] = useState("2003-01-01");
  const [gender, setGender] = useState("PREFER_NOT_TO_SAY");
  const [bio, setBio] = useState("");
  const [faculty, setFaculty] = useState("");
  const [courseYear, setCourseYear] = useState("1");

  const [minAge, setMinAge] = useState("18");
  const [maxAge, setMaxAge] = useState("25");
  const [distanceKm, setDistanceKm] = useState("30");
  const [interestedIn, setInterestedIn] = useState("FEMALE");

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoOrder, setPhotoOrder] = useState("0");

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    async function hydrateUser() {
      const user = await fetchCurrentUser();
      if (user) {
        setEmail(user.email);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const queryEmail = params.get("email");
      const localEmail = localStorage.getItem("ptitdate_email");
      const nextEmail = queryEmail ?? localEmail ?? "";

      if (!nextEmail) {
        setStatus("Session khong hop le, dang quay ve trang dang nhap...");
        window.setTimeout(() => {
          window.location.href = "/";
        }, 400);
        return;
      }

      setEmail(nextEmail);
    }

    void hydrateUser();
  }, []);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const response = await authorizedFetch(path, init);

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(
        typeof data.message === "string"
          ? data.message
          : "Request failed, vui long dang nhap lai.",
      );
    }

    return data;
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const data = (await api("/profiles")) as ProfileResponse;
      setProfileData(data);

      if (data.profile) {
        setDisplayName(data.profile.displayName ?? "");
        setDob(data.profile.dob?.slice(0, 10) ?? "2003-01-01");
        setGender(data.profile.gender ?? "PREFER_NOT_TO_SAY");
        setBio(data.profile.bio ?? "");
        setFaculty(data.profile.faculty ?? "");
        setCourseYear(String(data.profile.courseYear ?? 1));
      }

      if (data.preferences) {
        setMinAge(String(data.preferences.minAge));
        setMaxAge(String(data.preferences.maxAge));
        setDistanceKm(String(data.preferences.distanceKm));
        setInterestedIn(data.preferences.interestedIn ?? "FEMALE");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Load profile failed");
    }
  }, [api]);

  useEffect(() => {
    if (!normalizedEmail) {
      return;
    }

    void loadProfile();
  }, [loadProfile, normalizedEmail]);

  function ensureEmail() {
    if (!normalizedEmail) {
      throw new Error("Vui long dang nhap de tiep tuc.");
    }
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("Dang luu profile...");

    try {
      ensureEmail();
      await api("/profiles", {
        method: "PUT",
        body: JSON.stringify({
          displayName,
          dob,
          gender,
          bio,
          faculty,
          courseYear: Number(courseYear),
        }),
      });

      setStatus("Profile da duoc cap nhat.");
      await loadProfile();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Luu profile that bai");
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePreferences(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("Dang luu preferences...");

    try {
      ensureEmail();
      await api("/profiles/preferences", {
        method: "PUT",
        body: JSON.stringify({
          minAge: Number(minAge),
          maxAge: Number(maxAge),
          distanceKm: Number(distanceKm),
          interestedIn,
        }),
      });

      setStatus("Preferences da duoc cap nhat.");
      await loadProfile();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Luu preferences that bai");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPhoto(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("Dang tai photo...");

    try {
      ensureEmail();
      if (!selectedPhoto) {
        throw new Error("Vui long chon anh truoc khi upload.");
      }

      const uploadRequest = (await api("/uploads/presign", {
        method: "POST",
        body: JSON.stringify({
          fileName: selectedPhoto.name,
          contentType: selectedPhoto.type,
        }),
      })) as {
        uploadUrl: string;
      };

      const formData = new FormData();
      formData.append("file", selectedPhoto);

      const uploadResponse = await fetch(uploadRequest.uploadUrl, {
        method: "POST",
        body: formData,
      });
      const uploadResult = (await uploadResponse.json()) as {
        fileUrl?: string;
        message?: string;
      };

      if (!uploadResponse.ok || !uploadResult.fileUrl) {
        throw new Error(uploadResult.message ?? "Upload anh that bai");
      }

      await api("/profiles/photos", {
        method: "POST",
        body: JSON.stringify({
          url: uploadResult.fileUrl,
          orderIndex: Number(photoOrder),
        }),
      });

      setSelectedPhoto(null);
      setStatus("Tai anh thanh cong.");
      await loadProfile();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Tai photo that bai");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    setLoading(true);
    setStatus("Dang xoa photo...");

    try {
      await api(`/profiles/photos/${photoId}`, { method: "DELETE" });
      setStatus("Da xoa photo.");
      await loadProfile();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Xoa photo that bai");
    } finally {
      setLoading(false);
    }
  }

  const progress = profileData?.completion ?? {
    isComplete: false,
    completedSections: 0,
    totalSections: 3,
    photoCount: 0,
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-10 md:py-12">
      <section className="glass-panel fade-up rounded-[30px] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
              Profile Studio
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Hoan thien profile dating</h1>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{normalizedEmail || "Chua co email"}</p>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm">
            <p className="font-semibold">
              Progress: {progress.completedSections}/{progress.totalSections}
            </p>
            <p className="text-[var(--ink-soft)]">Photo: {progress.photoCount} anh</p>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-[var(--surface)] px-4 py-3 text-sm">{status}</p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-panel rounded-[28px] p-5 md:p-6">
          <h2 className="text-xl font-semibold">Thong tin ca nhan</h2>
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-3">
            <input
              className="w-full rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--ring)]"
              placeholder="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2.5 text-sm"
                type="date"
                value={dob}
                onChange={(event) => setDob(event.target.value)}
              />
              <input
                className="rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2.5 text-sm"
                placeholder="Faculty"
                value={faculty}
                onChange={(event) => setFaculty(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2.5 text-sm"
                value={gender}
                onChange={(event) => setGender(event.target.value)}
              >
                {GENDERS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <input
                className="rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2.5 text-sm"
                type="number"
                min={1}
                value={courseYear}
                onChange={(event) => setCourseYear(event.target.value)}
                placeholder="Course year"
              />
            </div>
            <textarea
              className="min-h-24 w-full rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2.5 text-sm"
              value={bio}
              placeholder="Viet bio ngan gon, that va thu hut"
              onChange={(event) => setBio(event.target.value)}
            />
            <button
              disabled={loading}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
              type="submit"
            >
              Luu thong tin co ban
            </button>
          </form>
        </section>

        <section className="glass-panel rounded-[28px] p-5 md:p-6">
          <h2 className="text-xl font-semibold">Preferences + Photos</h2>
          <form onSubmit={handleSavePreferences} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                className="rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2.5 text-sm"
                type="number"
                min={18}
                value={minAge}
                onChange={(event) => setMinAge(event.target.value)}
                placeholder="Min age"
              />
              <input
                className="rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2.5 text-sm"
                type="number"
                min={18}
                value={maxAge}
                onChange={(event) => setMaxAge(event.target.value)}
                placeholder="Max age"
              />
              <input
                className="rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2.5 text-sm"
                type="number"
                min={1}
                value={distanceKm}
                onChange={(event) => setDistanceKm(event.target.value)}
                placeholder="Distance"
              />
            </div>
            <select
              className="w-full rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2.5 text-sm"
              value={interestedIn}
              onChange={(event) => setInterestedIn(event.target.value)}
            >
              {GENDERS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              disabled={loading}
              className="w-full rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              type="submit"
            >
              Luu preferences
            </button>
          </form>

          <form onSubmit={handleAddPhoto} className="mt-5 rounded-2xl border border-[rgba(31,36,51,0.12)] bg-white/75 p-4">
            <p className="text-sm font-semibold">Upload anh profile</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_130px_150px]">
              <input
                className="rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2 text-sm"
                type="file"
                accept="image/*"
                onChange={(event) => setSelectedPhoto(event.target.files?.[0] ?? null)}
              />
              <input
                className="rounded-xl border border-[rgba(31,36,51,0.15)] bg-white px-3 py-2 text-sm"
                type="number"
                min={0}
                value={photoOrder}
                onChange={(event) => setPhotoOrder(event.target.value)}
                placeholder="Order"
              />
              <button
                disabled={loading}
                className="rounded-xl bg-[var(--teal)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                type="submit"
              >
                Tai anh
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="glass-panel mt-6 rounded-[28px] p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Photo gallery</h2>
          <Link
            href="/discovery"
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
          >
            Sang Discovery
          </Link>
        </div>

        {profileData?.photos.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profileData.photos.map((photo) => (
              <article
                key={photo.id}
                className="overflow-hidden rounded-2xl border border-[rgba(31,36,51,0.12)] bg-white"
              >
                <Image
                  src={photo.url}
                  alt={`photo-${photo.orderIndex}`}
                  width={420}
                  height={300}
                  unoptimized
                  className="h-40 w-full object-cover"
                />
                <div className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-[var(--ink-soft)]">Order #{photo.orderIndex}</span>
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="rounded-md border border-[rgba(187,70,33,0.35)] px-2 py-1 text-xs font-semibold text-[var(--accent-strong)]"
                  >
                    Xoa
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--ink-soft)]">Chua co photo nao.</p>
        )}
      </section>
    </main>
  );
}
