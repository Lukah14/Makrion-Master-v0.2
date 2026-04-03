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
export async function updateMemorableMoment(uid, momentId, changes) {
  await updateDoc(momentRef(uid, momentId), {
    ...changes,
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
