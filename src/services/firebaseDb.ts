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
  orderBy,
  limit,
  getDocFromServer,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from './googleAuth';
import { DutyShift } from '../types/roster';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Connection test at boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
      return false;
    }
    // Test doc might not exist which is fine, as long as network reachability succeeds
    return true;
  }
}

// 2. Roster persistence
export interface SavedRosterDocument {
  id: string;
  userId: string;
  title: string;
  month: string;
  year: number;
  hospitalName: string;
  department: string;
  shifts: DutyShift[];
  createdAt: string;
  updatedAt: string;
}

export async function saveRosterToFirestore(
  rosterId: string,
  data: Omit<SavedRosterDocument, 'id' | 'userId' | 'updatedAt' | 'createdAt'> & {
    createdAt?: string;
  }
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('กรุณาลงชื่อเข้าใช้ก่อนบันทึกข้อมูลไปยัง Firebase Firestore');

  const path = `rosters/${rosterId}`;
  try {
    const now = new Date().toISOString();
    const docRef = doc(db, 'rosters', rosterId);
    await setDoc(docRef, {
      ...data,
      id: rosterId,
      userId: user.uid,
      createdAt: data.createdAt || now,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchUserRosters(): Promise<SavedRosterDocument[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const path = 'rosters';
  try {
    const q = query(collection(db, path), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const rosters: SavedRosterDocument[] = [];
    snapshot.forEach(docSnap => {
      rosters.push(docSnap.data() as SavedRosterDocument);
    });
    return rosters.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteRosterFromFirestore(rosterId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('กรุณาลงชื่อเข้าใช้ก่อนลบข้อมูล');

  const path = `rosters/${rosterId}`;
  try {
    await deleteDoc(doc(db, 'rosters', rosterId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 3. Notification Logs
export interface NotificationLogItem {
  id: string;
  userId: string;
  shiftId: string;
  staffName: string;
  shiftDate: string;
  type: string;
  recipient: string;
  status: string;
  sentAt: string;
}

export async function logNotificationToFirestore(
  log: Omit<NotificationLogItem, 'userId' | 'sentAt'>
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return; // Silent if not logged in

  const logId = log.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const path = `notificationLogs/${logId}`;
  try {
    await setDoc(doc(db, 'notificationLogs', logId), {
      ...log,
      id: logId,
      userId: user.uid,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Logging notification error:', error);
  }
}

export async function fetchNotificationLogs(): Promise<NotificationLogItem[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const path = 'notificationLogs';
  try {
    const q = query(collection(db, path), where('userId', '==', user.uid), limit(50));
    const snapshot = await getDocs(q);
    const logs: NotificationLogItem[] = [];
    snapshot.forEach(docSnap => {
      logs.push(docSnap.data() as NotificationLogItem);
    });
    return logs.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// 4. User Settings
export interface UserRosterSettings {
  userId: string;
  lineChannelToken?: string;
  defaultSheetId?: string;
  defaultTaskListId?: string;
  defaultCalendarId?: string;
  updatedAt?: string;
}

export async function saveUserSettingsToFirestore(settings: Partial<UserRosterSettings>): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const path = `userSettings/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'userSettings', user.uid),
      {
        ...settings,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchUserSettingsFromFirestore(): Promise<UserRosterSettings | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const path = `userSettings/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'userSettings', user.uid));
    if (snap.exists()) {
      return snap.data() as UserRosterSettings;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}
