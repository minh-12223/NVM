import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { StudySet, Flashcard, StudyStats, CardStatus } from '../types';

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || 'id_default';
}

export async function fetchUserAndPublicStudySets(userId?: string): Promise<StudySet[]> {
  const resultsMap = new Map<string, StudySet>();

  // 1. Fetch public sets
  const publicQuery = query(collection(db, 'studySets'), where('isPublic', '==', true));
  try {
    const publicSnap = await getDocs(publicQuery);
    publicSnap.forEach((docSnap) => {
      const data = docSnap.data();
      resultsMap.set(docSnap.id, {
        id: docSnap.id,
        title: data.title,
        description: data.description,
        category: data.category,
        authorId: data.authorId,
        authorName: data.authorName,
        cardCount: data.cardCount,
        isPublic: data.isPublic,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'studySets');
  }

  // 2. If signed in, also fetch user's private sets
  if (userId) {
    const ownQuery = query(collection(db, 'studySets'), where('authorId', '==', userId));
    try {
      const ownSnap = await getDocs(ownQuery);
      ownSnap.forEach((docSnap) => {
        const data = docSnap.data();
        resultsMap.set(docSnap.id, {
          id: docSnap.id,
          title: data.title,
          description: data.description,
          category: data.category,
          authorId: data.authorId,
          authorName: data.authorName,
          cardCount: data.cardCount,
          isPublic: data.isPublic,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'studySets');
    }
  }

  return Array.from(resultsMap.values());
}

export async function fetchCardsForStudySet(setId: string, authorId: string): Promise<Flashcard[]> {
  const currentUid = auth.currentUser?.uid;
  const cardsPath = `studySets/${setId}/cards`;

  // Our security rules allow `list` on `/studySets/{setId}/cards` when existing().authorId == request.auth.uid
  if (currentUid && currentUid === authorId) {
    const q = query(collection(db, cardsPath), where('authorId', '==', currentUid));
    try {
      const snap = await getDocs(q);
      const cards: Flashcard[] = [];
      snap.forEach((d) => {
        const data = d.data();
        cards.push({
          id: d.id,
          setId: data.setId,
          authorId: data.authorId,
          term: data.term,
          definition: data.definition,
          hint: data.hint || '',
          example: data.example || '',
          order: data.order ?? 0,
          isStarred: Boolean(data.isStarred),
          status: (data.status as CardStatus) || 'new',
        });
      });
      return cards.sort((a, b) => a.order - b.order);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, cardsPath);
    }
  }

  return [];
}

export async function saveStudySetToFirestore(
  studySet: Omit<StudySet, 'id' | 'createdAt' | 'updatedAt'>,
  cards: Omit<Flashcard, 'id' | 'setId' | 'authorId' | 'createdAt' | 'updatedAt'>[],
  existingSetId?: string
): Promise<StudySet> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Vui lòng đăng nhập Google để lưu bộ thẻ lên đám mây Firebase.');
  }

  const setId = existingSetId ? sanitizeId(existingSetId) : sanitizeId(`set_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const setRef = doc(db, 'studySets', setId);

  const sanitizedTitle = (studySet.title || 'Bộ thẻ học tập mới').trim().slice(0, 150);
  const sanitizedDesc = (studySet.description || '').trim().slice(0, 500);
  const sanitizedCat = (studySet.category || 'Tổng hợp').trim().slice(0, 60);
  const sanitizedAuthorName = (user.displayName || user.email || 'Học viên Quizlet').trim().slice(0, 100);
  const boundedCards = cards.slice(0, 500);

  // 1. Create or Update the parent StudySet first so Master Gate exists() passes
  try {
    if (existingSetId) {
      await updateDoc(setRef, {
        title: sanitizedTitle,
        description: sanitizedDesc,
        category: sanitizedCat,
        cardCount: boundedCards.length,
        isPublic: Boolean(studySet.isPublic),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(setRef, {
        title: sanitizedTitle,
        description: sanitizedDesc,
        category: sanitizedCat,
        authorId: user.uid,
        authorName: sanitizedAuthorName,
        cardCount: boundedCards.length,
        isPublic: Boolean(studySet.isPublic),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, existingSetId ? OperationType.UPDATE : OperationType.CREATE, `studySets/${setId}`);
  }

  // 2. Write all cards in batches
  const batch = writeBatch(db);
  const savedCards: Flashcard[] = [];

  boundedCards.forEach((card, idx) => {
    const cardId = sanitizeId(`card_${setId}_${idx}_${Math.random().toString(36).slice(2, 6)}`);
    const cardRef = doc(db, `studySets/${setId}/cards`, cardId);
    const term = (card.term || 'Thuật ngữ').trim().slice(0, 500);
    const definition = (card.definition || 'Định nghĩa').trim().slice(0, 1500);
    const hint = (card.hint || '').trim().slice(0, 300);
    const example = (card.example || '').trim().slice(0, 500);
    const status: CardStatus =
      card.status === 'learning' || card.status === 'mastered' ? card.status : 'new';

    batch.set(cardRef, {
      setId,
      authorId: user.uid,
      term,
      definition,
      hint,
      example,
      order: idx,
      isStarred: Boolean(card.isStarred),
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    savedCards.push({
      id: cardId,
      setId,
      authorId: user.uid,
      term,
      definition,
      hint,
      example,
      order: idx,
      isStarred: Boolean(card.isStarred),
      status,
    });
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `studySets/${setId}/cards`);
  }

  return {
    id: setId,
    title: sanitizedTitle,
    description: sanitizedDesc,
    category: sanitizedCat,
    authorId: user.uid,
    authorName: sanitizedAuthorName,
    cardCount: savedCards.length,
    isPublic: Boolean(studySet.isPublic),
    cards: savedCards,
  };
}

export async function updateCardProgressInFirestore(
  setId: string,
  card: Flashcard,
  updates: Partial<Pick<Flashcard, 'isStarred' | 'status' | 'term' | 'definition' | 'hint' | 'example'>>
): Promise<void> {
  const user = auth.currentUser;
  if (!user || card.authorId !== user.uid) return;

  const cardRef = doc(db, `studySets/${setId}/cards`, card.id);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.isStarred !== undefined) payload.isStarred = Boolean(updates.isStarred);
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.term !== undefined) payload.term = updates.term.trim().slice(0, 500);
  if (updates.definition !== undefined) payload.definition = updates.definition.trim().slice(0, 1500);
  if (updates.hint !== undefined) payload.hint = updates.hint.trim().slice(0, 300);
  if (updates.example !== undefined) payload.example = updates.example.trim().slice(0, 500);

  try {
    await updateDoc(cardRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `studySets/${setId}/cards/${card.id}`);
  }
}

export async function deleteStudySetFromFirestore(setId: string, cards: Flashcard[]): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  // Delete cards first while parent StudySet still exists (required by Master Gate rule)
  for (const card of cards) {
    if (card.authorId === user.uid) {
      try {
        await deleteDoc(doc(db, `studySets/${setId}/cards`, card.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `studySets/${setId}/cards/${card.id}`);
      }
    }
  }

  try {
    await deleteDoc(doc(db, 'studySets', setId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `studySets/${setId}`);
  }
}

export async function saveStudyStatsToFirestore(
  setId: string,
  statsUpdate: {
    bestMatchTimeSec?: number;
    lastTestScore?: number;
    masteredCount?: number;
  },
  existingStats?: StudyStats
): Promise<StudyStats | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const statId = sanitizeId(`stat_${user.uid}_${setId}`);
  const statRef = doc(db, 'studyStats', statId);

  const nextBestTime =
    statsUpdate.bestMatchTimeSec !== undefined
      ? existingStats && existingStats.bestMatchTimeSec > 0
        ? Math.min(existingStats.bestMatchTimeSec, statsUpdate.bestMatchTimeSec)
        : statsUpdate.bestMatchTimeSec
      : existingStats?.bestMatchTimeSec ?? 0;

  const nextTestScore =
    statsUpdate.lastTestScore !== undefined
      ? Math.max(0, Math.min(100, Math.round(statsUpdate.lastTestScore)))
      : existingStats?.lastTestScore ?? 0;

  const nextMastered =
    statsUpdate.masteredCount !== undefined
      ? Math.max(0, Math.min(500, statsUpdate.masteredCount))
      : existingStats?.masteredCount ?? 0;

  try {
    if (existingStats) {
      await updateDoc(statRef, {
        bestMatchTimeSec: nextBestTime,
        lastTestScore: nextTestScore,
        masteredCount: nextMastered,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(statRef, {
        userId: user.uid,
        setId: sanitizeId(setId),
        bestMatchTimeSec: nextBestTime,
        lastTestScore: nextTestScore,
        masteredCount: nextMastered,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existingStats ? OperationType.UPDATE : OperationType.CREATE,
      `studyStats/${statId}`
    );
  }

  return {
    id: statId,
    userId: user.uid,
    setId,
    bestMatchTimeSec: nextBestTime,
    lastTestScore: nextTestScore,
    masteredCount: nextMastered,
  };
}

export async function fetchUserStatsFromFirestore(userId: string): Promise<Record<string, StudyStats>> {
  const q = query(collection(db, 'studyStats'), where('userId', '==', userId));
  try {
    const snap = await getDocs(q);
    const map: Record<string, StudyStats> = {};
    snap.forEach((d) => {
      const data = d.data();
      map[data.setId] = {
        id: d.id,
        userId: data.userId,
        setId: data.setId,
        bestMatchTimeSec: data.bestMatchTimeSec ?? 0,
        lastTestScore: data.lastTestScore ?? 0,
        masteredCount: data.masteredCount ?? 0,
      };
    });
    return map;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'studyStats');
  }
}
