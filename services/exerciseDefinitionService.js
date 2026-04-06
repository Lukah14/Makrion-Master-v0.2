/**
 * Global exercise catalog: exercises/{exerciseId}
 * Read-only for clients; seed via Admin SDK (see scripts/).
 */

import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { devLogFirestore, formatFirestoreError } from '@/lib/firestoreDebug';
import { waitForAuthUser } from '@/lib/waitForAuthUser';
import {
  normalizeExerciseDefinition,
  isValidExerciseDefinitionRow,
} from '@/lib/exerciseNormalize';

function logExerciseError(context, e) {
  const code = e?.code ?? '';
  const message = e?.message ?? String(e);
  console.warn(`[ExerciseLibrary/Firestore:${context}]`, {
    code,
    message,
    authUid: auth.currentUser?.uid ?? null,
  });
}

/**
 * @returns {Promise<Array>} normalized, catalog-valid exercise rows (malformed / incomplete docs omitted).
 */
export async function listActiveExerciseDefinitions() {
  const uid = await waitForAuthUser();

  const path = 'exercises';
  devLogFirestore('exercises.list', {
    collectionPath: path,
    query: 'getDocs(collection("exercises")) then filter active + valid core fields',
    authUid: uid,
  });

  try {
    const snap = await getDocs(collection(db, 'exercises'));
    const rows = snap.docs
      .map((d) => {
        try {
          return normalizeExerciseDefinition(d.id, d.data());
        } catch {
          return null;
        }
      })
      .filter(
        (row) =>
          row != null &&
          row.isActive !== false &&
          isValidExerciseDefinitionRow(row),
      );
    rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    devLogFirestore('exercises.list.ok', { count: rows.length });
    return rows;
  } catch (e) {
    logExerciseError('list', e);
    devLogFirestore('exercises.list.error', { code: e?.code, message: e?.message });
    throw new Error(formatFirestoreError(e));
  }
}
