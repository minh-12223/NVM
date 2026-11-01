import React, { useState } from 'react';
import { Plus, Trash2, Check, Loader2, AlertCircle } from 'lucide-react';
import { Flashcard, StudySet } from '../types';

interface ManualSetEditorProps {
  initialSet?: StudySet;
  onSaveSet: (
    setMeta: Omit<StudySet, 'id' | 'createdAt' | 'updatedAt'>,
    cards: Omit<Flashcard, 'id' | 'setId' | 'authorId' | 'createdAt' | 'updatedAt'>[],
    existingSetId?: string
  ) => Promise<void>;
  onCancel: () => void;
  authorId: string;
  authorName: string;
}

interface EditableCard {
  term: string;
  definition: string;
  hint: string;
  example: string;
  isStarred: boolean;
  status: 'new' | 'learning' | 'mastered';
}

export const ManualSetEditor: React.FC<ManualSetEditorProps> = ({
  initialSet,
  onSaveSet,
  onCancel,
  authorId,
  authorName,
}) => {
  const [title, setTitle] = useState<string>(initialSet?.title || '');
  const [description, setDescription] = useState<string>(initialSet?.description || '');
  const [category, setCategory] = useState<string>(initialSet?.category || 'Ngoại ngữ');
  const [isPublic, setIsPublic] = useState<boolean>(initialSet?.isPublic ?? true);
  const [cards, setCards] = useState<EditableCard[]>(
    initialSet?.cards && initialSet.cards.length >= 2
      ? initialSet.cards.map((c) => ({
          term: c.term,
          definition: c.definition,
          hint: c.hint || '',
          example: c.example || '',
          isStarred: c.isStarred,
          status: c.status,
        }))
      : [
          { term: '', definition: '', hint: '', example: '', isStarred: false, status: 'new' },
          { term: '', definition: '', hint: '', example: '', isStarred: false, status: 'new' },
          { term: '', definition: '', hint: '', example: '', isStarred: false, status: 'new' },
        ]
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleCardChange = (idx: number, field: keyof EditableCard, value: string) => {
    setCards((prev) =>
      prev.map((card, i) => (i === idx ? { ...card, [field]: value } : card))
    );
  };

  const handleAddCard = () => {
    setCards((prev) => [
      ...prev,
      { term: '', definition: '', hint: '', example: '', isStarred: false, status: 'new' },
    ]);
  };

  const handleRemoveCard = (idx: number) => {
    if (cards.length <= 2) {
      setErrorMsg('Một học phần cần tối thiểu 2 thẻ ghi nhớ.');
      return;
    }
    setCards((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validCards = cards.filter((c) => c.term.trim() && c.definition.trim());

    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề học phần.');
      return;
    }
    if (validCards.length < 2) {
      setErrorMsg('Vui lòng nhập ít nhất 2 thẻ có đầy đủ thuật ngữ và định nghĩa.');
      return;
    }

    setErrorMsg(null);
    setIsSaving(true);
    try {
      await onSaveSet(
        {
          title: title.trim(),
          description: description.trim() || 'Bộ thẻ ghi nhớ tự biên soạn.',
          category: category.trim() || 'Tổng hợp',
          authorId,
          authorName,
          cardCount: validCards.length,
          isPublic,
        },
        validCards.map((c, idx) => ({
          term: c.term.trim(),
          definition: c.definition.trim(),
          hint: c.hint.trim(),
          example: c.example.trim(),
          order: idx,
          isStarred: c.isStarred,
          status: c.status,
        })),
        initialSet?.id
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi lưu học phần.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#2E3856]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {initialSet ? 'Chỉnh Sửa Học Phần' : 'Tạo Học Phần Mới'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Biên soạn thuật ngữ, định nghĩa, mẹo nhớ và đồng bộ trực tiếp lên Firebase Firestore.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1A1D28] hover:bg-slate-200 dark:hover:bg-[#2E3856] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#4257B2] hover:bg-[#344696] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{initialSet ? 'Cập nhật học phần' : 'Tạo học phần'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Set Metadata */}
      <div className="mt-6 bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Tiêu đề học phần
          </label>
          <input
            type="text"
            placeholder='VD: "Chương 2: Kinh tế vĩ mô & Lạm phát"'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#4257B2]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Chủ đề
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#4257B2]"
          >
            <option value="Công nghệ thông tin">Công nghệ thông tin</option>
            <option value="Ngoại ngữ">Ngoại ngữ</option>
            <option value="Y khoa & Sinh học">Y khoa & Sinh học</option>
            <option value="Kinh tế & Tài chính">Kinh tế & Tài chính</option>
            <option value="Khoa học tự nhiên">Khoa học tự nhiên</option>
            <option value="Lịch sử & Xã hội">Lịch sử & Xã hội</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Mô tả học phần
          </label>
          <input
            type="text"
            placeholder="Thêm mô tả ngắn gọn về nội dung học tập..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#4257B2]"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded text-[#4257B2]"
            />
            <span>Công khai học phần</span>
          </label>
        </div>
      </div>

      {/* Cards List */}
      <div className="mt-6 space-y-4">
        {cards.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-2xl p-5"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-[#2E3856]">
              <span className="text-xs font-bold font-mono tabular-nums text-slate-500 dark:text-slate-400">
                #{index + 1}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveCard(index)}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Xóa thẻ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Thuật ngữ
                </label>
                <input
                  type="text"
                  placeholder="Nhập thuật ngữ hoặc câu hỏi..."
                  value={card.term}
                  onChange={(e) => handleCardChange(index, 'term', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#4257B2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Định nghĩa
                </label>
                <input
                  type="text"
                  placeholder="Nhập định nghĩa..."
                  value={card.definition}
                  onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#4257B2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Gợi ý ghi nhớ (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Mẹo nhớ nhanh..."
                  value={card.hint}
                  onChange={(e) => handleCardChange(index, 'hint', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#4257B2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Ví dụ (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Câu ví dụ minh họa..."
                  value={card.example}
                  onChange={(e) => handleCardChange(index, 'example', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#4257B2]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleAddCard}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-[#4257B2] dark:text-indigo-300 bg-indigo-50 dark:bg-[#1A1D28] hover:bg-indigo-100 dark:hover:bg-[#2E3856] rounded-xl transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm thẻ</span>
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-bold text-white bg-[#4257B2] hover:bg-[#344696] disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          <span>Lưu học phần ({cards.length} thẻ)</span>
        </button>
      </div>
    </form>
  );
};
