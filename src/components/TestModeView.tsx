import React, { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Award } from 'lucide-react';
import { Flashcard } from '../types';

interface TestModeViewProps {
  cards: Flashcard[];
  onRecordTestScore: (scorePct: number) => void;
}

interface TestQuestion {
  id: string;
  type: 'true_false' | 'multiple_choice' | 'written';
  card: Flashcard;
  displayedTerm?: string;
  isTruePair?: boolean;
  options?: string[];
}

export const TestModeView: React.FC<TestModeViewProps> = ({
  cards,
  onRecordTestScore,
}) => {
  const [seedKey, setSeedKey] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const questions: TestQuestion[] = useMemo(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    return shuffled.map((card, idx) => {
      if (idx % 3 === 0 && cards.length >= 2) {
        const isTrue = Math.random() > 0.45;
        const otherCard = cards.find((c) => c.id !== card.id) || card;
        return {
          id: `q_${card.id}_${seedKey}`,
          type: 'true_false',
          card,
          displayedTerm: isTrue ? card.term : otherCard.term,
          isTruePair: isTrue,
        };
      } else if (idx % 3 === 1 || cards.length < 3) {
        const distractors = cards
          .filter((c) => c.id !== card.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((c) => c.term);
        const options = [card.term, ...distractors].sort(() => Math.random() - 0.5);
        return {
          id: `q_${card.id}_${seedKey}`,
          type: 'multiple_choice',
          card,
          options,
        };
      } else {
        return {
          id: `q_${card.id}_${seedKey}`,
          type: 'written',
          card,
        };
      }
    });
  }, [cards, seedKey]);

  const checkQuestionCorrect = (q: TestQuestion): boolean => {
    const userAns = (answers[q.id] || '').trim();
    if (q.type === 'true_false') {
      return userAns === String(q.isTruePair);
    }
    if (q.type === 'multiple_choice') {
      return userAns === q.card.term;
    }
    const cleanUser = userAns.toLowerCase();
    const cleanTarget = q.card.term.toLowerCase();
    if (!cleanUser) return false;
    return (
      cleanUser === cleanTarget ||
      (cleanUser.length >= 3 && cleanTarget.includes(cleanUser))
    );
  };

  const handleSubmitTest = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    const correctTotal = questions.filter((q) => checkQuestionCorrect(q)).length;
    const pct = Math.round((correctTotal / questions.length) * 100);
    onRecordTestScore(pct);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetake = () => {
    setAnswers({});
    setIsSubmitted(false);
    setSeedKey((k) => k + 1);
  };

  const correctCount = isSubmitted
    ? questions.filter((q) => checkQuestionCorrect(q)).length
    : 0;
  const scorePct = isSubmitted
    ? Math.round((correctCount / questions.length) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto w-full">
      {isSubmitted && (
        <div className="mb-8 bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-[#2E3856] flex items-center justify-center text-[#4257B2] dark:text-indigo-300 shrink-0">
              <Award className="w-9 h-9" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                Kết quả bài kiểm tra tổng hợp
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                {scorePct}% ({correctCount}/{questions.length} câu đúng)
              </div>
            </div>
          </div>

          <button
            onClick={handleRetake}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-bold text-white bg-[#4257B2] hover:bg-[#344696] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Làm đề kiểm tra mới</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmitTest} className="space-y-6">
        {questions.map((q, index) => {
          const isRight = isSubmitted ? checkQuestionCorrect(q) : null;

          return (
            <div
              key={q.id}
              className="bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-3xl p-7 sm:p-8"
            >
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-[#2E3856] text-sm text-slate-500 dark:text-slate-400">
                <span className="font-mono font-bold tabular-nums">
                  Câu {index + 1} / {questions.length} ·{' '}
                  {q.type === 'true_false'
                    ? 'Đúng / Sai'
                    : q.type === 'multiple_choice'
                    ? 'Trắc nghiệm'
                    : 'Tự luận điền thuật ngữ'}
                </span>

                {isSubmitted && (
                  <span
                    className={`inline-flex items-center gap-1.5 font-bold ${
                      isRight
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isRight ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Đúng</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        <span>Sai</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              {q.type === 'true_false' && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0A092D]">
                      <div className="text-xs font-semibold text-slate-400 mb-1.5">
                        Định nghĩa
                      </div>
                      <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
                        {q.card.definition}
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0A092D]">
                      <div className="text-xs font-semibold text-slate-400 mb-1.5">
                        Thuật ngữ ghép cặp
                      </div>
                      <div className="text-base sm:text-lg font-bold text-[#4257B2] dark:text-indigo-300">
                        {q.displayedTerm}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {['true', 'false'].map((val) => {
                      const chosen = answers[q.id] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          disabled={isSubmitted}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: val }))
                          }
                          className={`py-3.5 px-5 rounded-xl border-2 text-sm sm:text-base font-bold transition-colors cursor-pointer ${
                            chosen
                              ? 'border-[#4257B2] bg-indigo-50 dark:bg-indigo-950/60 text-[#4257B2] dark:text-indigo-300'
                              : 'border-slate-200 dark:border-[#2E3856] text-slate-700 dark:text-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {val === 'true' ? 'Đúng (True)' : 'Sai (False)'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {q.type === 'multiple_choice' && (
                <div>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-5 leading-relaxed">
                    {q.card.definition}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {q.options?.map((opt, i) => {
                      const chosen = answers[q.id] === opt;
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={isSubmitted}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                          }
                          className={`p-4 rounded-xl border-2 text-left text-base font-semibold transition-colors cursor-pointer ${
                            chosen
                              ? 'border-[#4257B2] bg-indigo-50 dark:bg-indigo-950/60 text-[#4257B2] dark:text-indigo-300'
                              : 'border-slate-200 dark:border-[#2E3856] text-slate-700 dark:text-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {q.type === 'written' && (
                <div>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-5 leading-relaxed">
                    {q.card.definition}
                  </p>
                  <input
                    type="text"
                    disabled={isSubmitted}
                    placeholder="Nhập thuật ngữ chính xác..."
                    value={answers[q.id] || ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] px-5 py-3.5 text-base text-slate-900 dark:text-white focus:outline-none focus:border-[#4257B2]"
                  />
                </div>
              )}

              {isSubmitted && !isRight && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#2E3856] text-sm sm:text-base text-emerald-700 dark:text-emerald-400 font-semibold">
                  Đáp án đúng: {q.card.term}
                </div>
              )}
            </div>
          );
        })}

        {!isSubmitted && (
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-9 py-4 text-base font-bold text-white bg-[#4257B2] hover:bg-[#344696] rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Nộp bài & Chấm điểm ngay
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
