import React, { useState, useEffect, useCallback } from 'react';
import {
  Volume2,
  Star,
  Shuffle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Check,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Flashcard, CardStatus, AIExplanation } from '../types';

interface FlashcardsViewProps {
  setTitle: string;
  cards: Flashcard[];
  onUpdateCard: (
    card: Flashcard,
    updates: Partial<Pick<Flashcard, 'isStarred' | 'status'>>
  ) => void;
  onlyStarredExternal?: boolean;
  onToggleStarredExternal?: () => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  setTitle,
  cards,
  onUpdateCard,
  onlyStarredExternal,
  onToggleStarredExternal,
}) => {
  const [deck, setDeck] = useState<Flashcard[]>(cards);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [onlyStarredLocal, setOnlyStarredLocal] = useState<boolean>(false);

  const onlyStarred =
    onlyStarredExternal !== undefined ? onlyStarredExternal : onlyStarredLocal;

  // AI Deep Explanation State
  const [aiExplanations, setAiExplanations] = useState<Record<string, AIExplanation>>({});
  const [loadingExplainId, setLoadingExplainId] = useState<string | null>(null);

  useEffect(() => {
    const filtered = onlyStarred ? cards.filter((c) => c.isStarred) : cards;
    setDeck(filtered.length > 0 ? filtered : cards);
    setCurrentIndex((prev) =>
      Math.min(prev, Math.max(0, (filtered.length || cards.length) - 1))
    );
  }, [cards, onlyStarred]);

  const currentCard = deck[currentIndex] || deck[0];

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev + 1) % deck.length);
  }, [deck.length]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev - 1 + deck.length) % deck.length);
  }, [deck.length]);

  const handleShuffle = () => {
    setIsFlipped(false);
    setShowHint(false);
    setDeck((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
  };

  const handleReset = () => {
    setIsFlipped(false);
    setShowHint(false);
    setDeck(onlyStarred ? cards.filter((c) => c.isStarred) : cards);
    setCurrentIndex(0);
  };

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const hasVietnameseChars =
        /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
          text
        );
      utterance.lang = hasVietnameseChars ? 'vi-VN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleMarkStatus = (status: CardStatus) => {
    if (!currentCard) return;
    onUpdateCard(currentCard, { status });
    handleNext();
  };

  const handleAskAiMnemonic = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard || loadingExplainId === currentCard.id) return;

    setLoadingExplainId(currentCard.id);
    try {
      const res = await fetch('/api/ai/explain-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: currentCard.term,
          definition: currentCard.definition,
          setTitle,
        }),
      });
      if (res.ok) {
        const data: AIExplanation = await res.json();
        setAiExplanations((prev) => ({ ...prev, [currentCard.id]: data }));
      }
    } catch (err) {
      console.error('AI Explain error:', err);
    } finally {
      setLoadingExplainId(null);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNext, handlePrev]);

  if (!currentCard) {
    return (
      <div className="p-16 text-center text-lg text-slate-500 dark:text-slate-400">
        Không có thẻ nào trong bộ lọc này.
      </div>
    );
  }

  const currentAiTip = aiExplanations[currentCard.id];
  const progressPct = Math.round(((currentIndex + 1) / deck.length) * 100);

  return (
    <div className="max-w-5xl mx-auto w-full">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 text-sm sm:text-base text-slate-500 dark:text-slate-400">
          <span className="font-mono font-bold tabular-nums text-lg text-slate-900 dark:text-white">
            {currentIndex + 1} / {deck.length}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Trạng thái:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {currentCard.status === 'mastered'
                ? 'Đã thuộc lòng'
                : currentCard.status === 'learning'
                ? 'Đang ôn tập'
                : 'Chưa học'}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (onToggleStarredExternal) onToggleStarredExternal();
              else setOnlyStarredLocal((s) => !s);
            }}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              onlyStarred
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-[#1A1D28] border-slate-200 dark:border-[#2E3856] text-slate-600 dark:text-slate-300'
            }`}
          >
            Chỉ học thẻ gắn sao ({cards.filter((c) => c.isStarred).length})
          </button>
          <button
            onClick={handleShuffle}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2E3856] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Shuffle className="w-4 h-4" />
            <span>Trộn thẻ</span>
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2E3856] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-200 dark:bg-[#2E3856] rounded-full overflow-hidden mb-8">
        <div
          className="h-full bg-[#4257B2] dark:bg-indigo-400 transition-transform duration-200 origin-left"
          style={{ transform: `scaleX(${progressPct / 100})` }}
        />
      </div>

      {/* 3D Interactive Flashcard Stage — Scaled for full desktop viewport */}
      <div
        onClick={() => setIsFlipped((f) => !f)}
        className="perspective-1000 w-full h-[440px] sm:h-[500px] lg:h-[540px] cursor-pointer select-none"
      >
        <div
          className={`relative w-full h-full duration-200 preserve-3d transition-transform ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT SIDE (TERM) */}
          <div className="absolute inset-0 backface-hidden bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-3xl p-8 sm:p-12 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-400 dark:text-slate-400">
                  Thuật ngữ
                </span>
                {currentCard.hint && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHint((h) => !h);
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <Lightbulb className="w-4 h-4" />
                    <span>{showHint ? currentCard.hint : 'Xem gợi ý'}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleSpeak(e, currentCard.term)}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2E3856] transition-colors cursor-pointer"
                  title="Phát âm thuật ngữ"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateCard(currentCard, { isStarred: !currentCard.isStarred });
                  }}
                  className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                    currentCard.isStarred
                      ? 'text-[#FFCD1F]'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                  }`}
                  title="Đánh dấu sao quan trọng"
                >
                  <Star className="w-5 h-5 fill-current" />
                </button>
              </div>
            </div>

            <div className="my-auto text-center px-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight text-balance">
                {currentCard.term}
              </h2>
            </div>

            <div className="text-center text-sm text-slate-400 dark:text-slate-500">
              Nhấn vào thẻ hoặc phím Space để lật xem định nghĩa
            </div>
          </div>

          {/* BACK SIDE (DEFINITION) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-[#1A1D28] border border-[#4257B2]/40 dark:border-indigo-500/40 rounded-3xl p-8 sm:p-12 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#4257B2] dark:text-indigo-400">
                Định nghĩa & Giải thích
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleAskAiMnemonic}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#4257B2] dark:text-indigo-300 bg-indigo-50 dark:bg-[#2E3856] hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  {loadingExplainId === currentCard.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Mẹo nhớ AI</span>
                </button>
                <button
                  onClick={(e) => handleSpeak(e, currentCard.definition)}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2E3856] transition-colors cursor-pointer"
                  title="Phát âm định nghĩa"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="my-auto text-center px-6 overflow-y-auto max-h-72">
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-relaxed">
                {currentCard.definition}
              </p>
              {currentCard.example && (
                <p className="mt-5 text-base sm:text-lg italic text-slate-500 dark:text-slate-400">
                  Ví dụ: "{currentCard.example}"
                </p>
              )}
            </div>

            <div className="text-center text-sm text-slate-400 dark:text-slate-500">
              Nhấn vào thẻ hoặc phím Space để quay lại thuật ngữ
            </div>
          </div>
        </div>
      </div>

      {/* AI Mnemonic / Deep Explanation Callout */}
      {currentAiTip && (
        <div className="mt-5 bg-indigo-50/70 dark:bg-[#1A1D28] border border-indigo-200 dark:border-[#2E3856] rounded-2xl p-6 text-base">
          <div className="font-bold text-[#4257B2] dark:text-indigo-300 mb-1.5">
            Giải thích chuyên sâu & Mẹo ghi nhớ từ Gemini AI
          </div>
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
            {currentAiTip.deepExplanation}
          </p>
          <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Mẹo ghi nhớ (Mnemonic): {currentAiTip.mnemonic}
          </p>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Câu hỏi tự kiểm tra: {currentAiTip.practiceQuestion}
          </p>
        </div>
      )}

      {/* Playback & Mastery Controls */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => handleMarkStatus('learning')}
            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl border border-orange-300 dark:border-orange-800/70 bg-orange-50/70 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 text-sm font-bold hover:bg-orange-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Đang học (Cần ôn lại)</span>
          </button>
          <button
            onClick={() => handleMarkStatus('mastered')}
            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl border border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-sm font-bold hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Đã thuộc lòng</span>
          </button>
        </div>

        <div className="flex items-center gap-3.5">
          <button
            onClick={handlePrev}
            className="p-3.5 rounded-xl bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2E3856] transition-colors cursor-pointer"
            title="Thẻ trước (Phím mũi tên trái)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="p-3.5 rounded-xl bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2E3856] transition-colors cursor-pointer"
            title="Thẻ tiếp theo (Phím mũi tên phải)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
