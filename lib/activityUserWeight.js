import { getLatestWeightEntry } from '@/services/weightEntryService';
import { getUserProfile } from '@/services/profileService';

/** Used only when no weight entry and no profile weight. */
export const ACTIVITY_WEIGHT_FALLBACK_KG = 80;

/**
 * Weight for activity calorie estimates: latest weight entry, then profile, then 80 kg.
 * @param {string} uid
 * @returns {Promise<number>}
 */
export async function resolveActivityUserWeightKg(uid) {
  if (!uid) return ACTIVITY_WEIGHT_FALLBACK_KG;
  try {
    const latest = await getLatestWeightEntry(uid);
    const w = Number(latest?.weightKg);
    if (Number.isFinite(w) && w > 0) return w;
  } catch (_) {
    /* offline / rules */
  }
  try {
    const profile = await getUserProfile(uid);
    const bodyW = Number(profile?.body?.currentWeightKg);
    if (Number.isFinite(bodyW) && bodyW > 0) return bodyW;
    const rootW = Number(profile?.currentWeightKg);
    if (Number.isFinite(rootW) && rootW > 0) return rootW;
  } catch (_) {
    /* missing profile */
  }
  return ACTIVITY_WEIGHT_FALLBACK_KG;
}
