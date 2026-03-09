"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

  const [photoUrl, setPhotoUrl] = useState("");
  const [photoOrder, setPhotoOrder] = useState("0");

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryEmail = params.get("email");
    const localEmail = localStorage.getItem("ptitdate_email");
    const nextEmail = queryEmail ?? localEmail ?? "";
    setEmail(nextEmail);
  }, []);

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(
        typeof data.message === "string" ? data.message : "Request failed",
      );
    }

    return data;
  }

  const loadProfile = useCallback(async (targetEmail: string) => {
    try {
      const data = (await api(
        `/profiles?email=${encodeURIComponent(targetEmail)}`,
      )) as ProfileResponse;
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
  }, []);

  useEffect(() => {
    if (!normalizedEmail.endsWith("@ptit.edu.vn")) {
      return;
    }

    void loadProfile(normalizedEmail);
  }, [loadProfile, normalizedEmail]);

  function ensureEmail() {
    if (!normalizedEmail.endsWith("@ptit.edu.vn")) {
      throw new Error("Vui long nhap email @ptit.edu.vn hop le");
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
          email: normalizedEmail,
          displayName,
          dob,
          gender,
          bio,
          faculty,
          courseYear: Number(courseYear),
        }),
      });

      setStatus("Luu profile thanh cong");
      await loadProfile(normalizedEmail);
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
          email: normalizedEmail,
          minAge: Number(minAge),
          maxAge: Number(maxAge),
          distanceKm: Number(distanceKm),
          interestedIn,
        }),
      });

      setStatus("Luu preferences thanh cong");
      await loadProfile(normalizedEmail);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Luu preferences that bai");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPhoto(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("Dang them photo...");

    try {
      ensureEmail();
      await api("/profiles/photos", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          url: photoUrl,
          orderIndex: Number(photoOrder),
        }),
      });

      setPhotoUrl("");
      setStatus("Them photo thanh cong");
      await loadProfile(normalizedEmail);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Them photo that bai");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    setLoading(true);
    setStatus("Dang xoa photo...");

    try {
      await api(
        `/profiles/photos/${photoId}?email=${encodeURIComponent(normalizedEmail)}`,
        { method: "DELETE" },
      );
      setStatus("Xoa photo thanh cong");
      await loadProfile(normalizedEmail);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Xoa photo that bai");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 p-5 md:p-10">
      <section className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a8694e]">
          Sprint 2 - Profile Onboarding
        </p>
        <h1 className="mt-2 text-3xl font-bold">Hoan thien profile</h1>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-4 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
          placeholder="mssv@ptit.edu.vn"
        />
        <p className="mt-2 text-sm text-[#2d3f59]">Status: {status}</p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <form
          onSubmit={handleSaveProfile}
          className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6"
        >
          <h2 className="text-xl font-semibold">Thong tin co ban</h2>
          <input
            className="mt-3 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
            placeholder="Display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <input
            className="mt-3 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
            type="date"
            value={dob}
            onChange={(event) => setDob(event.target.value)}
          />
          <select
            className="mt-3 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
            value={gender}
            onChange={(event) => setGender(event.target.value)}
          >
            {GENDERS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <textarea
            className="mt-3 min-h-24 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
            value={bio}
            placeholder="Bio"
            onChange={(event) => setBio(event.target.value)}
          />
          <input
            className="mt-3 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
            value={faculty}
            onChange={(event) => setFaculty(event.target.value)}
            placeholder="Faculty"
          />
          <input
            className="mt-3 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
            type="number"
            min={1}
            value={courseYear}
            onChange={(event) => setCourseYear(event.target.value)}
            placeholder="Course year"
          />
          <button
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-white disabled:opacity-60"
            type="submit"
          >
            Luu profile
          </button>
        </form>

        <form
          onSubmit={handleSavePreferences}
          className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6"
        >
          <h2 className="text-xl font-semibold">Preferences</h2>
          <input
            className="mt-3 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
            type="number"
            min={18}
            value={minAge}
            onChange={(event) => setMinAge(event.target.value)}
            placeholder="Min age"
          />
          <input
            className="mt-3 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
            type="number"
            min={18}
            value={maxAge}
            onChange={(event) => setMaxAge(event.target.value)}
            placeholder="Max age"
          />
          <input
            className="mt-3 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
            type="number"
            min={1}
            value={distanceKm}
            onChange={(event) => setDistanceKm(event.target.value)}
            placeholder="Distance (km)"
          />
          <select
            className="mt-3 w-full rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
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
            className="mt-4 w-full rounded-xl bg-[var(--foreground)] px-4 py-2 font-semibold text-white disabled:opacity-60"
            type="submit"
          >
            Luu preferences
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6">
        <h2 className="text-xl font-semibold">Photos</h2>
        <form onSubmit={handleAddPhoto} className="mt-3 grid gap-3 md:grid-cols-[1fr_140px_160px]">
          <input
            className="rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
            placeholder="https://..."
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
          />
          <input
            className="rounded-xl border border-[#d8c5b3] bg-white px-3 py-2"
            type="number"
            min={0}
            value={photoOrder}
            onChange={(event) => setPhotoOrder(event.target.value)}
            placeholder="Order"
          />
          <button
            disabled={loading}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-white disabled:opacity-60"
            type="submit"
          >
            Them photo
          </button>
        </form>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {profileData?.photos.map((photo) => (
            <div key={photo.id} className="rounded-xl border border-[#d8c5b3] bg-white p-3 text-sm">
              <p className="break-all">{photo.url}</p>
              <p className="mt-1 text-[#4b5c77]">Order: {photo.orderIndex}</p>
              <button
                type="button"
                onClick={() => handleDeletePhoto(photo.id)}
                className="mt-2 rounded-lg border border-[#b04b29] px-3 py-1 font-semibold text-[#b04b29]"
              >
                Xoa
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#e7d8c8] bg-[var(--card)] p-6 text-sm">
        <p>
          Completion: {profileData?.completion.completedSections ?? 0}/
          {profileData?.completion.totalSections ?? 3}
        </p>
        <p>Profile complete: {profileData?.completion.isComplete ? "Yes" : "No"}</p>
        <div className="mt-3">
          <Link
            href="/discovery"
            className="inline-flex rounded-lg bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white"
          >
            Thu vao discovery
          </Link>
        </div>
      </section>
    </main>
  );
}
