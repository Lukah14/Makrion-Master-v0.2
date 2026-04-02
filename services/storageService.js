import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '@/lib/firebase';

// ─── Upload helpers ─────────────────────────────────────────────────────────────

async function uploadFile(storagePath, file) {
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export function uploadWithProgress(storagePath, file, onProgress) {
  const storageRef = ref(storage, storagePath);
  const task = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(pct);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

export async function deleteFile(storagePath) {
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}

// ─── Profile photo ──────────────────────────────────────────────────────────────

export async function uploadProfilePhoto(uid, file) {
  return uploadFile(`users/${uid}/profile/avatar`, file);
}

// ─── Progress photos ────────────────────────────────────────────────────────────

export async function uploadProgressPhoto(uid, file) {
  const timestamp = Date.now();
  return uploadFile(`users/${uid}/progress/${timestamp}`, file);
}

export function uploadProgressPhotoWithProgress(uid, file, onProgress) {
  const timestamp = Date.now();
  return uploadWithProgress(`users/${uid}/progress/${timestamp}`, file, onProgress);
}

// ─── Food photos ────────────────────────────────────────────────────────────────

export async function uploadFoodPhoto(uid, foodId, file) {
  return uploadFile(`users/${uid}/foods/${foodId}`, file);
}
