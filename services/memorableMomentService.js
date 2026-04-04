/**
 * Memorable moment service — profiles/{uid}/memorable_moments/{momentId}
 * Day-specific (dateKey required).
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function momentsRef(uid) {
  return collection(db, 'profiles', uid, 'memorable_moments');
}

function momentRef(uid, momentId) {
  return doc(db, 'profiles', uid, 'memorable_moments', momentId);
}

/**
 * @param {string} uid
 * @param {string} dateKey
 * @returns {Promise<import('@/models/firestoreModels').MemorableMoment[]>}
 */
export async function getMemorableMomentsByDate(uid, dateKey) {
  const q = query(
    momentsRef(uid),
    where('dateKey', '==', dateKey),
    orderBy('createdAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<string>}
 */
export async function addMemorableMoment(uid, data) {
  const payload = {
    uid,
    dateKey: data.dateKey,
    type: data.type || 'text',
    text: data.text ?? null,
    emoji: data.emoji ?? null,
    photoUrl: data.photoUrl ?? null,
    achievementTag: data.achievementTag ?? null,
    moodTag: data.moodTag ?? null,
    moodRating:
      data.moodRating != null && data.moodRating !== ''
        ? Math.min(10, Math.max(1, Math.floor(Number(data.moodRating))))
        : null,
    happenedAt: data.happenedAt ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(momentsRef(uid), payload);
  return ref.id;
}

/**
 * @param {string} uid
 * @param {string} momentId
 * @param {Object} changes
 */
function stripUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export async function updateMemorableMoment(uid, momentId, changes) {
  const patch = stripUndefined({ ...changes });
  if ('moodRating' in patch) {
    const r = patch.moodRating;
    patch.moodRating =
      r != null && r !== ''
        ? Math.min(10, Math.max(1, Math.floor(Number(r))))
        : null;
  }
  await updateDoc(momentRef(uid, momentId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

/**
 * @param {string} uid
 * @param {string} momentId
 */
export async function deleteMemorableMoment(uid, momentId) {
  await deleteDoc(momentRef(uid, momentId));
}
