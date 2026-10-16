import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { firestoreDb } from './firebase.ts';

export const firebaseSync = {
  // Save an item to Firestore collection
  async saveItem(collectionName: string, id: string, data: any): Promise<void> {
    try {
      if (!firestoreDb || !id) return;
      const docRef = doc(firestoreDb, collectionName, String(id));
      await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn(`[FirebaseSync] Error saving to ${collectionName}/${id}:`, err);
    }
  },

  // Delete an item from Firestore collection
  async deleteItem(collectionName: string, id: string): Promise<void> {
    try {
      if (!firestoreDb || !id) return;
      const docRef = doc(firestoreDb, collectionName, String(id));
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`[FirebaseSync] Error deleting from ${collectionName}/${id}:`, err);
    }
  },

  // Fetch all items from a Firestore collection
  async getAllItems(collectionName: string): Promise<any[]> {
    try {
      if (!firestoreDb) return [];
      const querySnapshot = await getDocs(collection(firestoreDb, collectionName));
      const items: any[] = [];
      querySnapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      return items;
    } catch (err) {
      console.warn(`[FirebaseSync] Error fetching from ${collectionName}:`, err);
      return [];
    }
  },

  // Sync entire array of items to Firestore
  async syncBatch(collectionName: string, items: any[]): Promise<void> {
    try {
      if (!firestoreDb || !Array.isArray(items)) return;
      for (const item of items) {
        if (item && item.id) {
          await this.saveItem(collectionName, item.id, item);
        }
      }
    } catch (err) {
      console.warn(`[FirebaseSync] Error syncing batch to ${collectionName}:`, err);
    }
  },

  // Real-time listener for Firestore collection changes
  subscribeCollection(collectionName: string, onUpdate: (items: any[]) => void): (() => void) | null {
    try {
      if (!firestoreDb) return null;
      const collRef = collection(firestoreDb, collectionName);
      const unsubscribe = onSnapshot(
        collRef,
        (snapshot) => {
          const items: any[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() });
          });
          onUpdate(items);
        },
        (err) => {
          console.warn(`[FirebaseSync] onSnapshot error on ${collectionName}:`, err);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn(`[FirebaseSync] subscribeCollection error on ${collectionName}:`, err);
      return null;
    }
  }
};
