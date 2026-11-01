export type CardStatus = 'new' | 'learning' | 'mastered';

export interface Flashcard {
  id: string;
  setId: string;
  authorId: string;
  term: string;
  definition: string;
  hint: string;
  example: string;
  order: number;
  isStarred: boolean;
  status: CardStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudySet {
  id: string;
  title: string;
  description: string;
  category: string;
  authorId: string;
  authorName: string;
  cardCount: number;
  isPublic: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  cards?: Flashcard[];
}

export interface StudyStats {
  id: string;
  userId: string;
  setId: string;
  bestMatchTimeSec: number;
  lastTestScore: number;
  masteredCount: number;
  updatedAt?: unknown;
}

export type StudyMode = 'overview' | 'flashcards' | 'learn' | 'match' | 'test';
export type NavView = 'dashboard' | 'pdf-ai' | 'create' | 'study';

export interface AIExplanation {
  deepExplanation: string;
  mnemonic: string;
  practiceQuestion: string;
}
