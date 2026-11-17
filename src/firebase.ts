import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { CustomLevelData } from './game/types';

export const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
];

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}

// In-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function subscribeAuthState(onChange: (user: User | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (!user && !isSigningIn) {
      cachedAccessToken = null;
    }
    onChange(user);
  });
}

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

export async function signInWithGoogle(): Promise<User> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    await ensureUserProfile(result.user);
    return result.user;
  } finally {
    isSigningIn = false;
  }
}

export async function signOutAccount(): Promise<void> {
  cachedAccessToken = null;
  await signOut(auth);
}

export async function ensureUserProfile(user: User): Promise<void> {
  const safeId = user.uid.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `users/${safeId}`;
  const ref = doc(db, 'users', safeId);
  try {
    const snap = await getDoc(ref);
    const displayName = (user.displayName || user.email?.split('@')[0] || 'Игрок').slice(0, 80);
    const email = (user.email || 'user@example.com').slice(0, 160);
    const photoURL = user.photoURL ? user.photoURL.slice(0, 500) : undefined;

    if (!snap.exists()) {
      const payload: Record<string, unknown> = {
        uid: user.uid,
        displayName,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (photoURL) payload.photoURL = photoURL;
      await setDoc(ref, payload);
    } else {
      const payload: Record<string, unknown> = {
        displayName,
        updatedAt: serverTimestamp(),
      };
      if (photoURL) payload.photoURL = photoURL;
      await setDoc(ref, payload, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function sanitizeLevelId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || `lvl_${Date.now()}`;
}

export async function publishLevelToFirestore(
  level: CustomLevelData,
  user: User
): Promise<CustomLevelData> {
  const levelId = sanitizeLevelId(level.id);
  const path = `levels/${levelId}`;
  const ref = doc(db, 'levels', levelId);
  const authorName = (user.displayName || user.email?.split('@')[0] || 'Игрок').slice(0, 60);
  const title = (level.title || 'Без названия').trim().slice(0, 40) || 'Без названия';
  const description = (level.description || 'Пользовательский уровень Jelly Dash').slice(0, 200);
  const safeObjects = level.objects.slice(0, 2500).map((o) => ({
    id: String(o.id).slice(0, 64),
    type: o.type,
    gx: Number(o.gx),
    gy: Number(o.gy),
    w: o.w ?? 1,
    h: o.h ?? 1,
  }));

  if (safeObjects.length === 0) {
    throw new Error('Добавьте хотя бы один объект в уровень перед публикацией.');
  }

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await setDoc(
        ref,
        {
          title,
          description,
          difficulty: level.difficulty,
          bpm: Math.max(60, Math.min(240, Number(level.bpm) || 130)),
          baseSpeed: Math.max(4, Math.min(15, Number(level.baseSpeed) || 7.9)),
          lengthUnits: Math.max(20, Math.min(1000, Number(level.lengthUnits) || 120)),
          ceilingGy: Math.max(6, Math.min(20, Number(level.ceilingGy) || 8.75)),
          accentColor: level.accentColor.slice(0, 32),
          bgTop: level.bgTop.slice(0, 32),
          bgBottom: level.bgBottom.slice(0, 32),
          groundColor: level.groundColor.slice(0, 32),
          gridColor: level.gridColor.slice(0, 64),
          musicKey: level.musicKey,
          objects: safeObjects,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await setDoc(ref, {
        id: levelId,
        title,
        authorUid: user.uid,
        authorName,
        description,
        difficulty: level.difficulty,
        bpm: Math.max(60, Math.min(240, Number(level.bpm) || 130)),
        baseSpeed: Math.max(4, Math.min(15, Number(level.baseSpeed) || 7.9)),
        lengthUnits: Math.max(20, Math.min(1000, Number(level.lengthUnits) || 120)),
        ceilingGy: Math.max(6, Math.min(20, Number(level.ceilingGy) || 8.75)),
        accentColor: level.accentColor.slice(0, 32),
        bgTop: level.bgTop.slice(0, 32),
        bgBottom: level.bgBottom.slice(0, 32),
        groundColor: level.groundColor.slice(0, 32),
        gridColor: level.gridColor.slice(0, 64),
        musicKey: level.musicKey,
        objects: safeObjects,
        published: true,
        likes: level.likes ?? 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }

  return {
    ...level,
    id: levelId,
    title,
    author: authorName,
    authorUid: user.uid,
    description,
    objects: safeObjects,
    published: true,
    updatedAt: Date.now(),
  };
}

export async function deletePublishedLevelFromFirestore(levelId: string): Promise<void> {
  const safeId = sanitizeLevelId(levelId);
  const path = `levels/${safeId}`;
  try {
    await deleteDoc(doc(db, 'levels', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribePublishedLevels(
  onLevels: (levels: CustomLevelData[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(collection(db, 'levels'), where('published', '==', true), limit(60));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CustomLevelData[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const createdMs = d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now();
        const updatedMs = d.updatedAt?.toMillis ? d.updatedAt.toMillis() : createdMs;
        list.push({
          id: docSnap.id,
          title: String(d.title || 'Уровень'),
          author: String(d.authorName || 'Игрок'),
          authorUid: typeof d.authorUid === 'string' ? d.authorUid : undefined,
          description: String(d.description || ''),
          difficulty: d.difficulty || 'Классика',
          bpm: Number(d.bpm || 130),
          baseSpeed: Number(d.baseSpeed || 7.9),
          lengthUnits: Number(d.lengthUnits || 120),
          ceilingGy: Number(d.ceilingGy || 8.75),
          accentColor: String(d.accentColor || '#3B82F6'),
          bgTop: String(d.bgTop || '#0F172A'),
          bgBottom: String(d.bgBottom || '#1E1B3A'),
          groundColor: String(d.groundColor || '#1E293B'),
          gridColor: String(d.gridColor || 'rgba(59, 130, 246, 0.12)'),
          musicKey: d.musicKey || 'stereo',
          objects: Array.isArray(d.objects) ? d.objects : [],
          createdAt: createdMs,
          updatedAt: updatedMs,
          published: true,
          likes: Number(d.likes || 0),
        });
      });
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      onLevels(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'levels');
      } catch (wrapped) {
        if (onError) onError(wrapped);
      }
    }
  );
}
