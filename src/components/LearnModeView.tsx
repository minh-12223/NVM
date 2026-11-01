import React, { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Lightbulb } from 'lucide-react';
import { Flashcard, CardStatus } from '../types';

interface LearnModeViewProps {
  cards: Flashcard[];
  onUpdateCardStatus: (card: Flashcard, status: CardStatus) => void;
}

export const LearnModeView: React.FC<LearnModeViewProps> = ({
  cards,
  onUpdateCardStatus,
}) => {
  const [queue, setQueue] = useState<Flashcard[]>(() => [...cards]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctStreak, setCorrectStreak] = useState<number>(0);
  const [totalAnswered, setTotalAnswered] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);

  const currentCard = queue[currentIdx];

  // Build 4 multiple-choice options (1 correct + up to 3 distractors from the set)
  const options = useMemo(() => {
    if (!currentCard) return [];
    const otherCards = cards.filter((c) => c.id !== currentCard.id);
    const shuffledOthers = [...otherCards].sort(() => Math.random() - 0.5).slice(0, 3);
    const combined = [
      currentCard.term,
      ...shuffledOthers.map((c) => c.term),
    ];
    return combined.sort(() => Math.random() - 0.5);
  }, [currentCard, cards]);

  const handleSelectOption = (option: string) => {
    if (selectedOption !== null || !currentCard) return;

    setSelectedOption(option);
    const right = option === currentCard.term;
    setIsCorrect(right);
    setTotalAnswered((t) => t + 1);

    if (right) {
      setCorrectCount((c) => c + 1);
      setCorrectStreak((s) => s + 1);
      onUpdateCardStatus(currentCard, 'mastered');
    } else {
      setCorrectStreak(0);
      onUpdateCardStatus(currentCard, 'learning');
      // Adaptive Learning: Re-queue missed card at the end of the session
      setQueue((prev) => [...prev, currentCard]);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsCorrect(null);
    setShowHint(false);
    setCurrentIdx((i) => i + 1);
  };

  const handleRestartLearn = () => {
    setQueue([...cards].sort(() => Math.random() - 0.5));
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsCorrect(null);
    setCorrectStreak(0);
    setTotalAnswered(0);
    setCorrectCount(0);
    setShowHint(false);
  };

  if (currentIdx >= queue.length) {
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 100;
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-3xl p-10 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Hoàn thành vòng Học Thích Ứng (Learn)!
        </h2>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
          Bạn đã nắm vững toàn bộ các khái niệm trong lượt học này (bao gồm cả các câu trả lời sai được lặp lại).
        </p>

        <div className="mt-8 grid grid-cols-3 gap-6 py-6 border-y border-slate-100 dark:border-[#2E3856]">
          <div>
            <div className="text-3xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {accuracy}%
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Độ chính xác</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono tabular-nums text-[#4257B2] dark:text-indigo-400">
              {cards.length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Khái niệm đã thuộc</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
              {totalAnswered}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tổng lượt trả lời</div>
          </div>
        </div>

        <button
          onClick={handleRestartLearn}
          className="mt-8 inline-flex items-center gap-2.5 px-8 py-3.5 text-base font-bold text-white bg-[#4257B2] hover:bg-[#344696] rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Học lại lượt mới</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between text-sm sm:text-base text-slate-500 dark:text-slate-400 mb-4">
        <div>
          Tiến độ vòng học:{' '}
          <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
            {currentIdx + 1} / {queue.length}
          </strong>
        </div>
        <div>
          Chuỗi đúng liên tiếp:{' '}
          <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {correctStreak} câu
          </strong>
        </div>
      </div>

      <div className="w-full h-2 bg-slate-200 dark:bg-[#2E3856] rounded-full overflow-hidden mb-8">
        <div
          className="h-full bg-emerald-500 transition-transform duration-200 origin-left"
          style={{ transform: `scaleX(${(currentIdx + 1) / queue.length})` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-3xl p-8 sm:p-10 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-bold text-slate-400 dark:text-slate-400">
            Định nghĩa
          </span>
          {currentCard.hint && (
            <button
              onClick={() => setShowHint((h) => !h)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              <Lightbulb className="w-4 h-4" />
              <span>{showHint ? currentCard.hint : 'Gợi ý'}</span>
            </button>
          )}
        </div>

        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-relaxed">
          {currentCard.definition}
        </p>

        <div className="mt-10">
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">
            Chọn thuật ngữ đúng tương ứng:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {options.map((option, idx) => {
              const isSelected = selectedOption === option;
              const isRightAnswer = option === currentCard.term;

              let buttonStyle =
                'border-slate-200 dark:border-[#2E3856] bg-slate-50/70 dark:bg-[#0A092D] text-slate-800 dark:text-slate-100 hover:border-[#4257B2] dark:hover:border-indigo-400';

              if (selectedOption !== null) {
                if (isRightAnswer) {
                  buttonStyle =
                    'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200';
                } else if (isSelected && !isRightAnswer) {
                  buttonStyle =
                    'border-red-500 bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200';
                } else {
                  buttonStyle =
                    'border-slate-200 dark:border-[#2E3856] opacity-50 text-slate-500';
                }
              }

              return (
                <button
                  key={idx}
                  disabled={selectedOption !== null}
                  onClick={() => handleSelectOption(option)}
                  className={`flex items-center justify-between gap-4 p-5 rounded-2xl border-2 text-left text-base sm:text-lg font-semibold transition-colors cursor-pointer ${buttonStyle}`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="w-7 h-7 rounded-lg bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] flex items-center justify-center text-sm font-mono font-bold text-slate-500 shrink-0">
                      {idx + 1}
                    </span>
                    <span>{option}</span>
                  </div>

                  {selectedOption !== null && isRightAnswer && (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {selectedOption !== null && isSelected && !isRightAnswer && (
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Footer */}
        {selectedOption !== null && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-[#2E3856] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {isCorrect ? (
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  Chính xác! Thẻ này đã được đánh dấu thuộc lòng.
                </div>
              ) : (
                <div className="text-base font-bold text-red-600 dark:text-red-400">
                  Chưa chính xác. Đáp án đúng là "{currentCard.term}". Hệ thống sẽ lặp lại thẻ này ở cuối vòng!
                </div>
              )}
              {currentCard.example && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                  Ví dụ: {currentCard.example}
                </p>
              )}
            </div>

            <button
              onClick={handleNextQuestion}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm sm:text-base font-bold text-white bg-[#4257B2] hover:bg-[#344696] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Tiếp tục</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
