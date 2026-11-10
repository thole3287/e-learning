import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../services/api';
import { Question, QuestionType } from '../../types';
import { MathRenderer } from '../../components/math/MathRenderer';
import { MathToolbar } from '../../components/math/MathToolbar';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import {
  Plus,
  Pencil,
  Filter,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  FileUp,
  FileText,
  Code,
  UploadCloud,
  Download,
  AlertCircle,
  BookOpen,
  FileCheck,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ParsedQuestionItem {
  content: string;
  options: { content: string; is_correct: boolean }[];
  explanation?: string;
  difficulty_level: number;
  question_type: string;
}

export const QuestionBankView: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Modal Soạn / Chỉnh sửa 1 câu hỏi thủ công
  const [showModal, setShowModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  // Modal Import File Word / Text / JSON
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<'word_file' | 'word_text' | 'json'>('word_file');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [wordRawText, setWordRawText] = useState('');
  const [jsonRawText, setJsonRawText] = useState('');
  const [importSubjectId, setImportSubjectId] = useState(1);
  const [importDefaultDifficulty, setImportDefaultDifficulty] = useState(1);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestionItem[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Soạn thảo 1 câu hỏi mới thủ công / Chỉnh sửa câu hỏi
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');
  const [fillBlankAnswer, setFillBlankAnswer] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('single_choice');
  const [difficultyLevel, setDifficultyLevel] = useState<number>(1);
  const [options, setOptions] = useState([
    { content: '', is_correct: true },
    { content: '', is_correct: false },
    { content: '', is_correct: false },
    { content: '', is_correct: false },
  ]);

  // Quản lý ô đang được focus để chèn công thức từ thanh MathToolbar
  const [activeField, setActiveField] = useState<{ id: string; name: string }>({
    id: 'content',
    name: 'Nội dung câu hỏi',
  });

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const explanationRef = useRef<HTMLTextAreaElement>(null);
  const fillBlankRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLInputElement | null)[]>([]);

  const fetchQuestions = async (page = currentPage, pageSize = perPage) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        per_page: pageSize === -1 ? 1000 : pageSize,
      };
      if (difficultyFilter) params.difficulty_level = difficultyFilter;
      if (subjectFilter) params.subject_id = subjectFilter;
      if (questionTypeFilter) params.question_type = questionTypeFilter;
      if (searchKeyword.trim()) params.search = searchKeyword.trim();

      const res: any = await api.get('/questions', { params });
      if (res.success) {
        setQuestions(res.data);
        if (res.meta) {
          setTotalQuestions(res.meta.total);
          setTotalPages(res.meta.last_page);
          setCurrentPage(res.meta.current_page);
        } else {
          setTotalQuestions(res.data.length);
          setTotalPages(1);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchQuestions(newPage, perPage);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchKeyword(searchInput);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchKeyword('');
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchQuestions(1, perPage);
  }, [difficultyFilter, subjectFilter, questionTypeFilter, searchKeyword, perPage]);

  useEffect(() => {
    api.get('/subjects').then((res: any) => {
      if (res.success) {
        setSubjects(res.data);
        if (res.data.length > 0) setImportSubjectId(res.data[0].id);
      }
    });
  }, []);

  // Bộ phân tích cú pháp đề thi toàn diện (Chuẩn cấu trúc Đề thi GDPT 2018 Bộ GD&ĐT)
  const parseWordText = (text: string, defaultDiff: number) => {
    setParseError(null);
    if (!text.trim()) {
      setParsedQuestions([]);
      return;
    }

    try {
      // 1. Quét Bảng Đáp Án nếu có ở cuối tài liệu (ví dụ: "BẢNG ĐÁP ÁN: 1.B 2.A 3.B...")
      const answerKeyMap: Record<number, string> = {};
      const answerKeyMatch = text.match(/(?:BẢNG\s+ĐÁP\s+ÁN|ĐÁP\s+ÁN\s+PHẦN\s+I|ĐÁP\s+ÁN\s+TRẮC\s+NGHIỆM)[\s\S]*$/i);
      const searchKeyText = answerKeyMatch ? answerKeyMatch[0] : text;
      const keyRegex = /(?:Câu\s*)?(\d+)[\.\s\:\-]+([A-D])/gi;
      let kMatch;
      while ((kMatch = keyRegex.exec(searchKeyText)) !== null) {
        answerKeyMap[parseInt(kMatch[1], 10)] = kMatch[2].toUpperCase();
      }

      // Quét Bảng Đáp Án Phần II nếu có (ví dụ: "Câu 1: a-Đ, b-S, c-S, d-Đ" hoặc "1. aĐ, bS, cS, dĐ")
      const answerKeyPart2Map: Record<number, Record<string, boolean>> = {};
      const part2KeyRegex = /(?:Câu\s*)?(\d+)[\.:\s]+([a-d])\s*[-–:]?\s*([ĐS]|[Đđ]úng|[Ss]ai)/gi;
      let p2Match;
      while ((p2Match = part2KeyRegex.exec(searchKeyText)) !== null) {
        const qId = parseInt(p2Match[1], 10);
        const letter = p2Match[2].toLowerCase();
        const isTrue = /^(?:Đ|Đúng)$/i.test(p2Match[3]);
        if (!answerKeyPart2Map[qId]) answerKeyPart2Map[qId] = {};
        answerKeyPart2Map[qId][letter] = isTrue;
      }

      // 2. Tự động nhận diện môn học nếu trong bài có từ khóa
      if (/hợp chất hữu cơ|hóa học|chưng cất|dung môi|chiết/i.test(text)) {
        const chemSub = subjects.find((s) => /hóa/i.test(s.name) || s.code === 'CHEM');
        if (chemSub) setImportSubjectId(chemSub.id);
      }

      // 3. Phân tách theo từng phần (PHẦN I, PHẦN II, PHẦN III, hoặc PHẦN TRẢ LỜI NGẮN / ĐÚNG SAI / TRẮC NGHIỆM)
      const rawParts = text.split(/(?=(?:(?:PHẦN|Phần)\s*(?:[I|V|X]+|\d+|TRẮC\s*NGHIỆM|ĐÚNG\s*SAI|TRẢ\s*LỜI\s*NGẮN|TỰ\s*LUẬN|ĐIỀN\s*SỐ)))/i);
      const result: ParsedQuestionItem[] = [];
      let questionGlobalIndex = 1;

      for (const part of rawParts) {
        const isExplicitPart2 = /PHẦN\s*(?:II\b|2\b|ĐÚNG\s*SAI)/i.test(part);
        const isExplicitPart3 = /PHẦN\s*(?:III\b|3\b|TRẢ\s*LỜI\s*NGẮN|ĐIỀN\s*SỐ|TỰ\s*LUẬN)/i.test(part);

        // Tách các khối câu hỏi trong phần
        const qBlocks = part
          .split(/(?=(?:Câu|Bài)\s*\d+[\.:])/i)
          .map((b) => b.trim())
          .filter((b) => /^(?:Câu|Bài)\s*\d+[\.:]/i.test(b));

        for (const qBlock of qBlocks) {
          const numMatch = qBlock.match(/^(?:Câu|Bài)\s*(\d+)[\.:]/i);
          const qNum = numMatch ? parseInt(numMatch[1], 10) : questionGlobalIndex;

          const blockWithoutHeader = qBlock.replace(/^(?:Câu|Bài)\s*\d+[\.:]\s*/i, '');

          // Kiểm tra xem có các đáp án A., B., C., D. hay không
          const abcdPattern = /(?:^|[\s\t\n])(\*?)\s*([A-D])[\.\)](?:\s+|$)/g;
          const abcdIndices: { is_correct: boolean; letter: string; startIndex: number; tagIndex: number }[] = [];
          let am;
          while ((am = abcdPattern.exec(blockWithoutHeader)) !== null) {
            abcdIndices.push({
              is_correct: am[1] === '*',
              letter: am[2].toUpperCase(),
              startIndex: am.index + am[0].length,
              tagIndex: am.index,
            });
          }
          const hasABCD = abcdIndices.length >= 2;

          // Kiểm tra xem có các ý đúng sai a), b), c), d) hay không
          const subPattern = /(?:^|[\s\t\n])(\*?)\s*([a-d])[\)\.](?:\s+|$)/gi;
          const subIndices: { hasStar: boolean; letter: string; startIndex: number; tagIndex: number }[] = [];
          let sm;
          while ((sm = subPattern.exec(qBlock)) !== null) {
            subIndices.push({
              hasStar: sm[1] === '*',
              letter: sm[2].toLowerCase(),
              startIndex: sm.index + sm[0].length,
              tagIndex: sm.index,
            });
          }
          const hasSubItems = subIndices.length >= 2;

          // Kiểm tra có câu trả lời ngắn / đáp án điền số hay không
          const ansMatch = qBlock.match(/(?:(?:Đáp\s*án(?:\s*đúng)?|Answer):\s*([^\n\r]+))/i);
          const hasShortAnswer = Boolean(ansMatch);

          // Quyết định dạng câu hỏi thông minh theo từng khối câu
          const isFillInBlank = isExplicitPart3 || (!hasABCD && !hasSubItems && (hasShortAnswer || isExplicitPart3));
          const isTrueFalse = !isFillInBlank && (isExplicitPart2 || (hasSubItems && !hasABCD));

          if (isFillInBlank) {
            // === CÂU HỎI TRẢ LỜI NGẮN / ĐIỀN SỐ ===
            const explMatch = qBlock.match(/(?:Lời\s*giải|Giải\s*thích|Explanation):?([\s\S]*?)(?:Đáp\s*án|$)/i);

            let content = qBlock
              .replace(/^(?:Câu|Bài)\s*\d+[\.:]\s*/i, '')
              .replace(/(?:Lời\s*giải|Giải\s*thích)[\s\S]*$/i, '')
              .replace(/(?:Đáp\s*án(?:\s*đúng)?|Answer):[\s\S]*$/i, '')
              .replace(/\n\s*DẠNG\s*\d+.*$/i, '')
              .trim();

            const correctAns = ansMatch ? ansMatch[1].trim() : '';
            const expl = explMatch ? explMatch[1].trim() : '';

            result.push({
              content,
              question_type: 'fill_in_blank',
              difficulty_level: defaultDiff || 3,
              explanation: expl ? `${expl}\nĐáp án: ${correctAns}` : `Đáp án: ${correctAns}`,
              options: [
                { content: correctAns || 'Đáp án', is_correct: true },
                { content: 'Phương án phụ', is_correct: false },
              ],
            });
          } else if (isTrueFalse) {
            // === CÂU HỎI ĐÚNG / SAI (a, b, c, d) GDPT 2018 ===
            let mainContent = '';
            const subItems: { letter: string; text: string; isCorrect: boolean }[] = [];

            if (subIndices.length >= 2) {
              mainContent = qBlock.substring(0, subIndices[0].tagIndex).replace(/^(?:Câu|Bài)\s*\d+[\.:]\s*/i, '').trim();
              for (let i = 0; i < subIndices.length; i++) {
                const cur = subIndices[i];
                const next = subIndices[i + 1];
                let raw = next ? qBlock.substring(cur.startIndex, next.tagIndex) : qBlock.substring(cur.startIndex);
                raw = raw.trim();

                let isCorrect = cur.hasStar;
                if (/[\(\[]\s*(?:Đúng|Đ|True|T)\s*[\)\]]$/i.test(raw)) {
                  isCorrect = true;
                  raw = raw.replace(/[\(\[]\s*(?:Đúng|Đ|True|T)\s*[\)\]]$/i, '').trim();
                } else if (/[\(\[]\s*(?:Sai|S|False|F)\s*[\)\]]$/i.test(raw)) {
                  isCorrect = false;
                  raw = raw.replace(/[\(\[]\s*(?:Sai|S|False|F)\s*[\)\]]$/i, '').trim();
                }

                subItems.push({
                  letter: cur.letter,
                  text: raw,
                  isCorrect,
                });
              }
            } else {
              // Dự phòng regex theo từng dòng
              const subItemRegex = /(?:^|\n)\s*(\*?)\s*([a-d])[\)\.]\s*([^\n]*)/gi;
              let match;
              mainContent = qBlock.replace(/^(?:Câu|Bài)\s*\d+[\.:]\s*/i, '').split(/(?:^|\n)\s*[a-d][\)\.]/i)[0].trim();

              while ((match = subItemRegex.exec(qBlock)) !== null) {
                let text = match[3].trim();
                let isCorrect = match[1] === '*';
                if (/[\(\[]\s*(?:Đúng|Đ|True|T)\s*[\)\]]$/i.test(text)) {
                  isCorrect = true;
                  text = text.replace(/[\(\[]\s*(?:Đúng|Đ|True|T)\s*[\)\]]$/i, '').trim();
                } else if (/[\(\[]\s*(?:Sai|S|False|F)\s*[\)\]]$/i.test(text)) {
                  isCorrect = false;
                  text = text.replace(/[\(\[]\s*(?:Sai|S|False|F)\s*[\)\]]$/i, '').trim();
                }

                subItems.push({
                  letter: match[2].toLowerCase(),
                  text,
                  isCorrect,
                });
              }
            }

            // Gán đáp án chuẩn từ bảng đáp án Phần II nếu có
            const part2Key = answerKeyPart2Map[qNum];
            if (part2Key) {
              subItems.forEach((item) => {
                if (part2Key[item.letter] !== undefined) {
                  item.isCorrect = part2Key[item.letter];
                }
              });
            }

            const subOptions = subItems.map((item) => ({
              content: `${item.letter}) ${item.text}`,
              is_correct: item.isCorrect,
            }));

            result.push({
              content: mainContent,
              question_type: 'true_false',
              difficulty_level: defaultDiff || 2,
              options:
                subOptions.length >= 2
                  ? subOptions
                  : [
                      { content: 'a) Mệnh đề thứ nhất', is_correct: true },
                      { content: 'b) Mệnh đề thứ hai', is_correct: false },
                      { content: 'c) Mệnh đề thứ ba', is_correct: false },
                      { content: 'd) Mệnh đề thứ tư', is_correct: true },
                    ],
            });
          } else {
            // === CÂU HỎI TRẮC NGHIỆM ĐƠN (A, B, C, D) ===
            if (abcdIndices.length >= 2) {
              const qContent = blockWithoutHeader.substring(0, abcdIndices[0].tagIndex).trim();
              const optMatches: { is_correct: boolean; letter: string; content: string }[] = [];

              for (let i = 0; i < abcdIndices.length; i++) {
                const cur = abcdIndices[i];
                const next = abcdIndices[i + 1];
                const raw = next
                  ? blockWithoutHeader.substring(cur.startIndex, next.tagIndex)
                  : blockWithoutHeader.substring(cur.startIndex);
                optMatches.push({
                  is_correct: cur.is_correct,
                  letter: cur.letter,
                  content: raw.trim(),
                });
              }

              // Nhận diện đáp án đúng theo: Bảng đáp án, hoặc có dấu *, hoặc mặc định A
              const expectedCorrect = answerKeyMap[qNum];
              let hasCorrect = optMatches.some((o) => o.is_correct);

              if (!hasCorrect && expectedCorrect) {
                optMatches.forEach((o) => {
                  if (o.letter === expectedCorrect) o.is_correct = true;
                });
                hasCorrect = true;
              }

              if (!hasCorrect) {
                optMatches[0].is_correct = true;
              }

              result.push({
                content: qContent,
                question_type: 'single_choice',
                difficulty_level: defaultDiff || 1,
                options: optMatches.map((o) => ({
                  content: o.content,
                  is_correct: o.is_correct,
                })),
              });
            }
          }

          questionGlobalIndex++;
        }
      }

      setParsedQuestions(result);
      if (result.length === 0) {
        setParseError('Chưa nhận diện được câu hỏi nào. Vui lòng kiểm tra định dạng file (ví dụ có các câu bắt đầu bằng "Câu 1:").');
      }
    } catch (err: any) {
      setParseError('Lỗi phân tích cú pháp văn bản: ' + err.message);
    }
  };

  // Helper chuyển đổi các khối công thức Office MathML trong Word thành KaTeX $...$
  const convertOMathToLatex = (xml: string) => {
    const getText = (nodeXml: string) => {
      const matches = nodeXml.match(/<m:t[^>]*>([\s\S]*?)<\/m:t>/g) || [];
      return matches.map((m) => m.replace(/<\/?m:t[^>]*>/g, '')).join('');
    };

    // 1. sPre: prescript cho đồng vị hạt nhân (số khối A trên, số hiệu Z dưới, nguyên tố X)
    xml = xml.replace(/<m:sPre[\s\S]*?>([\s\S]*?)<\/m:sPre>/g, (_, inner) => {
      const subMatch = inner.match(/<m:sub>([\s\S]*?)<\/m:sub>/);
      const supMatch = inner.match(/<m:sup>([\s\S]*?)<\/m:sup>/);
      const eMatch = inner.match(/<m:e>([\s\S]*?)<\/m:e>/);
      const sub = subMatch ? getText(subMatch[1]) : '';
      const sup = supMatch ? getText(supMatch[1]) : '';
      const e = eMatch ? getText(eMatch[1]) : '';
      return '{}^{' + sup + '}_{' + sub + '}' + e;
    });

    // 2. sSubSup: vừa có chỉ số dưới vừa có mũ
    xml = xml.replace(/<m:sSubSup[\s\S]*?>([\s\S]*?)<\/m:sSubSup>/g, (_, inner) => {
      const eMatch = inner.match(/<m:e>([\s\S]*?)<\/m:e>/);
      const subMatch = inner.match(/<m:sub>([\s\S]*?)<\/m:sub>/);
      const supMatch = inner.match(/<m:sup>([\s\S]*?)<\/m:sup>/);
      const e = eMatch ? getText(eMatch[1]) : '';
      const sub = subMatch ? getText(subMatch[1]) : '';
      const sup = supMatch ? getText(supMatch[1]) : '';
      return e + '_{' + sub + '}^{' + sup + '}';
    });

    // 3. sSub: chỉ số dưới (vd: H2O, CO2, Cl2)
    xml = xml.replace(/<m:sSub[\s\S]*?>([\s\S]*?)<\/m:sSub>/g, (_, inner) => {
      const eMatch = inner.match(/<m:e>([\s\S]*?)<\/m:e>/);
      const subMatch = inner.match(/<m:sub>([\s\S]*?)<\/m:sub>/);
      const e = eMatch ? getText(eMatch[1]) : '';
      const sub = subMatch ? getText(subMatch[1]) : '';
      return e + '_{' + sub + '}';
    });

    // 4. sSup: chỉ số trên / số mũ (vd: x^2, 2s^2, 2p^6)
    xml = xml.replace(/<m:sSup[\s\S]*?>([\s\S]*?)<\/m:sSup>/g, (_, inner) => {
      const eMatch = inner.match(/<m:e>([\s\S]*?)<\/m:e>/);
      const supMatch = inner.match(/<m:sup>([\s\S]*?)<\/m:sup>/);
      const e = eMatch ? getText(eMatch[1]) : '';
      const sup = supMatch ? getText(supMatch[1]) : '';
      return e + '^{' + sup + '}';
    });

    // 5. f: phân số
    xml = xml.replace(/<m:f[\s\S]*?>([\s\S]*?)<\/m:f>/g, (_, inner) => {
      const numMatch = inner.match(/<m:num>([\s\S]*?)<\/m:num>/);
      const denMatch = inner.match(/<m:den>([\s\S]*?)<\/m:den>/);
      const num = numMatch ? getText(numMatch[1]) : '';
      const den = denMatch ? getText(denMatch[1]) : '';
      return '\\frac{' + num + '}{' + den + '}';
    });

    // 6. rad: căn thức
    xml = xml.replace(/<m:rad[\s\S]*?>([\s\S]*?)<\/m:rad>/g, (_, inner) => {
      const degMatch = inner.match(/<m:deg>([\s\S]*?)<\/m:deg>/);
      const eMatch = inner.match(/<m:e>([\s\S]*?)<\/m:e>/);
      const deg = degMatch ? getText(degMatch[1]) : '';
      const e = eMatch ? getText(eMatch[1]) : '';
      return deg ? '\\sqrt[' + deg + ']{' + e + '}' : '\\sqrt{' + e + '}';
    });

    // 7. Lấy các text còn lại và bỏ các thẻ xml rác
    xml = xml.replace(/<m:t[^>]*>([\s\S]*?)<\/m:t>/g, '$1');
    xml = xml.replace(/<[^>]+>/g, '');
    return xml.trim();
  };

  // Trích xuất văn bản từ file Word bảo toàn 100% công thức Toán / Hóa học
  const extractDocxTextWithMath = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docXmlFile = zip.file('word/document.xml');
      if (!docXmlFile) {
        const res = await mammoth.extractRawText({ arrayBuffer });
        return res.value;
      }

      const xml = await docXmlFile.async('string');

      // Chuyển đổi các khối công thức Office MathML thành KaTeX $...$
      const convertedXml = xml.replace(/<m:oMath[\s\S]*?<\/m:oMath>/g, (m) => {
        const latex = convertOMathToLatex(m);
        if (!latex) return '';
        return '<w:r><w:t xml:space="preserve">$' + latex + '$</w:t></w:r>';
      });

      // Bóc tách từng đoạn văn bản <w:p>
      const pMatches = convertedXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
      const textLines = pMatches
        .map((p) => {
          const tMatches = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
          return tMatches.map((t) => t.replace(/<\/?w:t[^>]*>/g, '')).join('');
        })
        .filter((l) => l.trim().length > 0);

      return textLines.join('\n');
    } catch (err) {
      console.warn('JSZip parse failed, fallback to mammoth:', err);
      const res = await mammoth.extractRawText({ arrayBuffer });
      return res.value;
    }
  };

  // Xử lý đọc File Word trực tiếp bảo toàn công thức Toán/Hóa
  const handleFileSelect = async (file: File) => {
    if (!file.name.match(/\.(docx)$/i)) {
      setParseError('Hệ thống hiện tại hỗ trợ tốt nhất định dạng Word chuẩn .docx');
      return;
    }
    setUploadedFileName(file.name);
    setIsReadingFile(true);
    setParseError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const extractedText = await extractDocxTextWithMath(arrayBuffer);
      setWordRawText(extractedText);
      parseWordText(extractedText, importDefaultDifficulty);
    } catch (err: any) {
      setParseError('Không thể đọc file Word: ' + err.message);
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleWordTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setWordRawText(val);
    parseWordText(val, importDefaultDifficulty);
  };

  const handleJsonTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonRawText(val);
    setParseError(null);
    if (!val.trim()) {
      setParsedQuestions([]);
      return;
    }
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        setParsedQuestions(parsed);
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        setParsedQuestions(parsed.questions);
      } else {
        setParseError('Định dạng JSON không hợp lệ: Cần là mảng danh sách câu hỏi [ ... ]');
      }
    } catch (err: any) {
      setParseError('Cú pháp JSON lỗi: ' + err.message);
    }
  };

  // Cho phép giáo viên bấm đổi đáp án đúng trực tiếp trong danh sách xem trước
  const handleTogglePreviewCorrect = (qIndex: number, optIndex: number) => {
    setParsedQuestions((prev) => {
      const next = [...prev];
      const targetQ = { ...next[qIndex] };
      const newOpts = [...targetQ.options];
      newOpts[optIndex] = { ...newOpts[optIndex], is_correct: !newOpts[optIndex].is_correct };
      targetQ.options = newOpts;
      next[qIndex] = targetQ;
      return next;
    });
  };

  // Chọn Đúng hoặc Sai cho câu hỏi Đúng / Sai trong bảng xem trước
  const handleSetPreviewTrueFalse = (qIndex: number, optIndex: number, isTrue: boolean) => {
    setParsedQuestions((prev) => {
      const next = [...prev];
      const targetQ = { ...next[qIndex] };
      const newOpts = [...targetQ.options];
      newOpts[optIndex] = { ...newOpts[optIndex], is_correct: isTrue };
      targetQ.options = newOpts;
      next[qIndex] = targetQ;
      return next;
    });
  };

  // Gửi hàng loạt câu hỏi đã trích xuất lên Backend
  const handleImportSubmit = async () => {
    if (parsedQuestions.length === 0) return;
    setIsImporting(true);
    try {
      const payload = {
        subject_id: importSubjectId,
        questions: parsedQuestions.map((q) => ({
          subject_id: importSubjectId,
          question_type: q.question_type || 'single_choice',
          difficulty_level: q.difficulty_level || importDefaultDifficulty,
          content: q.content,
          explanation: q.explanation || null,
          options: q.options || [],
        })),
      };

      const res: any = await api.post('/questions/import', payload);
      if (res.success) {
        alert(`Nhập thành công ${res.count || parsedQuestions.length} câu hỏi vào ngân hàng đề thi!`);
        setShowImportModal(false);
        setParsedQuestions([]);
        setWordRawText('');
        setJsonRawText('');
        setUploadedFileName(null);
        fetchQuestions();
      } else {
        alert('Lỗi: ' + (res.message || 'Không thể lưu câu hỏi'));
      }
    } catch (err: any) {
      alert('Lỗi khi gửi dữ liệu nhập: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsImporting(false);
    }
  };

  // Mở modal tạo mới câu hỏi
  const handleOpenCreate = () => {
    setEditingQuestionId(null);
    setContent('');
    setExplanation('');
    setFillBlankAnswer('');
    setQuestionType('single_choice');
    setDifficultyLevel(1);
    setOptions([
      { content: '', is_correct: true },
      { content: '', is_correct: false },
      { content: '', is_correct: false },
      { content: '', is_correct: false },
    ]);
    setActiveField({ id: 'content', name: 'Nội dung câu hỏi' });
    setShowModal(true);
  };

  // Mở modal chỉnh sửa câu hỏi có sẵn
  const handleOpenEdit = (q: Question) => {
    setEditingQuestionId(q.id);
    setContent(q.content);
    setExplanation(q.explanation || '');
    setQuestionType(q.question_type);
    setDifficultyLevel(q.difficulty_level);

    if (q.question_type === 'fill_in_blank') {
      const correctOpt = q.options?.find((o) => o.is_correct);
      setFillBlankAnswer(correctOpt?.content || '');
    } else {
      if (q.options && q.options.length > 0) {
        setOptions(
          q.options.map((o) => ({
            content: o.content,
            is_correct: Boolean(o.is_correct),
          }))
        );
      } else {
        setOptions([
          { content: '', is_correct: true },
          { content: '', is_correct: false },
          { content: '', is_correct: false },
          { content: '', is_correct: false },
        ]);
      }
    }
    setActiveField({ id: 'content', name: 'Nội dung câu hỏi' });
    setShowModal(true);
  };

  // Hàm chèn ký hiệu / công thức toán học từ MathToolbar vào con trỏ của trường đang active
  const handleInsertMath = (snippet: string) => {
    let targetEl: HTMLInputElement | HTMLTextAreaElement | null = null;
    let currentVal = '';

    if (activeField.id === 'content') {
      targetEl = contentRef.current;
      currentVal = content;
    } else if (activeField.id === 'explanation') {
      targetEl = explanationRef.current;
      currentVal = explanation;
    } else if (activeField.id === 'fill_blank') {
      targetEl = fillBlankRef.current;
      currentVal = fillBlankAnswer;
    } else if (activeField.id.startsWith('opt_')) {
      const idx = parseInt(activeField.id.replace('opt_', ''), 10);
      targetEl = optionRefs.current[idx];
      currentVal = options[idx]?.content || '';
    }

    const start = targetEl ? targetEl.selectionStart ?? currentVal.length : currentVal.length;
    const end = targetEl ? targetEl.selectionEnd ?? currentVal.length : currentVal.length;

    // Kiểm tra xem vị trí con trỏ có đang nằm trong cặp dấu $...$ hay không
    const before = currentVal.substring(0, start);
    const after = currentVal.substring(end);
    const dollarCountBefore = (before.match(/\$/g) || []).length;
    const isInsideMath = dollarCountBefore % 2 === 1;

    // Nếu đã ở trong $...$, chèn trực tiếp snippet. Nếu ở ngoài, tự động bọc $snippet$
    const textToInsert = isInsideMath ? snippet : `$${snippet}$`;
    const newVal = before + textToInsert + after;

    if (activeField.id === 'content') setContent(newVal);
    else if (activeField.id === 'explanation') setExplanation(newVal);
    else if (activeField.id === 'fill_blank') setFillBlankAnswer(newVal);
    else if (activeField.id.startsWith('opt_')) {
      const idx = parseInt(activeField.id.replace('opt_', ''), 10);
      const newOpts = [...options];
      if (newOpts[idx]) {
        newOpts[idx] = { ...newOpts[idx], content: newVal };
        setOptions(newOpts);
      }
    }

    setTimeout(() => {
      if (targetEl) {
        targetEl.focus();
        const newPos = start + textToInsert.length;
        targetEl.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleDuplicate = async (id: number) => {
    try {
      const res: any = await api.post(`/questions/${id}/duplicate`);
      if (res.success) {
        fetchQuestions();
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi nhân bản');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return;
    try {
      const res: any = await api.delete(`/questions/${id}`);
      if (res.success) {
        fetchQuestions();
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi xóa câu hỏi');
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const newOpts = [...options];
    newOpts[idx].content = val;
    setOptions(newOpts);
  };

  const handleCorrectChange = (idx: number) => {
    if (questionType === 'single_choice') {
      const newOpts = options.map((opt, i) => ({
        ...opt,
        is_correct: i === idx,
      }));
      setOptions(newOpts);
    } else {
      const newOpts = [...options];
      newOpts[idx].is_correct = !newOpts[idx].is_correct;
      setOptions(newOpts);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalOptions = options;
      if (questionType === 'fill_in_blank') {
        finalOptions = [
          { content: fillBlankAnswer || '0', is_correct: true },
          { content: 'Phương án phụ', is_correct: false },
        ];
      }

      const payload = {
        subject_id: importSubjectId || 1,
        question_type: questionType,
        difficulty_level: difficultyLevel,
        content,
        explanation,
        options: finalOptions,
      };

      if (editingQuestionId) {
        const res: any = await api.put(`/questions/${editingQuestionId}`, payload);
        if (res.success) {
          setShowModal(false);
          setEditingQuestionId(null);
          setContent('');
          setExplanation('');
          setFillBlankAnswer('');
          fetchQuestions();
        }
      } else {
        const res: any = await api.post('/questions', payload);
        if (res.success) {
          setShowModal(false);
          setContent('');
          setExplanation('');
          setFillBlankAnswer('');
          fetchQuestions();
        }
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi lưu câu hỏi');
    }
  };

  const getDifficultyBadge = (level: number) => {
    switch (level) {
      case 1:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Nhận biết</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">Thông hiểu</span>;
      case 3:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">Vận dụng</span>;
      case 4:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">Vận dụng cao</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ngân Hàng Câu Hỏi & Đề Thi</h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý kho câu hỏi trắc nghiệm, đúng sai và tự luận theo chuẩn GDPT 2018. Hỗ trợ biểu thức Toán/Hóa học KaTeX.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Nút Nhập từ file Word */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <FileUp className="w-4 h-4" />
            Nhập từ File Word (.docx)
          </button>

          {/* Nút Tạo câu hỏi mới */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Soạn câu hỏi mới
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        {/* Hàng 1: Thanh tìm kiếm */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm nội dung câu hỏi (hỗ trợ tìm công thức KaTeX)..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors shadow-2xs"
          >
            Tìm kiếm
          </button>
        </form>

        {/* Hàng 2: Các bộ lọc đa tiêu chí & Cấu hình phân trang */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bộ lọc:</span>
          </div>

          {/* Môn học */}
          <select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Tất cả môn học</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Dạng câu hỏi */}
          <select
            value={questionTypeFilter}
            onChange={(e) => {
              setQuestionTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Tất cả loại câu hỏi</option>
            <option value="single_choice">Trắc nghiệm đơn</option>
            <option value="true_false">Đúng / Sai (GDPT 2018)</option>
            <option value="fill_in_blank">Trả lời ngắn / Điền số</option>
          </select>

          {/* Mức độ nhận thức */}
          <select
            value={difficultyFilter}
            onChange={(e) => {
              setDifficultyFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Tất cả mức độ</option>
            <option value="1">Mức 1: Nhận biết</option>
            <option value="2">Mức 2: Thông hiểu</option>
            <option value="3">Mức 3: Vận dụng</option>
            <option value="4">Mức 4: Vận dụng cao</option>
          </select>

          {/* Chọn số lượng hiển thị trên 1 trang */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-slate-400 hidden sm:inline">Hiển thị:</span>
            <select
              value={perPage}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPerPage(val);
                setCurrentPage(1);
              }}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="20">20 câu / trang</option>
              <option value="50">50 câu / trang</option>
              <option value="100">100 câu / trang</option>
              <option value="-1">Tất cả câu hỏi</option>
            </select>

            <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg shrink-0">
              Tổng: {totalQuestions} câu
            </span>
          </div>
        </div>
      </div>

      {/* List Questions */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Đang tải danh sách câu hỏi...</div>
      ) : questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="min-w-6 h-6 px-1.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                    {(currentPage - 1) * (perPage === -1 ? totalQuestions : perPage) + idx + 1}
                  </span>
                  {getDifficultyBadge(q.difficulty_level)}
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {q.question_type === 'fill_in_blank'
                      ? 'Trả lời ngắn / Điền số'
                      : q.question_type === 'true_false'
                      ? 'Đúng / Sai'
                      : 'Trắc nghiệm đơn'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(q)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    title="Chỉnh sửa câu hỏi (Nội dung, công thức, đáp án Đúng/Sai)"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(q.id)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    title="Nhân bản câu hỏi"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Xóa câu hỏi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content rendering KaTeX */}
              <div className="text-sm font-medium text-slate-800">
                <MathRenderer content={q.content} />
              </div>

              {/* Options */}
              {q.question_type === 'true_false' ? (
                <div className="space-y-3 pt-2">
                  {/* Đường kẻ phân cách Chọn đúng hoặc sai */}
                  <div className="relative flex py-1 items-center">
                    <div className="grow border-t border-slate-200" />
                    <span className="shrink mx-3 text-[11px] font-semibold text-slate-400">
                      Chọn đúng hoặc sai
                    </span>
                    <div className="grow border-t border-slate-200" />
                  </div>

                  <div className="space-y-2">
                    {q.options?.map((opt, oIdx) => {
                      const letterPrefix = opt.content.match(/^[a-d][\)\.]/i)
                        ? opt.content.substring(0, 2)
                        : String.fromCharCode(97 + oIdx) + ')';
                      const rawText = opt.content.replace(/^[a-d][\)\.]\s*/i, '');

                      return (
                        <div key={opt.id} className="flex items-center gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0 p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-800 text-xs font-medium leading-relaxed">
                            <span className="font-bold text-slate-900 mr-1.5">{letterPrefix}</span>
                            <MathRenderer content={rawText} className="inline" />
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div
                              className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center ${
                                opt.is_correct
                                  ? 'bg-amber-500 text-white border-2 border-amber-500 shadow-xs'
                                  : 'bg-white border-2 border-slate-300 text-slate-400'
                              }`}
                            >
                              Đúng
                            </div>
                            <div
                              className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center ${
                                !opt.is_correct
                                  ? 'bg-amber-500 text-white border-2 border-amber-500 shadow-xs'
                                  : 'bg-white border-2 border-slate-300 text-slate-400'
                              }`}
                            >
                              Sai
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : q.question_type === 'fill_in_blank' ? (
                <div className="pt-2">
                  <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2 text-xs">
                    <span className="font-semibold text-emerald-800">Đáp án chính xác:</span>
                    <span className="font-mono font-bold text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-300 shadow-2xs">
                      {q.options?.find((o) => o.is_correct)?.content || 'Chưa thiết lập'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {q.options?.map((opt, oIdx) => (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
                        opt.is_correct
                          ? 'border-emerald-300 bg-emerald-50/50 text-emerald-950 font-medium'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <div className="flex-1">
                        <MathRenderer content={opt.content} />
                      </div>
                      {opt.is_correct && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Explanation */}
              {q.explanation && (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-900">
                  <span className="font-bold text-indigo-950">Giải thích chi tiết: </span>
                  <MathRenderer content={q.explanation} className="mt-1" />
                </div>
              )}
            </div>
          ))}

          {/* Phân trang câu hỏi */}
          {totalPages > 1 && perPage !== -1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs">
              <div className="text-slate-500">
                Hiển thị từ <span className="font-semibold text-slate-800">{(currentPage - 1) * perPage + 1}</span> đến{' '}
                <span className="font-semibold text-slate-800">{Math.min(currentPage * perPage, totalQuestions)}</span> trong tổng số{' '}
                <span className="font-semibold text-indigo-600">{totalQuestions}</span> câu hỏi
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Trước</span>
                </button>

                {/* Danh sách trang */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, pIdx, arr) => {
                      const prevPage = arr[pIdx - 1];
                      const hasGap = prevPage && page - prevPage > 1;

                      return (
                        <React.Fragment key={page}>
                          {hasGap && <span className="px-1 text-slate-400">...</span>}
                          <button
                            type="button"
                            onClick={() => handlePageChange(page)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors ${
                              currentPage === page
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer font-medium"
                >
                  <span>Sau</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="font-medium text-sm">Chưa có câu hỏi nào trong ngân hàng</p>
          <p className="text-xs text-slate-400 mt-1">Bấm nút "Nhập từ File Word (.docx)" hoặc "Soạn câu hỏi mới" ở trên để bắt đầu.</p>
        </div>
      )}

      {/* ================= MODAL SOẠN 1 CÂU HỎI THỦ CÔNG / CHỈNH SỬA ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingQuestionId ? `Chỉnh Sửa Câu Hỏi #${editingQuestionId}` : 'Soạn Thảo Câu Hỏi Mới'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingQuestionId
                    ? 'Cập nhật nội dung câu hỏi, công thức Toán/Hóa và phương án đáp án'
                    : 'Thêm câu hỏi mới vào ngân hàng đề thi với thanh công cụ ký hiệu Toán chuẩn Word'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              {/* Dạng câu hỏi & Mức độ nhận thức */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dạng câu hỏi</label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="single_choice">Trắc nghiệm 1 đáp án đúng (A, B, C, D)</option>
                    <option value="multiple_choice">Trắc nghiệm nhiều đáp án đúng</option>
                    <option value="true_false">Đúng / Sai (GDPT 2018 - 4 mệnh đề a, b, c, d)</option>
                    <option value="fill_in_blank">Trả lời ngắn / Điền số (GDPT 2018)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức độ nhận thức (Ma trận đề)</label>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>Mức 1: Nhận biết</option>
                    <option value={2}>Mức 2: Thông hiểu</option>
                    <option value={3}>Mức 3: Vận dụng</option>
                    <option value={4}>Mức 4: Vận dụng cao</option>
                  </select>
                </div>
              </div>

              {/* ================= THANH CÔNG CỤ TOÁN HỌC CHUẨN WORD ================= */}
              <MathToolbar onInsert={handleInsertMath} activeTargetName={activeField.name} />

              {/* Ô nhập nội dung câu hỏi */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Nội dung câu hỏi (Click các nút trên thanh công cụ để chèn ký hiệu Toán/Hóa nhanh) *
                  </label>
                  {activeField.id === 'content' && (
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      ● Đang soạn thảo
                    </span>
                  )}
                </div>
                <textarea
                  ref={contentRef}
                  rows={3}
                  required
                  value={content}
                  onFocus={() => setActiveField({ id: 'content', name: 'Nội dung câu hỏi' })}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ví dụ: Cho hàm số $y = \frac{x^3 - 3x + 1}{\sqrt{x}}$, tính giá trị của $y'(1)$?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                />
                {content && (
                  <div className="mt-2 p-3 bg-slate-100/80 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Xem trước trực quan (KaTeX Live Preview):
                    </p>
                    <MathRenderer content={content} className="text-slate-900 font-medium" />
                  </div>
                )}
              </div>

              {/* Khu vực Các phương án đáp án tùy theo dạng câu hỏi */}
              {questionType === 'fill_in_blank' ? (
                /* === DẠNG TRẢ LỜI NGẮN / ĐIỀN SỐ === */
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-emerald-950">
                      Đáp án chính xác của câu hỏi (Học sinh sẽ điền số hoặc từ ngữ này để tự động chấm điểm) *
                    </label>
                    {activeField.id === 'fill_blank' && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                        ● Đang soạn thảo
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    ref={fillBlankRef}
                    onFocus={() => setActiveField({ id: 'fill_blank', name: 'Đáp án điền số' })}
                    value={fillBlankAnswer}
                    onChange={(e) => setFillBlankAnswer(e.target.value)}
                    placeholder="Ví dụ: 6 hoặc 18 hoặc 0,32 hoặc H2O..."
                    className="w-full bg-white border border-emerald-300 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-200 font-mono"
                  />
                  {fillBlankAnswer && (
                    <div className="flex items-center gap-2 text-xs text-emerald-800 pt-1">
                      <span className="font-semibold">Xem trước đáp án:</span>
                      <MathRenderer content={fillBlankAnswer} className="font-bold bg-white px-2 py-0.5 rounded border border-emerald-200" />
                    </div>
                  )}
                </div>
              ) : questionType === 'true_false' ? (
                /* === DẠNG ĐÚNG / SAI (a, b, c, d) GDPT 2018 === */
                <div className="space-y-3">
                  <div className="relative flex py-1 items-center">
                    <div className="grow border-t border-slate-200" />
                    <span className="shrink mx-3 text-xs font-semibold text-slate-500">
                      4 Mệnh đề Đúng / Sai (Chuẩn GDPT 2018 - Chọn Đúng hoặc Sai cho từng ý)
                    </span>
                    <div className="grow border-t border-slate-200" />
                  </div>

                  <div className="space-y-2.5">
                    {options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                          {String.fromCharCode(97 + oIdx)})
                        </span>
                        <input
                          type="text"
                          required
                          ref={(el) => {
                            optionRefs.current[oIdx] = el;
                          }}
                          value={opt.content}
                          onFocus={() =>
                            setActiveField({
                              id: `opt_${oIdx}`,
                              name: `Mệnh đề ${String.fromCharCode(97 + oIdx)}`,
                            })
                          }
                          onChange={(e) => handleOptionChange(oIdx, e.target.value)}
                          placeholder={`Nội dung mệnh đề ${String.fromCharCode(97 + oIdx)} (có thể chứa công thức toán)`}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:bg-white focus:border-indigo-500 focus:outline-none"
                        />

                        {/* 2 nút tròn Đúng & Sai kiểu Azota */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = [...options];
                              newOpts[oIdx].is_correct = true;
                              setOptions(newOpts);
                            }}
                            className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer transition-all select-none ${
                              opt.is_correct
                                ? 'bg-amber-500 text-white border-2 border-amber-500 shadow-xs scale-105'
                                : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400'
                            }`}
                            title="Đánh dấu ý này là ĐÚNG"
                          >
                            Đúng
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = [...options];
                              newOpts[oIdx].is_correct = false;
                              setOptions(newOpts);
                            }}
                            className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center cursor-pointer transition-all select-none ${
                              !opt.is_correct
                                ? 'bg-amber-500 text-white border-2 border-amber-500 shadow-xs scale-105'
                                : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400'
                            }`}
                            title="Đánh dấu ý này là SAI"
                          >
                            Sai
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* === DẠNG TRẮC NGHIỆM ĐƠN / NHIỀU ĐÁP ÁN (A, B, C, D) === */
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700">
                    {questionType === 'single_choice'
                      ? 'Các phương án lựa chọn (Click vào chữ cái A, B, C, D để chọn đáp án đúng):'
                      : 'Các phương án lựa chọn (Click vào chữ cái để chọn các đáp án đúng):'}
                  </label>
                  {options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCorrectChange(oIdx)}
                        className={`w-8 h-8 rounded-xl font-bold text-xs shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                          opt.is_correct
                            ? 'bg-emerald-600 text-white shadow-xs border-2 border-emerald-600 scale-105'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title={opt.is_correct ? 'Đáp án đúng' : 'Đánh dấu đáp án đúng'}
                      >
                        {String.fromCharCode(65 + oIdx)}
                      </button>
                      <input
                        type="text"
                        required
                        ref={(el) => {
                          optionRefs.current[oIdx] = el;
                        }}
                        value={opt.content}
                        onFocus={() =>
                          setActiveField({
                            id: `opt_${oIdx}`,
                            name: `Phương án ${String.fromCharCode(65 + oIdx)}`,
                          })
                        }
                        onChange={(e) => handleOptionChange(oIdx, e.target.value)}
                        placeholder={`Nội dung phương án ${String.fromCharCode(65 + oIdx)} (có thể chứa LaTeX như $y' = 3x^2$)`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:border-indigo-500 focus:outline-none"
                      />
                      {opt.is_correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                  ))}
                </div>
              )}

              {/* Giải thích đáp án chi tiết */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Giải thích đáp án chi tiết (Hiển thị cho học sinh khi xem lại bài thi)
                  </label>
                  {activeField.id === 'explanation' && (
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      ● Đang soạn thảo
                    </span>
                  )}
                </div>
                <textarea
                  ref={explanationRef}
                  rows={2}
                  value={explanation}
                  onFocus={() => setActiveField({ id: 'explanation', name: 'Giải thích chi tiết' })}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Lời giải thích chi tiết, bước giải phương trình, phương pháp giải..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Nút hành động Lưu / Hủy */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {editingQuestionId ? 'Cập Nhật Câu Hỏi' : 'Lưu vào Ngân hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL IMPORT FILE WORD / TEXT / JSON ================= */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Nhập Đề Thi Tự Động Vào Ngân Hàng</h3>
                  <p className="text-xs text-slate-500">
                    Hỗ trợ file Word (.docx), trích xuất tự động Đề thi GDPT 2018 (Trắc nghiệm, Đúng/Sai, Trả lời ngắn)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Chọn Môn học & Mức độ nhận thức */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Môn học mục tiêu:</label>
                <select
                  value={importSubjectId}
                  onChange={(e) => setImportSubjectId(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mức độ nhận thức mặc định:</label>
                <select
                  value={importDefaultDifficulty}
                  onChange={(e) => {
                    const diff = Number(e.target.value);
                    setImportDefaultDifficulty(diff);
                    if (wordRawText) parseWordText(wordRawText, diff);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value={1}>Mức 1: Nhận biết</option>
                  <option value={2}>Mức 2: Thông hiểu</option>
                  <option value={3}>Mức 3: Vận dụng</option>
                  <option value={4}>Mức 4: Vận dụng cao</option>
                </select>
              </div>
            </div>

            {/* Tabs: Chọn File Word / Dán Text / JSON */}
            <div className="flex border-b border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setImportTab('word_file')}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
                  importTab === 'word_file'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileUp className="w-4 h-4" />
                1. Tải lên File Word (.docx)
              </button>

              <button
                type="button"
                onClick={() => setImportTab('word_text')}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
                  importTab === 'word_text'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                2. Dán Nội Dung Văn Bản Word
              </button>

              <button
                type="button"
                onClick={() => setImportTab('json')}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
                  importTab === 'json'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Code className="w-4 h-4" />
                3. Nhập Chuỗi JSON
              </button>
            </div>

            {/* Nội dung từng Tab */}
            {importTab === 'word_file' && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50'
                    : uploadedFileName
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <FileUp className="w-6 h-6" />
                </div>
                {isReadingFile ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-semibold">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang bóc tách văn bản và công thức từ file Word...</span>
                  </div>
                ) : uploadedFileName ? (
                  <div>
                    <p className="font-bold text-slate-800 text-xs">File đã chọn: {uploadedFileName}</p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                      Nhấp để chọn file khác hoặc xem trước kết quả bên dưới
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-slate-800 text-xs">
                      Kéo thả file Word (.docx) vào đây, hoặc click để chọn từ máy tính
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Hệ thống tự động nhận diện cả 3 phần: Trắc nghiệm $A, B, C, D$, Đúng/Sai $a), b), c), d)$, và Trả lời ngắn
                    </p>
                  </div>
                )}
              </div>
            )}

            {importTab === 'word_text' && (
              <div className="space-y-2">
                <textarea
                  rows={8}
                  value={wordRawText}
                  onChange={handleWordTextChange}
                  placeholder="Dán toàn bộ nội dung đề thi từ Word vào đây..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>
            )}

            {importTab === 'json' && (
              <div className="space-y-2">
                <textarea
                  rows={8}
                  value={jsonRawText}
                  onChange={handleJsonTextChange}
                  placeholder={`[
  {
    "content": "Tính $y = \\\\sqrt{x}$",
    "difficulty_level": 1,
    "question_type": "single_choice",
    "options": [
      { "content": "Đáp án A", "is_correct": true },
      { "content": "Đáp án B", "is_correct": false }
    ]
  }
]`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {parseError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Xem trước kết quả bóc tách */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-xs text-slate-800">
                    Kết quả trích xuất tự động: {parsedQuestions.length} câu hỏi
                  </span>
                </div>
                {parsedQuestions.length > 0 && (
                  <span className="text-[11px] text-slate-500">
                    (Kiểm tra và click để điều chỉnh đáp án Đúng/Sai trực tiếp bên dưới)
                  </span>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-3 space-y-3 bg-slate-50/50">
                {parsedQuestions.length > 0 ? (
                  parsedQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Câu {qIdx + 1}:</span>
                          <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {q.question_type === 'fill_in_blank'
                              ? 'Trả lời ngắn / Điền số'
                              : q.question_type === 'true_false'
                              ? 'Đúng / Sai'
                              : 'Trắc nghiệm đơn'}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          Mức {q.difficulty_level}
                        </span>
                      </div>
                      <div className="text-xs text-slate-800 font-medium leading-relaxed">
                        <MathRenderer content={q.content} />
                      </div>

                      {/* Các phương án lựa chọn */}
                      {q.question_type === 'true_false' ? (
                        <div className="space-y-3 pt-2">
                          {/* Đường kẻ phân cách Chọn đúng hoặc sai */}
                          <div className="relative flex py-2 items-center">
                            <div className="grow border-t border-slate-200" />
                            <span className="shrink mx-4 text-xs font-semibold text-slate-500">
                              Chọn đúng hoặc sai
                            </span>
                            <div className="grow border-t border-slate-200" />
                          </div>

                          <div className="space-y-2.5">
                            {q.options.map((opt, oIdx) => {
                              const letterPrefix = opt.content.match(/^[a-d][\)\.]/i)
                                ? opt.content.substring(0, 2)
                                : String.fromCharCode(97 + oIdx) + ')';
                              const rawText = opt.content.replace(/^[a-d][\)\.]\s*/i, '');

                              return (
                                <div key={oIdx} className="flex items-center gap-2 sm:gap-3">
                                  {/* Khung nội dung mệnh đề bên trái */}
                                  <div className="flex-1 min-w-0 p-3 sm:p-3.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs sm:text-sm font-medium leading-relaxed shadow-2xs">
                                    <span className="font-bold text-slate-900 mr-1.5">{letterPrefix}</span>
                                    <MathRenderer content={rawText} className="inline" />
                                  </div>

                                  {/* 2 nút tròn bên hông: Đúng & Sai */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleSetPreviewTrueFalse(qIdx, oIdx, true)}
                                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full font-bold text-xs sm:text-sm cursor-pointer select-none transition-all flex items-center justify-center ${
                                        opt.is_correct
                                          ? 'bg-amber-500 border-2 border-amber-500 text-white shadow-xs'
                                          : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                      }`}
                                      title="Chọn ý này là ĐÚNG"
                                    >
                                      Đúng
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleSetPreviewTrueFalse(qIdx, oIdx, false)}
                                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full font-bold text-xs sm:text-sm cursor-pointer select-none transition-all flex items-center justify-center ${
                                        !opt.is_correct
                                          ? 'bg-amber-500 border-2 border-amber-500 text-white shadow-xs'
                                          : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                      }`}
                                      title="Chọn ý này là SAI"
                                    >
                                      Sai
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : q.question_type === 'fill_in_blank' ? (
                        <div className="pt-2">
                          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2 text-xs">
                            <span className="font-semibold text-emerald-800">Đáp án trích xuất:</span>
                            <span className="font-mono font-bold text-emerald-950 bg-white px-2.5 py-1 rounded border border-emerald-300 shadow-2xs">
                              {q.options?.find((o) => o.is_correct)?.content || ''}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleTogglePreviewCorrect(qIdx, oIdx)}
                              className={`p-2 rounded-lg border text-left text-xs flex items-center gap-2 transition-all ${
                                opt.is_correct
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  opt.is_correct ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <div className="flex-1 truncate">
                                <MathRenderer content={opt.content} />
                              </div>
                              {opt.is_correct && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}

                      {q.explanation && (
                        <p className="text-[11px] text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100">
                          <span className="font-bold">Lời giải: </span>
                          <MathRenderer content={q.explanation} />
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs space-y-2">
                    <p>Chưa có câu hỏi nào được trích xuất. Hãy chọn file Word (.docx) ở trên!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={parsedQuestions.length === 0 || isImporting}
                onClick={handleImportSubmit}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-40 cursor-pointer"
              >
                {isImporting ? 'Đang lưu vào ngân hàng...' : `Lưu tất cả ${parsedQuestions.length} câu hỏi vào Ngân Hàng`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
