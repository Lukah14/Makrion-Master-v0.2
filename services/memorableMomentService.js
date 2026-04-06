/**
 * Memorable moments — one daily note per date.
 * Storage: profiles/{uid}/memorable_moments/{dateKey}  (document id = YYYY-MM-DD)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { moodRatingToEmoji } from '@/lib/moodEmoji';

function momentsRef(uid) {
  return collection(db, 'profiles', uid, 'memorable_moments');
}

function momentRef(uid, dateKey) {
  return doc(db, 'profiles', uid, 'memorable_moments', dateKey);
}

function tsMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

function clampMood(m) {
  if (m == null || m === '') return null;
  const n = Math.floor(Number(m));
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(1, n));
}

/**
 * Normalize Firestore fields for UI (supports legacy `text` / `moodRating`).
 * @param {string} dateKey
 * @param {object} data
 */
export function normalizeDailyMomentShape(dateKey, data) {
  if (!data) return null;
  let text = '';
  if (data.note != null && String(data.note).trim()) text = String(data.note).trim();
  else if (data.text != null && String(data.text).trim()) text = String(data.text).trim();

  let moodRating = clampMood(data.moodScore ?? data.moodRating);
  if (moodRating == null && text) {
    const legacy = text.match(/^Mood:\s*(\d{1,2})\/10$/i);
    if (legacy) {
      const n = parseInt(legacy[1], 10);
      if (n >= 1 && n <= 10) {
        moodRating = n;
        text = '';
      }
    }
  }

  return {
    id: dateKey,
    dateKey,
    text,
    moodRating,
    photoUrl: data.photoUrl ?? null,
    emoji: data.emoji || (moodRating != null ? moodRatingToEmoji(moodRating) : null),
  };
}

function isDailyMomentVisuallyEmpty(row) {
  if (!row) return true;
  const t = row.text && String(row.text).trim();
  return !t && row.moodRating == null && !row.photoUrl;
}

/**
 * Load the single daily moment for a date (canonical doc, else latest legacy row).
 * @param {string} uid
 * @param {string} dateKey YYYY-MM-DD
 * @returns {Promise<import('@/models/firestoreModels').DailyMemorableMoment|null>}
 */
export async function getMemorableMomentForDate(uid, dateKey) {
  if (!uid || !dateKey) return null;

  const ref = momentRef(uid, dateKey);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const row = normalizeDailyMomentShape(dateKey, snap.data());
    return isDailyMomentVisuallyEmpty(row) ? null : row;
  }

  const q = query(momentsRef(uid), where('dateKey', '==', dateKey));
  const list = await getDocs(q);
  const others = list.docs.filter((d) => d.id !== dateKey);
  if (others.length === 0) return null;

  others.sort((a, b) => {
    const ta = tsMillis(a.data().updatedAt) || tsMillis(a.data().createdAt);
    const tb = tsMillis(b.data().updatedAt) || tsMillis(b.data().createdAt);
    return tb - ta;
  });

  const legacyRow = normalizeDailyMomentShape(dateKey, others[0].data());
  return isDailyMomentVisuallyEmpty(legacyRow) ? null : legacyRow;
}

/**
 * Remove all moment docs for this calendar day except optional keepId (unused — we delete all then write one).
 * @param {string} uid
 * @param {string} dateKey
 */
async function deleteAllMomentsForDate(uid, dateKey) {
  const q = query(momentsRef(uid), where('dateKey', '==', dateKey));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Delete legacy docs with same dateKey but random ids (keeps canonical write intact).
 */
async function deleteLegacyDuplicates(uid, dateKey) {
  const q = query(momentsRef(uid), where('dateKey', '==', dateKey));
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs.filter((d) => d.id !== dateKey).map((d) => deleteDoc(d.ref)),
  );
}

/**
 * Create or update the single daily note for dateKey (document id = dateKey).
 * @param {string} uid
 * @param {string} dateKey
 * @param {{ text?: string|null, moodRating?: number|null, photoUrl?: string|null }} data
 */
export async function upsertMemorableMomentForDate(uid, dateKey, data) {
  const noteTrim = data.text != null ? String(data.text).trim() : '';
  const mood = clampMood(data.moodRating);
  const photoUrl = data.photoUrl !== undefined ? data.photoUrl : null;

  if (!noteTrim && mood == null && !photoUrl) {
    await deleteMemorableMomentForDate(uid, dateKey);
    return;
  }

  const ref = momentRef(uid, dateKey);
  const payload = {
    uid,
    userId: uid,
    dateKey,
    date: dateKey,
    type: 'daily',
    note: noteTrim || null,
    text: noteTrim || null,
    moodScore: mood,
    moodRating: mood,
    emoji: mood != null ? moodRatingToEmoji(mood) : null,
    photoUrl: photoUrl || null,
    updatedAt: serverTimestamp(),
  };

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
  } else {
    await updateDoc(ref, payload);
  }

  await deleteLegacyDuplicates(uid, dateKey);
}

/**
 * Remove this day's note entirely (canonical + any legacy rows).
 */
export async function deleteMemorableMomentForDate(uid, dateKey) {
  await deleteAllMomentsForDate(uid, dateKey);
}
