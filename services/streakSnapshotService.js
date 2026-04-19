/**
 * Persist the unified strike + per-domain breakdown on users/{uid} for backup,
 * cross-device, and analytics. Source of truth remains derived from daily logs;
 * this is a snapshot only.
 */

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ensureUserRootShell } from '@/services/userService';

function clampNonNegInt(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

/**
 * @param {string} uid
 * @param {{
 *   currentStreak?: number,
 *   bestStreak?: number,
 *   nutritionStreak?: number,
 *   activityStreak?: number,
 *   habitTrackerStreak?: number,
 *   dateKey?: string,
 * }} snapshot
 */
export async function saveDomainStrikesSnapshot(uid, snapshot) {
  if (!uid || typeof uid !== 'string') return;
  const {
    currentStreak = 0,
    bestStreak = 0,
    nutritionStreak = 0,
    activityStreak = 0,
    habitTrackerStreak = 0,
    dateKey = '',
  } = snapshot || {};

  await ensureUserRootShell(uid);

  const cur = clampNonNegInt(currentStreak);
  const best = clampNonNegInt(bestStreak);
  const n = clampNonNegInt(nutritionStreak);
  const a = clampNonNegInt(activityStreak);
  const h = clampNonNegInt(habitTrackerStreak);
  const dk = String(dateKey || '').slice(0, 10);

  await updateDoc(doc(db, 'users', uid), {
    'stats.currentStreak': cur,
    'stats.bestStreak': best,
    'stats.streak': cur,
    'stats.nutritionStreak': n,
    'stats.activityStreak': a,
    'stats.habitTrackerStreak': h,
    'stats.strikesComputedForDate': dk || null,
    'stats.strikesUpdatedAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
