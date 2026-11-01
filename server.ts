import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // AI Endpoint: Extract Flashcards from PDF Text or Study Notes
  app.post('/api/ai/extract-flashcards', async (req, res) => {
    try {
      const { textContent, fileName, customInstructions } = req.body;

      if (!textContent || typeof textContent !== 'string' || textContent.trim().length < 15) {
        res.status(400).json({
          error: 'Nội dung tài liệu quá ngắn hoặc không hợp lệ. Vui lòng tải lên tệp PDF có văn bản hoặc nhập nội dung chi tiết hơn.',
        });
        return;
      }

      const truncatedText = textContent.slice(0, 45000);

      const prompt = `Bạn là một chuyên gia giáo dục hàng đầu chuyên biên soạn bộ thẻ ghi nhớ (Flashcards) chuẩn Quizlet.
Hãy phân tích kỹ tài liệu dưới đây (Tên tài liệu: "${fileName || 'Tài liệu học tập'}") và tự động trích xuất:
1. Tiêu đề bộ thẻ ngắn gọn, súc tích, chuyên nghiệp.
2. Mô tả tóm tắt nội dung cốt lõi của tài liệu.
3. Danh mục môn học/chủ đề phù hợp (ví dụ: Công nghệ thông tin, Ngoại ngữ, Kinh tế học, Sinh học, Lịch sử, Toán học, Y khoa...).
4. Danh sách từ 10 đến 25 thẻ ghi nhớ quan trọng nhất bao gồm các thuật ngữ trọng tâm, khái niệm cốt lõi và câu hỏi ôn tập quan trọng.
Mỗi thẻ cần có:
- term: Thuật ngữ, khái niệm hoặc câu hỏi ngắn gọn rõ ràng (tối đa 200 ký tự).
- definition: Định nghĩa chính xác, dễ hiểu, cô đọng (tối đa 600 ký tự).
- hint: Mẹo ghi nhớ nhanh hoặc từ khóa gợi ý (tối đa 150 ký tự).
- example: Ví dụ thực tế hoặc ngữ cảnh áp dụng (tối đa 250 ký tự).

${customInstructions ? `Yêu cầu bổ sung từ người học: ${customInstructions}` : ''}

--- NỘI DUNG TÀI LIỆU ---
${truncatedText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Bạn là trợ lý học tập AI chuyên trích xuất thuật ngữ, định nghĩa và câu hỏi trọng tâm từ tài liệu PDF sang định dạng JSON chuẩn xác.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Suggested title for the flashcard study set',
              },
              description: {
                type: Type.STRING,
                description: 'Concise description of the study set',
              },
              category: {
                type: Type.STRING,
                description: 'Subject category name',
              },
              cards: {
                type: Type.ARRAY,
                description: 'Extracted flashcards list',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: {
                      type: Type.STRING,
                      description: 'Key term, concept, or core question',
                    },
                    definition: {
                      type: Type.STRING,
                      description: 'Clear definition or explanation',
                    },
                    hint: {
                      type: Type.STRING,
                      description: 'Memory hint or clue',
                    },
                    example: {
                      type: Type.STRING,
                      description: 'Practical example or sentence context',
                    },
                  },
                  required: ['term', 'definition', 'hint', 'example'],
                },
              },
            },
            required: ['title', 'description', 'category', 'cards'],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);

      res.json(parsed);
    } catch (error: unknown) {
      console.error('Error in /api/ai/extract-flashcards:', error);
      const message = error instanceof Error ? error.message : 'Lỗi không xác định khi gọi AI';
      res.status(500).json({
        error: `Không thể tạo thẻ bằng AI: ${message}`,
      });
    }
  });

  // AI Endpoint: Enhance or Explain a Single Concept / Generate Smart Distractors
  app.post('/api/ai/explain-card', async (req, res) => {
    try {
      const { term, definition, setTitle } = req.body;
      if (!term || !definition) {
        res.status(400).json({ error: 'Thiếu thuật ngữ hoặc định nghĩa.' });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Trong chủ đề "${setTitle || 'Học tập'}", hãy giải thích sâu hơn và tạo mẹo ghi nhớ siêu tốc (Mnemonic) cho thuật ngữ:
Thuật ngữ: "${term}"
Định nghĩa hiện tại: "${definition}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              deepExplanation: {
                type: Type.STRING,
                description: 'Easy-to-understand deep explanation in 2-3 sentences',
              },
              mnemonic: {
                type: Type.STRING,
                description: 'Creative memory trick or analogy to remember easily',
              },
              practiceQuestion: {
                type: Type.STRING,
                description: 'A quick self-check question',
              },
            },
            required: ['deepExplanation', 'mnemonic', 'practiceQuestion'],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      res.json(JSON.parse(rawJson));
    } catch (error: unknown) {
      console.error('Error in /api/ai/explain-card:', error);
      const message = error instanceof Error ? error.message : 'Lỗi khi tạo giải thích AI';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
