import test from "node:test";
import assert from "node:assert/strict";

import { mockUserProfile } from "./mock-user-profile.ts";
import {
  __resetUserProfileCache,
  loadMockUserProfile,
} from "./user-profile.ts";

test("loadMockUserProfile returns API data and deduplicates concurrent fetches", async () => {
  __resetUserProfileCache();

  let calls = 0;
  const profile = {
    id: "user-1",
    name: "Prem",
    phone: "0812345678",
    emergencyContacts: [
      { id: "contact-1", name: "Mom", phone: "0899999999", relationship: "Parent" },
    ],
    settings: {
      language: "th",
      notifications: true,
      offlineMode: false,
      darkMode: false,
    },
  } as const;

  const fetchImpl = async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => profile,
    } as Response;
  };

  const [first, second] = await Promise.all([
    loadMockUserProfile(fetchImpl as typeof fetch),
    loadMockUserProfile(fetchImpl as typeof fetch),
  ]);

  assert.equal(calls, 1);
  assert.deepEqual(first, profile);
  assert.deepEqual(second, profile);
});

test("loadMockUserProfile falls back to bundled mock when request fails", async () => {
  __resetUserProfileCache();

  const result = await loadMockUserProfile((async () => {
    throw new Error("network");
  }) as typeof fetch);

  assert.deepEqual(result, mockUserProfile);
});
