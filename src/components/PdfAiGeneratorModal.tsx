import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { extractTextFromPdfFile } from '../utils/pdfParser';
import { Flashcard, StudySet } from '../types';

interface PdfAiGeneratorModalProps {
  onSaveGeneratedSet: (
    setMeta: Omit<StudySet, 'id' | 'createdAt' | 'updatedAt'>,
    cards: Omit<Flashcard, 'id' | 'setId' | 'authorId' | 'createdAt' | 'updatedAt'>[]
  ) => Promise<void>;
  onCancel: () => void;
  authorId: string;
  authorName: string;
}

interface DraftCard {
  term: string;
  definition: string;
  hint: string;
  example: string;
}

const SAMPLE_LECTURE_NOTES = `CHƯƠNG 4: MẠNG MÁY TÍNH & GIAO THỨC INTERNET (COMPUTER NETWORKS)
1. Mô hình OSI (Open Systems Interconnection): Gồm 7 tầng từ dưới lên: Physical (Vật lý), Data Link (Liên kết dữ liệu), Network (Mạng), Transport (Giao vận), Session (Phiên), Presentation (Trình diễn), Application (Ứng dụng).
2. Giao thức TCP (Transmission Control Protocol): Giao thức hướng kết nối (connection-oriented), đảm bảo truyền dữ liệu tin cậy, đúng thứ tự và có cơ chế kiểm soát tắc nghẽn cũng như bắt tay 3 bước (3-way handshake: SYN, SYN-ACK, ACK).
3. Giao thức UDP (User Datagram Protocol): Giao thức phi kết nối (connectionless), tốc độ truyền nhanh, độ trễ thấp nhưng không đảm bảo gói tin đến đích hay đúng thứ tự. Thường dùng cho livestream, gọi video VoIP, DNS và game online.
4. DNS (Domain Name System): Hệ thống phân giải tên miền, đóng vai trò như danh bạ của Internet chuyển đổi tên miền thân thiện với con người (như google.com) thành địa chỉ IP số học (như 142.250.190.46).
5. HTTP và HTTPS: HTTP là giao thức truyền tải siêu văn bản ở tầng Application. HTTPS tích hợp thêm mã hóa TLS/SSL nhằm bảo vệ dữ liệu khỏi nghe lén (Man-in-the-Middle) và xác thực danh tính máy chủ.
6. Địa chỉ IPv4 và IPv6: IPv4 sử dụng 32-bit (khoảng 4.3 tỷ địa chỉ), trong khi IPv6 sử dụng 128-bit nhằm giải quyết triệt để tình trạng cạn kiệt địa chỉ IP toàn cầu.
7. NAT (Network Address Translation): Kỹ thuật cho phép nhiều thiết bị trong mạng nội bộ (Private IP) dùng chung một địa chỉ IP công cộng (Public IP) khi truy cập ra Internet.`;

export const PdfAiGeneratorModal: React.FC<PdfAiGeneratorModalProps> = ({
  onSaveGeneratedSet,
  onCancel,
  authorId,
  authorName,
}) => {
  const [inputTab, setInputTab] = useState<'pdf' | 'text'>('pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [readingProgress, setReadingProgress] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generated Draft State
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Công nghệ thông tin');
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [draftCards, setDraftCards] = useState<DraftCard[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processPdfFile(file);
  };

  const processPdfFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Vui lòng chọn đúng định dạng tệp PDF (.pdf).');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    setReadingProgress('Đang khởi tạo trình đọc PDF...');

    try {
      const result = await extractTextFromPdfFile(file, (curr, total) => {
        setReadingProgress(`Đang đọc trang ${curr}/${total}...`);
      });
      setExtractedText(result.text);
      setPdfPageCount(result.pageCount);
      setReadingProgress('');
    } catch (err: unknown) {
      console.error('PDF parse error:', err);
      setReadingProgress('');
      setErrorMsg(
        'Không thể đọc trực tiếp văn bản từ tệp PDF này. Bạn có thể chuyển sang tab "Dán văn bản" để nhập nội dung.'
      );
    }
  };

  const handleGenerateWithAI = async () => {
    const contentToProcess = extractedText.trim();
    if (contentToProcess.length < 20) {
      setErrorMsg('Vui lòng tải lên tệp PDF có chữ hoặc dán nội dung bài học tối thiểu 20 ký tự.');
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/extract-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContent: contentToProcess,
          fileName: selectedFile?.name || 'Ghi chú học tập',
          customInstructions: customInstructions.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi từ máy chủ AI');
      }

      setTitle(data.title || selectedFile?.name.replace('.pdf', '') || 'Bộ thẻ AI');
      setDescription(data.description || 'Được trích xuất tự động bằng AI từ tài liệu.');
      setCategory(data.category || 'Chuyên ngành');
      setDraftCards(
        Array.isArray(data.cards) && data.cards.length > 0
          ? data.cards
          : [
              {
                term: 'Khái niệm mẫu',
                definition: 'Định nghĩa được trích xuất từ tài liệu',
                hint: '',
                example: '',
              },
            ]
      );
      setHasDraft(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi phân tích AI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadSampleLecture = () => {
    setInputTab('text');
    setExtractedText(SAMPLE_LECTURE_NOTES);
    setErrorMsg(null);
  };

  const handleCardChange = (index: number, field: keyof DraftCard, value: string) => {
    setDraftCards((prev) =>
      prev.map((c, idx) => (idx === index ? { ...c, [field]: value } : c))
    );
  };

  const handleRemoveCard = (index: number) => {
    if (draftCards.length <= 2) {
      setErrorMsg('Bộ thẻ cần tối thiểu 2 thẻ ghi nhớ.');
      return;
    }
    setDraftCards((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddBlankCard = () => {
    setDraftCards((prev) => [
      ...prev,
      { term: '', definition: '', hint: '', example: '' },
    ]);
  };

  const handleFinalSave = async () => {
    const validCards = draftCards.filter((c) => c.term.trim() && c.definition.trim());
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề cho bộ thẻ.');
      return;
    }
    if (validCards.length < 2) {
      setErrorMsg('Vui lòng hoàn thiện ít nhất 2 thẻ có đầy đủ thuật ngữ và định nghĩa.');
      return;
    }

    setErrorMsg(null);
    setIsSaving(true);

    try {
      await onSaveGeneratedSet(
        {
          title: title.trim(),
          description: description.trim(),
          category: category.trim() || 'Chuyên ngành',
          authorId,
          authorName,
          cardCount: validCards.length,
          isPublic,
        },
        validCards.map((c, index) => ({
          term: c.term.trim(),
          definition: c.definition.trim(),
          hint: c.hint.trim(),
          example: c.example.trim(),
          order: index,
          isStarred: false,
          status: 'new',
        }))
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi lưu bộ thẻ.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#2E3856]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Tự Động Tạo Thẻ Ghi Nhớ Từ PDF Bằng AI
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Tải lên giáo trình, đề cương PDF hoặc dán bài giảng để Gemini AI tự động trích xuất thuật ngữ, định nghĩa và câu hỏi trọng tâm.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="self-start md:self-auto px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1A1D28] hover:bg-slate-200 dark:hover:bg-[#2E3856] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Quay lại thư viện
        </button>
      </div>

      {errorMsg && (
        <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!hasDraft ? (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload / Input Zone */}
          <div className="lg:col-span-7 bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-2xl p-6 shadow-xs">
            {/* Segmented Mode Control */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0A092D] rounded-lg">
                <button
                  onClick={() => setInputTab('pdf')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    inputTab === 'pdf'
                      ? 'bg-white dark:bg-[#2E3856] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Tải tệp PDF
                </button>
                <button
                  onClick={() => setInputTab('text')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    inputTab === 'text'
                      ? 'bg-white dark:bg-[#2E3856] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Dán văn bản / Bài giảng
                </button>
              </div>

              <button
                onClick={handleLoadSampleLecture}
                className="text-xs font-semibold text-[#4257B2] dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Dùng thử bài giảng mẫu
              </button>
            </div>

            {inputTab === 'pdf' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) processPdfFile(file);
                  }}
                  className="border-2 border-dashed border-slate-300 dark:border-[#2E3856] hover:border-[#4257B2] dark:hover:border-indigo-400 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/60 dark:bg-[#0A092D]/50"
                >
                  <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-[#4257B2] dark:text-indigo-400 mb-4">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedFile ? selectedFile.name : 'Nhấn để chọn tệp PDF hoặc kéo thả vào đây'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Hỗ trợ giáo trình, slide bài giảng, tài liệu ôn thi định dạng .PDF
                  </p>

                  {readingProgress && (
                    <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#4257B2] dark:text-indigo-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{readingProgress}</span>
                    </div>
                  )}

                  {selectedFile && !readingProgress && extractedText && (
                    <div className="mt-4 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      Đã trích xuất thành công {pdfPageCount} trang ({extractedText.length.toLocaleString()} ký tự)
                    </div>
                  )}
                </div>

                {extractedText && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span>Nội dung văn bản trích xuất từ PDF (có thể chỉnh sửa trước khi tạo thẻ):</span>
                      <span className="font-mono tabular-nums">{extractedText.length} ký tự</span>
                    </div>
                    <textarea
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      rows={6}
                      className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] p-3.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#4257B2]"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Nội dung tài liệu hoặc ghi chú bài học
                </label>
                <textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  rows={10}
                  placeholder="Dán nội dung chương sách, định nghĩa, đề cương môn học hoặc bài báo khoa học vào đây..."
                  className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] p-4 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#4257B2]"
                />
                <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Tối thiểu 20 ký tự</span>
                  <span className="font-mono tabular-nums">{extractedText.length} ký tự</span>
                </div>
              </div>
            )}

            {/* Custom AI Instructions */}
            <div className="mt-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Yêu cầu tùy chỉnh cho AI (Không bắt buộc)
              </label>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="VD: Tập trung vào các công thức tính toán, dịch thuật ngữ sang tiếng Anh - Việt..."
                className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-white dark:bg-[#0A092D] px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#4257B2]"
              />
            </div>

            <div className="mt-6 flex items-center justify-end">
              <button
                onClick={handleGenerateWithAI}
                disabled={isGenerating || extractedText.trim().length < 20}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-[#4257B2] hover:bg-[#344696] disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI đang phân tích & trích xuất thẻ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Phân tích & Tạo bộ thẻ với AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: How It Works & Extraction Preview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-2xl p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Quy trình trích xuất thông minh
              </h3>
              <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    01. Đọc cấu trúc tệp PDF đa trang
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Quét toàn bộ các trang văn bản trong tệp PDF trực tiếp trên trình duyệt với tốc độ cao.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    02. Chắt lọc khái niệm & định nghĩa cốt lõi
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Mô hình Gemini 3.8 Flash tự động chọn lọc từ 10–25 thuật ngữ quan trọng nhất, kèm mẹo ghi nhớ (Hint) và ví dụ thực tế.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    03. Chỉnh sửa & Đồng bộ Firebase
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Kiểm duyệt lại danh sách thẻ trước khi lưu vào cơ sở dữ liệu đám mây và bắt đầu luyện tập với 4 chế độ học.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Review & Edit AI Generated Cards */
        <div className="mt-8 space-y-6">
          <div className="bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#2E3856]">
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  AI đã trích xuất thành công {draftCards.length} thẻ ghi nhớ
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  Kiểm tra và tinh chỉnh bộ học phần
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setHasDraft(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#0A092D] hover:bg-slate-200 dark:hover:bg-[#2E3856] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Tải lại PDF khác
                </button>
                <button
                  onClick={handleFinalSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Lưu bộ thẻ & Bắt đầu học</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Tiêu đề bộ thẻ
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#4257B2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Chủ đề / Môn học
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#4257B2]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Mô tả tóm tắt
                </label>
                <input
                  type="text"
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
                  <span>Hiển thị công khai cho cộng đồng</span>
                </label>
              </div>
            </div>
          </div>

          {/* Cards Editor List */}
          <div className="space-y-4">
            {draftCards.map((card, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-2xl p-5"
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-[#2E3856]">
                  <span className="text-xs font-bold font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    Thẻ #{index + 1}
                  </span>
                  <button
                    onClick={() => handleRemoveCard(index)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Xóa thẻ này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Thuật ngữ / Câu hỏi trọng tâm
                    </label>
                    <textarea
                      rows={2}
                      value={card.term}
                      onChange={(e) => handleCardChange(index, 'term', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] p-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#4257B2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Định nghĩa / Giải thích
                    </label>
                    <textarea
                      rows={2}
                      value={card.definition}
                      onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#4257B2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Mẹo ghi nhớ (Hint)
                    </label>
                    <input
                      type="text"
                      value={card.hint}
                      onChange={(e) => handleCardChange(index, 'hint', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#4257B2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Ví dụ ngữ cảnh
                    </label>
                    <input
                      type="text"
                      value={card.example}
                      onChange={(e) => handleCardChange(index, 'example', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-[#2E3856] bg-slate-50 dark:bg-[#0A092D] px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#4257B2]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <button
              onClick={handleAddBlankCard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-[#4257B2] dark:text-indigo-300 bg-indigo-50 dark:bg-[#1A1D28] hover:bg-indigo-100 dark:hover:bg-[#2E3856] rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm thẻ ghi nhớ mới</span>
            </button>

            <button
              onClick={handleFinalSave}
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <BookOpen className="w-4 h-4" />
              <span>Hoàn tất & Lưu vào Firebase ({draftCards.length} thẻ)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
