import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Search,
  Sparkles,
  Plus,
  Layers,
  Brain,
  Grid,
  ClipboardCheck,
  Star,
  Volume2,
  Edit3,
  Trash2,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Cloud,
  CheckCircle2,
  Settings,
  X,
  ArrowLeft,
} from 'lucide-react';
import {
  auth,
  testFirestoreConnection,
  loginWithGoogle,
  logoutUser,
} from './firebase';
import {
  StudySet,
  Flashcard,
  StudyStats,
  StudyMode,
  NavView,
  CardStatus,
} from './types';
import { DEFAULT_STUDY_SETS } from './utils/seedData';
import {
  fetchUserAndPublicStudySets,
  fetchCardsForStudySet,
  saveStudySetToFirestore,
  updateCardProgressInFirestore,
  deleteStudySetFromFirestore,
  saveStudyStatsToFirestore,
  fetchUserStatsFromFirestore,
} from './services/firestoreService';
import { TopBar } from './components/TopBar';
import { PdfAiGeneratorModal } from './components/PdfAiGeneratorModal';
import { ManualSetEditor } from './components/ManualSetEditor';
import { FlashcardsView } from './components/FlashcardsView';
import { LearnModeView } from './components/LearnModeView';
import { MatchGameView } from './components/MatchGameView';
import { TestModeView } from './components/TestModeView';
import { StudyProgressChart } from './components/StudyProgressChart';

const LOCAL_STORAGE_KEY = 'quizlet_ai_local_sets_v1';

export default function App() {
  // Theme state (Dark / Light mode)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('quizlet_ai_theme');
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('quizlet_ai_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('quizlet_ai_theme', 'light');
    }
  }, [isDark]);

  // Auth & Firebase Readiness
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  // Study Sets & Active Study State
  const [studySets, setStudySets] = useState<StudySet[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore local storage error
    }
    return DEFAULT_STUDY_SETS;
  });

  const [statsMap, setStatsMap] = useState<Record<string, StudyStats>>({});
  const [activeSetId, setActiveSetId] = useState<string>(DEFAULT_STUDY_SETS[0].id);
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [activeStudyMode, setActiveStudyMode] = useState<StudyMode>('overview');
  const [editingSet, setEditingSet] = useState<StudySet | undefined>(undefined);

  // Isolated Focus Study Workspace Settings Popover State
  const [isStudySettingsOpen, setIsStudySettingsOpen] = useState<boolean>(false);
  const [onlyStarredFocus, setOnlyStarredFocus] = useState<boolean>(false);

  // Dashboard Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Validate connection on boot & listen to Auth state
  useEffect(() => {
    testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Load sets & stats from Firestore when auth is ready
  useEffect(() => {
    if (!isAuthReady) return;

    let isMounted = true;
    async function loadCloudData() {
      try {
        const cloudSets = await fetchUserAndPublicStudySets(currentUser?.uid);
        if (!isMounted) return;

        if (cloudSets.length > 0) {
          const hydratedCloudSets = await Promise.all(
            cloudSets.map(async (s) => {
              if (currentUser && s.authorId === currentUser.uid) {
                const cards = await fetchCardsForStudySet(s.id, s.authorId);
                return { ...s, cards };
              }
              return s;
            })
          );

          setStudySets((prev) => {
            const combined = new Map<string, StudySet>();
            DEFAULT_STUDY_SETS.forEach((seed) => combined.set(seed.id, seed));
            prev.forEach((p) => combined.set(p.id, p));
            hydratedCloudSets.forEach((cs) => {
              const existing = combined.get(cs.id);
              combined.set(cs.id, {
                ...cs,
                cards: cs.cards && cs.cards.length > 0 ? cs.cards : existing?.cards || [],
              });
            });
            const mergedList = Array.from(combined.values());
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedList));
            return mergedList;
          });
        }

        if (currentUser) {
          const userStats = await fetchUserStatsFromFirestore(currentUser.uid);
          if (isMounted) setStatsMap(userStats);
        }
      } catch (err) {
        console.warn('Firestore sync note:', err);
      }
    }

    loadCloudData();
    return () => {
      isMounted = false;
    };
  }, [isAuthReady, currentUser]);

  const activeSet =
    studySets.find((s) => s.id === activeSetId) || studySets[0];

  const categories = Array.from(
    new Set(['all', ...studySets.map((s) => s.category).filter(Boolean)])
  );

  const filteredSets = studySets.filter((s) => {
    const matchesCat =
      selectedCategory === 'all' || s.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  // Handlers
  const handleSelectSetForStudy = (
    set: StudySet,
    mode: StudyMode = 'overview'
  ) => {
    setActiveSetId(set.id);
    setActiveStudyMode(mode);
    setIsStudySettingsOpen(false);
    setCurrentView('study');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveGeneratedOrManualSet = async (
    setMeta: Omit<StudySet, 'id' | 'createdAt' | 'updatedAt'>,
    cards: Omit<Flashcard, 'id' | 'setId' | 'authorId' | 'createdAt' | 'updatedAt'>[],
    existingSetId?: string
  ) => {
    if (currentUser) {
      const savedSet = await saveStudySetToFirestore(setMeta, cards, existingSetId);
      setStudySets((prev) => {
        const filtered = prev.filter((s) => s.id !== savedSet.id);
        const updated = [savedSet, ...filtered];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      setActiveSetId(savedSet.id);
      setActiveStudyMode('overview');
      setCurrentView('study');
      showToast('Đã lưu học phần vào Firebase Firestore thành công!');
    } else {
      const localId = existingSetId || `local_${Date.now()}`;
      const newSet: StudySet = {
        ...setMeta,
        id: localId,
        cards: cards.map((c, idx) => ({
          ...c,
          id: `card_${localId}_${idx}`,
          setId: localId,
          authorId: 'local_guest',
        })),
      };
      setStudySets((prev) => {
        const filtered = prev.filter((s) => s.id !== localId);
        const updated = [newSet, ...filtered];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      setActiveSetId(newSet.id);
      setActiveStudyMode('overview');
      setCurrentView('study');
      showToast('Đã tạo học phần! Đăng nhập Google để đồng bộ lên đám mây Firebase.');
    }
  };

  const handleUpdateCard = async (
    card: Flashcard,
    updates: Partial<Pick<Flashcard, 'isStarred' | 'status'>>
  ) => {
    if (!activeSet) return;

    const updatedCards = (activeSet.cards || []).map((c) =>
      c.id === card.id ? { ...c, ...updates } : c
    );

    setStudySets((prev) => {
      const next = prev.map((s) =>
        s.id === activeSet.id ? { ...s, cards: updatedCards } : s
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    if (currentUser && activeSet.authorId === currentUser.uid) {
      try {
        await updateCardProgressInFirestore(activeSet.id, card, updates);
      } catch (err) {
        console.warn('Card cloud update note:', err);
      }
    }

    if (updates.status) {
      const masteredCount = updatedCards.filter((c) => c.status === 'mastered').length;
      if (currentUser) {
        try {
          const updatedStat = await saveStudyStatsToFirestore(
            activeSet.id,
            { masteredCount },
            statsMap[activeSet.id]
          );
          if (updatedStat) {
            setStatsMap((prev) => ({ ...prev, [activeSet.id]: updatedStat }));
          }
        } catch (err) {
          console.warn('Stats update note:', err);
        }
      }
    }
  };

  const handleDeleteSet = async (set: StudySet) => {
    if (studySets.length <= 1) {
      showToast('Cần giữ lại ít nhất 1 học phần trong thư viện.');
      return;
    }

    setStudySets((prev) => {
      const next = prev.filter((s) => s.id !== set.id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      if (activeSetId === set.id && next.length > 0) {
        setActiveSetId(next[0].id);
      }
      return next;
    });

    if (currentUser && set.authorId === currentUser.uid) {
      try {
        await deleteStudySetFromFirestore(set.id, set.cards || []);
        showToast('Đã xóa học phần khỏi Firebase Firestore.');
      } catch (err) {
        console.warn('Delete set error:', err);
      }
    } else {
      showToast('Đã xóa học phần khỏi danh sách.');
    }
    setCurrentView('dashboard');
  };

  const handleRecordMatchTime = async (seconds: number) => {
    if (!activeSet) return;
    const prevBest = statsMap[activeSet.id]?.bestMatchTimeSec || 0;
    const newBest = prevBest > 0 ? Math.min(prevBest, seconds) : seconds;

    setStatsMap((prev) => ({
      ...prev,
      [activeSet.id]: {
        id: `stat_${activeSet.id}`,
        userId: currentUser?.uid || 'guest',
        setId: activeSet.id,
        bestMatchTimeSec: newBest,
        lastTestScore: prev[activeSet.id]?.lastTestScore || 0,
        masteredCount: prev[activeSet.id]?.masteredCount || 0,
      },
    }));

    if (currentUser) {
      try {
        const saved = await saveStudyStatsToFirestore(
          activeSet.id,
          { bestMatchTimeSec: seconds },
          statsMap[activeSet.id]
        );
        if (saved) {
          setStatsMap((prev) => ({ ...prev, [activeSet.id]: saved }));
        }
      } catch (err) {
        console.warn('Match score cloud save note:', err);
      }
    }
  };

  const handleRecordTestScore = async (scorePct: number) => {
    if (!activeSet) return;
    setStatsMap((prev) => ({
      ...prev,
      [activeSet.id]: {
        id: `stat_${activeSet.id}`,
        userId: currentUser?.uid || 'guest',
        setId: activeSet.id,
        bestMatchTimeSec: prev[activeSet.id]?.bestMatchTimeSec || 0,
        lastTestScore: scorePct,
        masteredCount: prev[activeSet.id]?.masteredCount || 0,
      },
    }));

    if (currentUser) {
      try {
        const saved = await saveStudyStatsToFirestore(
          activeSet.id,
          { lastTestScore: scorePct },
          statsMap[activeSet.id]
        );
        if (saved) {
          setStatsMap((prev) => ({ ...prev, [activeSet.id]: saved }));
        }
      } catch (err) {
        console.warn('Test score cloud save note:', err);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      showToast('Đăng nhập thành công! Dữ liệu của bạn đã kết nối với Firebase.');
    } catch (err: unknown) {
      console.error('Google Sign-In error:', err);
      showToast('Không thể đăng nhập Google. Vui lòng thử lại.');
    }
  };

  const handleSpeakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const hasVi =
        /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
          text
        );
      utterance.lang = hasVi ? 'vi-VN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const totalCardsCount = studySets.reduce(
    (acc, s) => acc + (s.cards?.length || s.cardCount || 0),
    0
  );
  const totalMasteredCount = studySets.reduce(
    (acc, s) =>
      acc + (s.cards?.filter((c) => c.status === 'mastered').length || 0),
    0
  );

  // Check if user is inside an isolated Study Mode (Flashcards, Learn, Match, or Test)
  const isInIsolatedStudyMode =
    currentView === 'study' && activeStudyMode !== 'overview' && Boolean(activeSet);

  const modeDisplayLabel: Record<Exclude<StudyMode, 'overview'>, string> = {
    flashcards: 'Thẻ ghi nhớ (Flashcards)',
    learn: 'Học thích ứng (Learn)',
    match: 'Ghép thẻ tính giờ (Match)',
    test: 'Kiểm tra tổng hợp (Test)',
  };

  // =========================================================================
  // ISOLATED FULL-SCREEN STUDY WORKSPACE (No TopBar, No Utility Bar, No Terms List)
  // =========================================================================
  if (isInIsolatedStudyMode && activeSet) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#0A092D] text-slate-900 dark:text-slate-100 transition-colors flex flex-col justify-between relative px-6 py-8 sm:px-10 sm:py-10">
        {/* Toast Notification */}
        {statusToast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white text-sm font-bold shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{statusToast}</span>
          </div>
        )}

        {/* Minimal Floating Corner Controls: Back to Set Overview (Left) + Small Settings Gear (Right) */}
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                setIsStudySettingsOpen(false);
                setActiveStudyMode('overview');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-[#4257B2] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              title="Quay lại tổng quan học phần"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Thoát chế độ học</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 truncate">
              <span className="font-bold text-[#4257B2] dark:text-indigo-400 whitespace-nowrap">
                {modeDisplayLabel[activeStudyMode as Exclude<StudyMode, 'overview'>]}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {activeSet.title}
              </span>
            </div>
          </div>

          {/* Corner Settings Button & Popover */}
          <div className="relative">
            <button
              onClick={() => setIsStudySettingsOpen((o) => !o)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-[#4257B2] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              title="Cài đặt chế độ học"
            >
              <Settings className="w-4 h-4" />
              <span>Cài đặt</span>
            </button>

            {isStudySettingsOpen && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] shadow-xl p-5 z-50 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2E3856]">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Tùy chỉnh không gian học
                  </span>
                  <button
                    onClick={() => setIsStudySettingsOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Switch Study Mode Quickly inside Settings */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                    Chuyển nhanh chế độ học
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'flashcards', label: 'Thẻ ghi nhớ' },
                        { id: 'learn', label: 'Học (Learn)' },
                        { id: 'match', label: 'Ghép thẻ' },
                        { id: 'test', label: 'Kiểm tra' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setActiveStudyMode(m.id);
                          setIsStudySettingsOpen(false);
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border text-left transition-colors cursor-pointer ${
                          activeStudyMode === m.id
                            ? 'border-[#4257B2] bg-indigo-50 dark:bg-indigo-950/60 text-[#4257B2] dark:text-indigo-300'
                            : 'border-slate-200 dark:border-[#2E3856] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2E3856]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Starred Cards */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#2E3856]">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Chỉ học thẻ gắn sao ({(activeSet.cards || []).filter((c) => c.isStarred).length})
                  </span>
                  <input
                    type="checkbox"
                    checked={onlyStarredFocus}
                    onChange={(e) => setOnlyStarredFocus(e.target.checked)}
                    className="w-4 h-4 rounded text-[#4257B2] cursor-pointer"
                  />
                </div>

                {/* Dark / Light Mode Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#2E3856]">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Giao diện hiển thị
                  </span>
                  <button
                    onClick={() => setIsDark((d) => !d)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-[#0A092D] text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    {isDark ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Chế độ Sáng</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-slate-600" />
                        <span>Chế độ Tối</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Exit to Main Library */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#2E3856]">
                  <button
                    onClick={() => {
                      setIsStudySettingsOpen(false);
                      setActiveStudyMode('overview');
                      setCurrentView('dashboard');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#0A092D] hover:bg-slate-200 dark:hover:bg-[#2E3856] transition-colors cursor-pointer"
                  >
                    Về trang chủ Thư viện NVM
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Isolated Study Stage */}
        <div className="flex-1 flex flex-col justify-center w-full max-w-6xl mx-auto my-auto py-4">
          {activeStudyMode === 'flashcards' && (
            <FlashcardsView
              setTitle={activeSet.title}
              cards={activeSet.cards || []}
              onUpdateCard={handleUpdateCard}
              onlyStarredExternal={onlyStarredFocus}
              onToggleStarredExternal={() => setOnlyStarredFocus((s) => !s)}
            />
          )}

          {activeStudyMode === 'learn' && (
            <LearnModeView
              cards={
                onlyStarredFocus &&
                (activeSet.cards || []).some((c) => c.isStarred)
                  ? (activeSet.cards || []).filter((c) => c.isStarred)
                  : activeSet.cards || []
              }
              onUpdateCardStatus={(card, status: CardStatus) =>
                handleUpdateCard(card, { status })
              }
            />
          )}

          {activeStudyMode === 'match' && (
            <MatchGameView
              cards={
                onlyStarredFocus &&
                (activeSet.cards || []).filter((c) => c.isStarred).length >= 2
                  ? (activeSet.cards || []).filter((c) => c.isStarred)
                  : activeSet.cards || []
              }
              bestTimeSec={statsMap[activeSet.id]?.bestMatchTimeSec || 0}
              onRecordMatchTime={handleRecordMatchTime}
            />
          )}

          {activeStudyMode === 'test' && (
            <TestModeView
              cards={
                onlyStarredFocus &&
                (activeSet.cards || []).filter((c) => c.isStarred).length >= 2
                  ? (activeSet.cards || []).filter((c) => c.isStarred)
                  : activeSet.cards || []
              }
              onRecordTestScore={handleRecordTestScore}
            />
          )}
        </div>

        <div />
      </div>
    );
  }

  // =========================================================================
  // STANDARD APPLICATION SHELL (Dashboard, Set Overview, PDF AI, Manual Editor)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#0A092D] text-slate-900 dark:text-slate-100 transition-colors flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <TopBar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'create') setEditingSet(undefined);
          if (view === 'study') setActiveStudyMode('overview');
          setCurrentView(view);
        }}
        onPrimaryAction={() => setCurrentView('pdf-ai')}
      />

      {/* Secondary Workspace Utility Bar (Theme toggle, Cloud Auth, Search) */}
      <div className="bg-white dark:bg-[#1A1D28] border-b border-slate-200 dark:border-[#2E3856]">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px] max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (currentView !== 'dashboard') setCurrentView('dashboard');
              }}
              placeholder="Tìm kiếm bộ thẻ, thuật ngữ, môn học..."
              className="w-full pl-10 pr-4 py-2 text-sm sm:text-base rounded-xl bg-slate-100 dark:bg-[#0A092D] border border-transparent focus:border-[#4257B2] dark:focus:border-indigo-400 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Right Workspace Controls: Cloud Status, Auth & Theme Switch */}
          <div className="flex items-center gap-3.5">
            {currentUser ? (
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Cloud className="w-4 h-4" />
                  <span>
                    Đã đồng bộ Firebase ({currentUser.displayName || currentUser.email})
                  </span>
                </span>
                <button
                  onClick={() => logoutUser()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2E3856] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#4257B2] dark:text-indigo-300 bg-indigo-50 dark:bg-[#2E3856] hover:bg-indigo-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập Google để lưu Firebase</span>
              </button>
            )}

            <button
              onClick={() => setIsDark((d) => !d)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-[#0A092D] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#2E3856] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Chuyển đổi giao diện Sáng / Tối"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Giao diện Sáng</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-600" />
                  <span>Giao diện Tối</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {statusToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white text-sm font-bold shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'pdf-ai' && (
          <PdfAiGeneratorModal
            onSaveGeneratedSet={(meta, cards) =>
              handleSaveGeneratedOrManualSet(meta, cards)
            }
            onCancel={() => setCurrentView('dashboard')}
            authorId={currentUser?.uid || 'guest'}
            authorName={
              currentUser?.displayName || currentUser?.email || 'Học viên NVM'
            }
          />
        )}

        {currentView === 'create' && (
          <ManualSetEditor
            initialSet={editingSet}
            onSaveSet={(meta, cards, existingId) =>
              handleSaveGeneratedOrManualSet(meta, cards, existingId)
            }
            onCancel={() => setCurrentView('dashboard')}
            authorId={currentUser?.uid || 'guest'}
            authorName={
              currentUser?.displayName || currentUser?.email || 'Học viên NVM'
            }
          />
        )}

        {currentView === 'dashboard' && (
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
            {/* Hero Spotlight Banner */}
            <section className="bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-3xl p-8 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-xs">
              <div className="lg:col-span-7 space-y-4">
                <div className="text-sm font-bold text-[#4257B2] dark:text-indigo-400">
                  NVM — Nền tảng học tập thông minh tích hợp Gemini AI & Firebase
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance leading-tight">
                  Biến mọi giáo trình PDF thành bộ Flashcard thông minh trong vài giây
                </h1>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                  Tải lên tài liệu PDF bài giảng để AI tự động trích xuất thuật ngữ, định nghĩa và câu hỏi trọng tâm. Ôn luyện toàn diện với 4 chế độ riêng biệt: Lật thẻ 3D, Học thích ứng (Learn), Ghép thẻ tính giờ (Match) và Kiểm tra (Test).
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3.5">
                  <button
                    onClick={() => setCurrentView('pdf-ai')}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 text-base font-bold text-white bg-[#4257B2] hover:bg-[#344696] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Tải PDF & Tạo thẻ bằng AI</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingSet(undefined);
                      setCurrentView('create');
                    }}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 text-base font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#0A092D] hover:bg-slate-200 dark:hover:bg-[#2E3856] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Tự biên soạn bộ thẻ</span>
                  </button>
                </div>
              </div>

              {/* Right Summary Metrics Strip */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-[#0A092D] border border-slate-200/80 dark:border-[#2E3856] rounded-2xl p-6">
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-[#4257B2] dark:text-indigo-400">
                    {studySets.length}
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Bộ học phần sẵn sàng
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-[#0A092D] border border-slate-200/80 dark:border-[#2E3856] rounded-2xl p-6">
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {totalMasteredCount} / {totalCardsCount}
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Thuật ngữ đã thuộc lòng
                  </div>
                </div>
                <div className="col-span-2 bg-slate-50 dark:bg-[#0A092D] border border-slate-200/80 dark:border-[#2E3856] rounded-2xl p-6 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-base font-bold text-slate-900 dark:text-white">
                      Tiếp tục học phần gần nhất
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {activeSet?.title}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectSetForStudy(activeSet, 'flashcards')}
                    className="px-5 py-2.5 text-sm font-bold text-[#4257B2] dark:text-indigo-300 bg-indigo-50 dark:bg-[#1A1D28] hover:bg-indigo-100 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Học ngay
                  </button>
                </div>
              </div>
            </section>

            {/* Visual Recharts Pie & Progress Analytics Section */}
            <StudyProgressChart
              studySets={studySets}
              isDark={isDark}
              onSelectSet={(set) => handleSelectSetForStudy(set, 'overview')}
            />

            {/* Study Sets Library Section */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    Thư Viện Bộ Thẻ Ghi Nhớ
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Nhấn vào bộ thẻ để xem chi tiết hoặc chọn trực tiếp chế độ học bên dưới để vào không gian học tập trung
                  </p>
                </div>

                {/* Interactive Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-[#1A1D28] rounded-xl overflow-x-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-white dark:bg-[#2E3856] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'Tất cả chủ đề' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {filteredSets.length === 0 ? (
                <div className="bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-2xl p-12 text-center">
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    Không tìm thấy học phần nào khớp với từ khóa "{searchQuery}"
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="mt-4 px-4 py-2 text-sm font-bold text-[#4257B2] dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Xóa bộ lọc tìm kiếm
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSets.map((set) => {
                    const cardTotal = set.cards?.length || set.cardCount || 0;
                    const mastered =
                      set.cards?.filter((c) => c.status === 'mastered').length || 0;
                    const setStat = statsMap[set.id];

                    return (
                      <div
                        key={set.id}
                        onClick={() => handleSelectSetForStudy(set, 'overview')}
                        className="group bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] hover:border-[#4257B2] dark:hover:border-indigo-400 rounded-2xl p-6 flex flex-col justify-between transition-colors cursor-pointer shadow-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-[#4257B2] dark:text-indigo-400">
                              {set.category}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {cardTotal} thuật ngữ
                            </span>
                            {mastered > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                                  Đã thuộc {mastered}/{cardTotal}
                                </span>
                              </>
                            )}
                          </div>

                          <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white group-hover:text-[#4257B2] dark:group-hover:text-indigo-300 transition-colors line-clamp-2">
                            {set.title}
                          </h3>

                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {set.description}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#2E3856]">
                          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3">
                            <span>Tác giả: {set.authorName}</span>
                            {setStat?.bestMatchTimeSec ? (
                              <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                                Match: {setStat.bestMatchTimeSec.toFixed(1)}s
                              </span>
                            ) : null}
                          </div>

                          {/* Direct Launch into Isolated Focus Study Modes */}
                          <div
                            className="grid grid-cols-4 gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleSelectSetForStudy(set, 'flashcards')}
                              className="py-2 px-2 rounded-lg bg-slate-100 dark:bg-[#0A092D] hover:bg-[#4257B2] hover:text-white text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Thẻ ghi nhớ
                            </button>
                            <button
                              onClick={() => handleSelectSetForStudy(set, 'learn')}
                              className="py-2 px-2 rounded-lg bg-slate-100 dark:bg-[#0A092D] hover:bg-[#4257B2] hover:text-white text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Học
                            </button>
                            <button
                              onClick={() => handleSelectSetForStudy(set, 'match')}
                              className="py-2 px-2 rounded-lg bg-slate-100 dark:bg-[#0A092D] hover:bg-[#4257B2] hover:text-white text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Ghép thẻ
                            </button>
                            <button
                              onClick={() => handleSelectSetForStudy(set, 'test')}
                              className="py-2 px-2 rounded-lg bg-slate-100 dark:bg-[#0A092D] hover:bg-[#4257B2] hover:text-white text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Kiểm tra
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Set Overview Page (When user opens a Study Set before choosing a specific isolated mode) */}
        {currentView === 'study' && activeStudyMode === 'overview' && activeSet && (
          <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#2E3856]">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-[#4257B2] dark:text-indigo-400">
                    {activeSet.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Tạo bởi {activeSet.authorName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {(activeSet.cards || []).length} thuật ngữ
                  </span>
                </div>
                <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {activeSet.title}
                </h1>
                <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                  {activeSet.description}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto">
                <button
                  onClick={() => {
                    setEditingSet(activeSet);
                    setCurrentView('create');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Chỉnh sửa bộ thẻ</span>
                </button>
                <button
                  onClick={() => handleDeleteSet(activeSet)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>

            {/* 4 Mode Launch Cards -> Enters Isolated Study Workspace */}
            <div>
              <h2 className="text-base font-bold text-slate-600 dark:text-slate-300 mb-4">
                Chọn chế độ học để bước vào không gian học tập trung (Full-Screen Focus):
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveStudyMode('flashcards')}
                  className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-200 dark:border-[#2E3856] bg-white dark:bg-[#1A1D28] hover:border-[#4257B2] dark:hover:border-indigo-400 text-left transition-colors cursor-pointer shadow-xs"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-[#2E3856] flex items-center justify-center text-[#4257B2] dark:text-indigo-300 shrink-0">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                      Thẻ ghi nhớ
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Lật thẻ 3D & Mẹo AI
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveStudyMode('learn')}
                  className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-200 dark:border-[#2E3856] bg-white dark:bg-[#1A1D28] hover:border-[#4257B2] dark:hover:border-indigo-400 text-left transition-colors cursor-pointer shadow-xs"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                      Học (Learn)
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Trắc nghiệm thích ứng
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveStudyMode('match')}
                  className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-200 dark:border-[#2E3856] bg-white dark:bg-[#1A1D28] hover:border-[#4257B2] dark:hover:border-indigo-400 text-left transition-colors cursor-pointer shadow-xs"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <Grid className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                      Ghép thẻ
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Trò chơi nối từ tính giờ
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveStudyMode('test')}
                  className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-200 dark:border-[#2E3856] bg-white dark:bg-[#1A1D28] hover:border-[#4257B2] dark:hover:border-indigo-400 text-left transition-colors cursor-pointer shadow-xs"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                    <ClipboardCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                      Kiểm tra
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Đề thi tổng hợp
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Terms List in Set Overview */}
            <section className="pt-6 border-t border-slate-200 dark:border-[#2E3856] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Danh sách thuật ngữ trong học phần này ({(activeSet.cards || []).length})
                </h2>
              </div>

              <div className="space-y-3.5">
                {(activeSet.cards || []).map((card) => (
                  <div
                    key={card.id}
                    className="bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                  >
                    <div className="md:col-span-4 md:border-r border-slate-100 dark:border-[#2E3856] pr-4">
                      <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {card.term}
                      </div>
                      {card.hint && (
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Gợi ý: {card.hint}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-6">
                      <div className="text-base sm:text-lg text-slate-700 dark:text-slate-200">
                        {card.definition}
                      </div>
                      {card.example && (
                        <div className="text-sm italic text-slate-500 dark:text-slate-400 mt-1.5">
                          VD: {card.example}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSpeakText(`${card.term}. ${card.definition}`)}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2E3856] transition-colors cursor-pointer"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateCard(card, { isStarred: !card.isStarred })
                        }
                        className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                          card.isStarred
                            ? 'text-[#FFCD1F]'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                        }`}
                        title="Đánh dấu sao"
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="mt-16 border-t border-slate-200 dark:border-[#2E3856] bg-white dark:bg-[#1A1D28] py-6 px-6 text-sm text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>NVM — Nền tảng học thẻ ghi nhớ thông minh từ tài liệu PDF</span>
          <div className="flex items-center gap-5">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Thư viện
            </button>
            <button
              onClick={() => setCurrentView('pdf-ai')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Trích xuất PDF bằng AI
            </button>
            <button
              onClick={() => setCurrentView('create')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Tạo học phần
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
