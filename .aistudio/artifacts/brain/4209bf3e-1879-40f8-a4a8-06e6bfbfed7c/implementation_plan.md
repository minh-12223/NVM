# Quizlet Clone AI: Thẻ Ghi Nhớ & Học Thông Minh Từ PDF

Ứng dụng học tập flashcard toàn diện mô phỏng chuẩn Quizlet, tích hợp công nghệ AI (Google Gemini 3.8 Flash) tự động phân tích và trích xuất tài liệu PDF/văn bản thành bộ thẻ ghi nhớ chất lượng cao, đồng bộ dữ liệu thời gian thực trên Firebase Firestore và hỗ trợ đầy đủ 4 chế độ học tập cốt lõi.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Dưới đây là các quyết định sản phẩm đã được xác nhận từ giai đoạn phỏng vấn làm rõ yêu cầu:

- **Bộ 4 chế độ học tập cốt lõi**:
  - **Flashcards**: Lật thẻ 3D trực quan, phím tắt (Space, Arrow keys), đánh dấu thẻ đã thuộc / cần ôn lại, phát âm âm thanh (Text-to-Speech).
  - **Học (Learn)**: Hệ thống học thích ứng (Adaptive Learning) qua câu hỏi trắc nghiệm và tự luận, tự động lặp lại các khái niệm chưa nhớ vững.
  - **Ghép thẻ (Match)**: Trò chơi ghép cặp thuật ngữ - định nghĩa tính thời gian (Leaderboard & Timer) tạo động lực học tập.
  - **Kiểm tra (Test)**: Bài kiểm tra tổng hợp với tùy chỉnh số lượng câu hỏi, định dạng (Trắc nghiệm, Đúng/Sai, Điền từ) và chấm điểm tức thì kèm phân tích chi tiết.
- **AI Trích xuất từ PDF**: Tự động đọc nội dung PDF, nhận diện cấu trúc, chắt lọc thuật ngữ cốt lõi, định nghĩa chính xác và câu hỏi trọng tâm thông qua mô hình `gemini-3.8-flash` với `responseSchema` JSON nghiêm ngặt.
- **Phong cách giao diện**: Chuẩn Quizlet Modern với màu sắc chủ đạo Quizlet Indigo (`#4257B2`), Deep Navy (`#0A092D` / `#1A1D28`), Slate Canvas, hỗ trợ Dark / Light Mode hoàn chỉnh (`@custom-variant dark`), font chữ Plus Jakarta Sans sắc nét.
- **Lưu trữ Firebase**: Sử dụng Firebase Firestore lưu trữ bộ thẻ (Study Sets), thẻ con (Flashcards), lịch sử học và tiến độ ôn tập; tích hợp Google Authentication bảo mật.

---

## 1. Overview & Core Concept

- **Mục tiêu**: Cung cấp một nền tảng học tập cá nhân hóa mạnh mẽ, giúp học sinh, sinh viên và người đi làm tiết kiệm hàng giờ gõ thẻ thủ công bằng cách tải lên file bài giảng, giáo trình PDF để AI tự động chuyển hóa thành bộ Flashcard thông minh.
- **Đối tượng người dùng**: Người học ngoại ngữ, sinh viên chuẩn bị kỳ thi, chuyên viên ôn chứng chỉ chuyên ngành và giảng viên muốn tạo nhanh học liệu.
- **Giá trị cốt lõi**:
  - Tốc độ: Chuyển đổi PDF 10+ trang thành bộ 20–50 thẻ chuẩn xác chỉ trong vài giây.
  - Hiệu quả: Áp dụng phương pháp Lặp lại ngắt quãng (Spaced Repetition) và Học đa giác quan.
  - Đồng bộ: Lưu trữ đám mây Firebase an toàn, truy cập mọi lúc trên các thiết bị.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Khám phá & Quản lý bộ thẻ (Dashboard)**:
   - Danh sách bộ học tập gần đây, thanh tìm kiếm bộ thẻ, thống kê tiến độ học (Số từ đã thuộc, chuỗi ngày học streak).
   - Nút hành động nhanh: "+ Tạo bộ thẻ mới" và "📄 Nhập từ PDF bằng AI".
2. **Trình tạo thẻ AI từ PDF & Chỉnh sửa (AI Deck Creator)**:
   - Kéo thả tệp PDF hoặc dán văn bản bài giảng.
   - Trình phân tích PDF trích xuất text và gửi tới API server Gemini xử lý.
   - Xem trước danh sách thẻ AI vừa tạo, cho phép sửa đổi nhanh, thêm hình ảnh minh họa, xóa thẻ dư thừa trước khi lưu vào Firestore.
3. **Trải nghiệm Học tập 4 Chế độ**:
   - **Flashcard View**: Thẻ lớn nằm giữa sân khấu, hiệu ứng lật 3D 180 độ mượt mà, thanh tiến độ học phía trên, nút phát âm thanh, nút Biết / Đang học.
   - **Learn Mode**: Hiển thị câu hỏi trắc nghiệm 4 lựa chọn sinh động, giải thích ngay khi chọn đáp án, thanh tỷ lệ thành thạo cập nhật trực tiếp.
   - **Match Game**: Bàn cờ các ô thẻ xáo trộn thuật ngữ và định nghĩa, đồng hồ đếm giây tăng dần, hiệu ứng ghép đúng màu xanh lá biến mất, bảng kết quả ghi nhận kỷ lục thời gian.
   - **Test Mode**: Giao diện bài thi chuẩn hóa, tổng hợp điểm số phần trăm, hiển thị đáp án đúng/sai kèm gợi ý ôn tập lại.

### Visual Identity & Theme Tokens

- **Aesthetic Direction**: EdTech Modern, năng động, thanh lịch và không gian học tập tập trung cao độ.
- **Bảng màu (Tailwind Tokens)**:
  - Canvas (Light): `#F6F7FB` (Slate Soft Canvas) | Canvas (Dark): `#0A092D` (Midnight Navy)
  - Surface Card (Light): `#FFFFFF` với border `#E2E8F0` | Surface Card (Dark): `#1A1D28` với border `#2E3856`
  - Primary / Brand Accent: `#4257B2` (Quizlet Indigo) | Hover: `#374796`
  - Secondary Accent: `#FFCD1F` (Quizlet Star Gold) cho đánh dấu sao thẻ yêu thích
  - Success / Mastered: `#23B26D` (Vibrant Emerald)
  - Need Review / In Progress: `#FF725B` (Coral Orange)
- **Typography**: Display & Body dùng `Plus Jakarta Sans`, các số liệu thời gian và điểm số dùng `tabular-nums`.
- **Chế độ Sáng / Tối**: Tích hợp nút chuyển đổi nhanh trên thanh điều hướng, áp dụng cấu hình `@custom-variant dark (&:where(.dark, .dark *));` đảm bảo độ tương phản WCAG AA 4.5:1.

---

## 3. Key Product Decisions & Trade-Offs

- **Trích xuất nội dung PDF**:
  - *Phương án*: Sử dụng `pdfjs-dist` phía client/server để đọc văn bản các trang PDF một cách trực tiếp và gửi nội dung cấu trúc sang endpoint Gemini `/api/ai/extract-flashcards`. Kèm theo khung nhập văn bản trực tiếp nếu người dùng muốn dán nhanh bài tóm tắt.
  - *Lý do*: Đảm bảo xử lý được mọi tệp PDF giáo trình tiếng Việt và tiếng Anh, không lo lỗi font tiếng Việt, chiết xuất chính xác text layer.
- **Mô hình AI**:
  - *Phương án*: `@google/genai` với model `gemini-3.8-flash` chạy hoàn toàn server-side qua Express API. Sử dụng `responseSchema` dạng `Type.ARRAY` của các object `{ term: string, definition: string, hint?: string, example?: string }`.
  - *Lý do*: Tối ưu tốc độ phản hồi nhanh (~1-2s), chi phí hợp lý, hiểu sâu ngữ cảnh tài liệu tiếng Việt học thuật.
- **Lưu trữ Firebase Firestore & Chế độ Offline Fallback**:
  - *Phương án*: Tích hợp Firebase Firestore và Firebase Authentication (Google Sign-In) với schema `studySets` và `cards`. Cung cấp sẵn mock seed data phong phú và cơ chế LocalStorage đồng bộ khi người dùng chưa cấu hình hoặc muốn thử nghiệm ngay.
  - *Lý do*: Giúp ứng dụng hoạt động ngay lập tức trong mọi môi trường xem trước và đảm bảo dữ liệu luôn bền vững khi đã kết nối Firebase.

---

## 4. Technical Architecture & Data Strategy

### Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Quizlet Clone Architecture                       │
└────────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┴────────────────────────┐
        ▼                                                ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│     Client Web App (React)    │        │      Express Server Proxy     │
│   - Top Navigation (3 Zones)  │        │   - /api/ai/extract-cards     │
│   - StudySet Dashboard        │───────►│     (Gemini 3.8 Flash SDK)    │
│   - Study Modes:              │  POST  │   - Text extraction & prompt  │
│     * Flashcards (3D Flip)    │        │   - JSON responseSchema       │
│     * Learn (Adaptive)        │        └───────────────────────────────┘
│     * Match (Timed Game)      │                        │
│     * Test (Formal Exam)      │                        ▼
│   - PDF Drag-and-Drop Uploader│               ┌─────────────────┐
└───────────────────────────────┘               │ Google GenAI API│
        │                       │               └─────────────────┘
        ▼                       ▼
┌──────────────────┐    ┌────────────────────────────────────────┐
│ Local State /    │    │          Firebase Integration          │
│ Offline Cache    │    │  - Firebase Auth (Google Sign-In)      │
│ (Instant Preview)│    │  - Firestore DB:                       │
└──────────────────┘    │    * studySets/{setId}                 │
                        │    * studySets/{setId}/cards/{cardId}  │
                        │    * studySets/{setId}/scores/{scoreId}│
                        └────────────────────────────────────────┘
```

### Data Models & Firestore Collections

1. **`studySets`** (`/studySets/{setId}`):
   - `id`: string (UUID)
   - `title`: string (Tên bộ học phần, max 150 ký tự)
   - `description`: string (Mô tả, max 500 ký tự)
   - `authorId`: string (User UID)
   - `authorName`: string
   - `category`: string (vd: "Tiếng Anh", "Công nghệ", "Y khoa", "Lịch sử")
   - `cardCount`: number
   - `createdAt`: serverTimestamp
   - `updatedAt`: serverTimestamp
   - `isPublic`: boolean

2. **`cards`** (`/studySets/{setId}/cards/{cardId}`):
   - `id`: string
   - `setId`: string
   - `term`: string (Thuật ngữ / Khái niệm)
   - `definition`: string (Định nghĩa / Giải nghĩa)
   - `hint`: string (Gợi ý nếu có)
   - `example`: string (Ví dụ ứng dụng)
   - `order`: number

3. **`userProgress`** (`/users/{userId}/progress/{setId}`):
   - `learnedCardIds`: string[]
   - `starredCardIds`: string[]
   - `bestMatchTime`: number (giây)
   - `lastTestScore`: number (phần trăm)
   - `lastStudiedAt`: serverTimestamp

---

## 5. Implementation Roadmap (Sau khi phê duyệt Kế hoạch)

1. **Bước 1: Thiết lập Firebase & Môi trường**:
   - Gọi công cụ `show_aistudio_ui` với `ui_type: "firebase_setup"` để bạn phê duyệt cấp phát Firestore và Auth.
   - Khởi tạo `firebase-blueprint.json` và cấu hình SDK.
2. **Bước 2: Cài đặt thư viện & Backend Express Gemini API**:
   - Cài đặt `pdfjs-dist` và cấu hình server Express xử lý trích xuất PDF + Gemini AI sinh thẻ có cấu trúc JSON.
3. **Bước 3: Xây dựng Giao diện & Trình tạo thẻ AI (PDF Uploader)**:
   - Top Bar chuẩn 3 vùng với Logo Quizlet Clone, điều hướng trang và Toggle Dark/Light.
   - Modal kéo thả PDF, thanh tiến trình đọc tài liệu và bảng xem trước/chỉnh sửa danh sách thẻ tạo bởi AI.
4. **Bước 4: Hoàn thiện 4 Chế độ học tập tương tác**:
   - Flashcards 3D Flip, Learn Mode thích ứng, Match Game nối từ tính giờ, Test Mode thi chuẩn hóa.
5. **Bước 5: Đồng bộ Firestore, Kiểm tra Lint & Biên dịch**:
   - Tích hợp Firestore Realtime listener, kiểm thử các thao tác thêm/sửa/xóa bộ thẻ và hoàn tất xác thực bản dựng.
