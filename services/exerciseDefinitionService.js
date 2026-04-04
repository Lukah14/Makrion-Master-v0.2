/**
 * Global exercise catalog: exercises/{exerciseId}
 * Read-only for clients; seed via Admin SDK (see scripts/).
 */

import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { devLogFirestore, formatFirestoreError } from '@/lib/firestoreDebug';
import { waitForAuthUser } from '@/lib/waitForAuthUser';
import { normalizeExerciseDefinition } from '@/lib/exerciseNormalize';

function logExerciseError(context, e) {
  const code = e?.code ?? '';
  const message = e?.message ?? String(e);
  console.warn(`[ExerciseLibrary/Firestore:${context}]`, {
    code,
    message,
    authUid: auth.currentUser?.uid ?? null,
  });
}

/** @returns {Promise<Array>} normalized exercise rows for the Activity library */
export async function listActiveExerciseDefinitions() {
  const uid = await waitForAuthUser();

  const path = 'exercises';
  devLogFirestore('exercises.list', {
    collectionPath: path,
    query: 'getDocs(collection("exercises")) then filter isActive !== false',
    authUid: uid,
  });

  try {
    const snap = await getDocs(collection(db, 'exercises'));
    const rows = snap.docs
      .map((d) => normalizeExerciseDefinition(d.id, d.data()))
      .filter((row) => row.isActive !== false);
    rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    devLogFirestore('exercises.list.ok', { count: rows.length });
    return rows;
  } catch (e) {
    logExerciseError('list', e);
    devLogFirestore('exercises.list.error', { code: e?.code, message: e?.message });
    throw new Error(formatFirestoreError(e));
  }
}
