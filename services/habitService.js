import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Habits (users/{uid}/habits/{habitId}) ─────────────────────────────────────

function habitsRef(uid) {
  return collection(db, 'users', uid, 'habits');
}

function habitRef(uid, habitId) {
  return doc(db, 'users', uid, 'habits', habitId);
}

export async function createHabit(uid, data) {
  const payload = {
    name: data.name,
    description: data.description || '',
    category: data.category || 'health',
    type: data.type || 'boolean',
    icon: data.icon || 'check',
    color: data.color || '#2DA89E',
    frequency: data.frequency || { type: 'daily', days: [] },
    targetValue: data.targetValue || null,
    unit: data.unit || '',
    reminderEnabled: data.reminderEnabled || false,
    reminderTime: data.reminderTime || null,
    priority: data.priority || 'medium',
    active: true,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(habitsRef(uid), payload);
  return ref.id;
}

export async function getHabit(uid, habitId) {
  const snap = await getDoc(habitRef(uid, habitId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listHabits(uid, activeOnly = true) {
  const constraints = [orderBy('createdAt', 'desc')];
  if (activeOnly) constraints.unshift(where('archived', '==', false));
  const q = query(habitsRef(uid), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateHabit(uid, habitId, changes) {
  await updateDoc(habitRef(uid, habitId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveHabit(uid, habitId) {
  await updateDoc(habitRef(uid, habitId), {
    archived: true,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteHabit(uid, habitId) {
  await deleteDoc(habitRef(uid, habitId));
}

// ─── Habit completions (users/{uid}/habitCompletions/{date}/entries/{id}) ───────

function completionsRef(uid, date) {
  return collection(db, 'users', uid, 'habitCompletions', date, 'entries');
}

function completionRef(uid, date, completionId) {
  return doc(db, 'users', uid, 'habitCompletions', date, 'entries', completionId);
}

export async function logHabitCompletion(uid, date, habitId, data = {}) {
  const id = habitId;
  const ref = doc(db, 'users', uid, 'habitCompletions', date, 'entries', id);
  await setDoc(ref, {
    habitId,
    completed: data.completed ?? true,
    value: data.value ?? null,
    note: data.note || '',
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function getHabitCompletion(uid, date, habitId) {
  const snap = await getDoc(
    doc(db, 'users', uid, 'habitCompletions', date, 'entries', habitId)
  );
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listHabitCompletions(uid, date) {
  const q = query(completionsRef(uid, date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function removeHabitCompletion(uid, date, habitId) {
  await deleteDoc(doc(db, 'users', uid, 'habitCompletions', date, 'entries', habitId));
}
