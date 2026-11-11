export interface ParsedQuestion {
  content: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'short_answer';
  difficulty_level: number;
  explanation?: string;
  points?: number;
  options: Array<{
    content: string;
    is_correct: boolean;
  }>;
  group_type?: 'part1' | 'part2' | 'part3' | 'part4';
}

export interface ParsedExamResult {
  title: string;
  school_name?: string;
  department_name?: string;
  duration_minutes?: number;
  grade_name?: string;
  subject_name?: string;
  questions: ParsedQuestion[];
  groups: {
    part1: ParsedQuestion[]; // Nhiều lựa chọn (A, B, C, D)
    part2: ParsedQuestion[]; // Đúng / Sai (a, b, c, d)
    part3: ParsedQuestion[]; // Trả lời ngắn / Điền số
    part4: ParsedQuestion[]; // Tự luận
  };
  totalCount: number;
}

export const parseExamText = (rawText: string, defaultDiff = 1): ParsedExamResult => {
  const result: ParsedQuestion[] = [];

  // Chuẩn hóa dòng và khoảng trắng
  const cleanText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .trim();

  // 1. Trích xuất metadata từ phần đầu đề thi nếu có (Trường, Tổ, Kỳ kiểm tra, Môn, Thời gian)
  let extractedTitle = 'Đề thi từ file Word';
  let schoolName = '';
  let deptName = '';
  let durationMinutes = 45;
  let gradeName = '';
  let subjectName = '';

  const headerBoundary = cleanText.search(/(?:PHẦN\s*(?:[I|V|X]+|\d+)[\.:\s]|(?:^|[\n\r])\s*Câu\s*1[\.:])/i);
  const headerText = headerBoundary !== -1 ? cleanText.substring(0, headerBoundary) : cleanText.substring(0, 500);

  const schoolMatch = headerText.match(/(?:TRƯỜNG\s+[^\n\r\|<]+)/i);
  if (schoolMatch) schoolName = schoolMatch[0].trim();

  const deptMatch = headerText.match(/(?:TỔ\s+[A-ZÀ-Ỹ\s]+)/i);
  if (deptMatch) deptName = deptMatch[0].trim();

  const titleMatch = headerText.match(/(?:(?:KỲ\s*KIỂM\s*TRA|ĐỀ\s*KIỂM\s*TRA|BÀI\s*KIỂM\s*TRA|KIỂM\s*TRA)[^\n\r\|<]+)/i);
  if (titleMatch) {
    extractedTitle = titleMatch[0]
      .replace(/Thời\s*gian.*$/i, '')
      .replace(/[-–_\s]+$/, '')
      .trim();
  }

  const durationMatch = headerText.match(/Thời\s*gian(?:\s*làm\s*bài)?:\s*(\d+)\s*phút/i);
  if (durationMatch) durationMinutes = parseInt(durationMatch[1], 10);

  const gradeMatch = headerText.match(/(?:KHỐI|LỚP)\s*(10|11|12)\b/i) || headerText.match(/\b(10|11|12)\b/);
  if (gradeMatch) gradeName = `Khối ${gradeMatch[1]}`;

  const subjectMatch = headerText.match(/(?:MÔN|Môn)\s*([A-ZÀ-Ỹa-zà-ỹ\s]+?)(?=\s*(?:KHỐI|Thời gian|\n|\r|$))/i)
    || headerText.match(/(HÓA HỌC|TOÁN HỌC|TOÁN|VẬT LÝ|VẬT LÍ|SINH HỌC|LỊCH SỬ|ĐỊA LÝ|ĐỊA LÍ|GDCD|TIẾNG ANH|TIN HỌC|NGỮ VĂN)/i);
  if (subjectMatch) subjectName = subjectMatch[1].trim();

  // 2. Tách phần HƯỚNG DẪN CHẤM / BẢNG ĐÁP ÁN ở cuối file
  let questionText = cleanText;
  let guideText = '';
  const guideSplitMatch = cleanText.search(/(?:HƯỚNG\s*DẪN\s*CHẤM|ĐÁP\s*ÁN\s*CHI\s*TIẾT|BẢNG\s*ĐÁP\s*ÁN\s*CÁC\s*MÃ\s*ĐỀ)/i);
  if (guideSplitMatch !== -1) {
    questionText = cleanText.substring(0, guideSplitMatch);
    guideText = cleanText.substring(guideSplitMatch);
  }

  // 3. Nếu file chứa nhiều mã đề (Mã đề 001, Mã đề 002...), chỉ lấy mã đề đầu tiên để tránh trùng lặp
  const secondCodeMatch = questionText.search(/(?:Mã\s*đề\s*(?:002|02|102|003|004|B|C|D))/i);
  if (secondCodeMatch !== -1) {
    questionText = questionText.substring(0, secondCodeMatch);
  }

  // 4. Bóc tách ma trận đáp án từ HƯỚNG DẪN CHẤM
  const p1AnswerMap: Record<number, string> = {};
  const p2AnswerMap: Record<string, boolean> = {};
  const p3AnswerMap: Record<number, string> = {};
  const p4AnswerMap: Record<number, { explanation: string; points: number }> = {};

  if (guideText) {
    // 4.1. Phần 1: Trắc nghiệm 4 lựa chọn (A, B, C, D)
    const p1Section = guideText.match(/(?:Phần\s*1|I\.\s*Phần)[\s\S]*?(?=(?:Phần\s*2|II\.\s*Phần|$))/i);
    if (p1Section) {
      const lines = p1Section[0].split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*\|?\s*(\d+)\s*\|\s*([A-D])\b/i) || line.match(/^\s*(\d+)[\t\s]+([A-D])\b/i);
        if (match) {
          p1AnswerMap[parseInt(match[1], 10)] = match[2].toUpperCase();
        }
      }
    }

    // 4.2. Phần 2: Đúng / Sai (a, b, c, d)
    const p2Section = guideText.match(/(?:Phần\s*2|II\.\s*Phần)[\s\S]*?(?=(?:Phần\s*3|III\.\s*Phần|$))/i);
    if (p2Section) {
      const lines = p2Section[0].split('\n');
      let currentQ = 1;
      for (const line of lines) {
        const match = line.match(/^\s*\|?\s*(\d+)?\s*\|\s*([a-d])\s*\|\s*([^\s\|]+)/iu) 
                   || line.match(/^\s*(?:(\d+)[\t\s]+)?([a-d])[\t\s]+([^\s\|]+)/iu);
        if (match) {
          if (match[1]) currentQ = parseInt(match[1], 10);
          const sub = match[2].toLowerCase();
          const valStr = match[3].trim().toUpperCase();
          const isTrue = valStr === 'Đ' || valStr === 'D' || valStr === 'T' || valStr.startsWith('ĐÚNG') || valStr.startsWith('TRUE');
          p2AnswerMap[`${currentQ}_${sub}`] = isTrue;
        }
      }
    }

    // 4.3. Phần 3: Trả lời ngắn
    const p3Section = guideText.match(/(?:Phần\s*3|III\.\s*Phần)[\s\S]*?(?=(?:Phần\s*4|IV\.\s*Phần|$))/i);
    if (p3Section) {
      const lines = p3Section[0].split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*\|?\s*(\d+)\s*\|\s*([^\|\n\r\t]+)/i) || line.match(/^\s*(\d+)[\t\s]+([^\n\r\t]+)/i);
        if (match && !/^(?:Câu|Đáp án|Mã đề)/i.test(match[1])) {
          p3AnswerMap[parseInt(match[1], 10)] = match[2].trim();
        }
      }
    }

    // 4.4. Phần 4: Tự luận
    const p4Section = guideText.match(/(?:Phần\s*4|IV\.\s*Phần)[\s\S]*?$/i);
    if (p4Section) {
      const lines = p4Section[0].split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*\|?\s*(\d+)\s*\|\s*([^\|]+)\|\s*([^\|\n\r]+)/i);
        if (match) {
          const qNum = parseInt(match[1], 10);
          p4AnswerMap[qNum] = {
            explanation: match[2].trim(),
            points: parseFloat(match[3].replace(',', '.')) || 1.0,
          };
        }
      }
    }
  }

  // 5. Tách các phần lớn (PHẦN I, PHẦN II, PHẦN III, PHẦN IV...)
  const partSplitRegex = /(?=PHẦN\s*(?:[I|V|X]+|\d+)[\.:\s])/gi;
  const rawParts = questionText.split(partSplitRegex);

  let questionGlobalIndex = 1;

  for (const part of rawParts) {
    const isExplicitPart2 = /PHẦN\s*(?:II\b|2\b|ĐÚNG\s*SAI)/i.test(part);
    const isExplicitPart3 = /PHẦN\s*(?:III\b|3\b|TRẢ\s*LỜI\s*NGẮN|ĐIỀN\s*SỐ)/i.test(part);
    const isExplicitPart4 = /PHẦN\s*(?:IV\b|4\b|TỰ\s*LUẬN)/i.test(part);

    // Tách các khối câu hỏi trong từng phần
    const qBlocks = part
      .split(/(?=(?:^|[\n\r])\s*(?:Câu|Bài)\s*\d+[\.:])/i)
      .map((b) => b.trim())
      .filter((b) => /^(?:Câu|Bài)\s*\d+[\.:]/i.test(b));

    for (const qBlock of qBlocks) {
      const numMatch = qBlock.match(/^(?:Câu|Bài)\s*(\d+)[\.:]/i);
      const qNum = numMatch ? parseInt(numMatch[1], 10) : questionGlobalIndex;

      // Xác định mức độ nhận thức qua thẻ [NB], [TH], [VD], [VDC]
      let diff = defaultDiff;
      if (/\[(?:NB|1|Nhận biết)\]|<(?:NB|1|Nhận biết)>/i.test(qBlock)) diff = 1;
      else if (/\[(?:TH|2|Thông hiểu)\]|<(?:TH|2|Thông hiểu)>/i.test(qBlock)) diff = 2;
      else if (/\[(?:VD|3|Vận dụng)\]|<(?:VD|3|Vận dụng)>/i.test(qBlock)) diff = 3;
      else if (/\[(?:VDC|4|Vận dụng cao)\]|<(?:VDC|4|Vận dụng cao)>/i.test(qBlock)) diff = 4;

      const blockWithoutHeader = qBlock
        .replace(/^(?:Câu|Bài)\s*\d+[\.:]\s*/i, '')
        .replace(/\[(?:NB|TH|VD|VDC|\d+|Nhận biết|Thông hiểu|Vận dụng|Vận dụng cao)\]/gi, '')
        .replace(/<(?:NB|TH|VD|VDC|\d+|Nhận biết|Thông hiểu|Vận dụng|Vận dụng cao)>/gi, '')
        .trim();

      // Kiểm tra đáp án A, B, C, D
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

      // Kiểm tra các ý a), b), c), d) đúng sai
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

      // Kiểm tra đáp án trả lời ngắn
      const ansMatch = qBlock.match(/(?:(?:Đáp\s*án(?:\s*đúng)?|Answer):\s*([^\n\r]+))/i);
      const hasShortAnswer = Boolean(ansMatch);

      const isFillInBlank = isExplicitPart3 || (!hasABCD && !hasSubItems && (hasShortAnswer || isExplicitPart3));
      const isTrueFalse = !isFillInBlank && (isExplicitPart2 || (hasSubItems && !hasABCD));
      const isEssay = isExplicitPart4 || (!hasABCD && !hasSubItems && !hasShortAnswer && !isFillInBlank);

      if (isFillInBlank) {
        // === CÂU TRẢ LỜI NGẮN / ĐIỀN SỐ (PHẦN III) ===
        const explMatch = qBlock.match(/(?:Lời\s*giải|Giải\s*thích|Explanation):?([\s\S]*?)(?:Đáp\s*án|$)/i);

        let content = qBlock
          .replace(/^(?:Câu|Bài)\s*\d+[\.:]\s*/i, '')
          .replace(/\[(?:NB|TH|VD|VDC|\d+|Nhận biết|Thông hiểu|Vận dụng|Vận dụng cao)\]/gi, '')
          .replace(/(?:Lời\s*giải|Giải\s*thích)[\s\S]*$/i, '')
          .replace(/(?:Đáp\s*án(?:\s*đúng)?|Answer):[\s\S]*$/i, '')
          .trim();

        // Ưu tiên đáp án từ bảng hướng dẫn chấm ở cuối
        const correctAns = p3AnswerMap[qNum] || (ansMatch ? ansMatch[1].trim() : '');
        const expl = explMatch ? explMatch[1].trim() : '';

        result.push({
          content,
          question_type: 'short_answer',
          difficulty_level: diff,
          explanation: expl ? `${expl}\nĐáp án: ${correctAns}` : (correctAns ? `Đáp án: ${correctAns}` : undefined),
          group_type: 'part3',
          options: [
            { content: correctAns || 'Đáp án', is_correct: true },
          ],
        });
      } else if (isTrueFalse) {
        // === CÂU ĐÚNG / SAI (PHẦN II) ===
        let mainContent = '';
        const subItems: { letter: string; text: string; isCorrect: boolean }[] = [];

        if (subIndices.length >= 2) {
          mainContent = qBlock
            .substring(0, subIndices[0].tagIndex)
            .replace(/^(?:Câu|Bài)\s*\d+[\.:]\s*/i, '')
            .replace(/\[(?:NB|TH|VD|VDC|\d+|Nhận biết|Thông hiểu|Vận dụng|Vận dụng cao)\]/gi, '')
            .trim();

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

            // Kiểm tra bảng Hướng dẫn chấm nếu có
            const guideKey = `${qNum}_${cur.letter}`;
            if (p2AnswerMap[guideKey] !== undefined) {
              isCorrect = p2AnswerMap[guideKey];
            }

            subItems.push({
              letter: cur.letter,
              text: raw,
              isCorrect,
            });
          }
        }

        const options = subItems.map((item) => ({
          content: `${item.letter}) ${item.text}`,
          is_correct: item.isCorrect,
        }));

        result.push({
          content: mainContent || `Câu ${qNum}`,
          question_type: 'true_false',
          difficulty_level: diff,
          group_type: 'part2',
          options: options.length >= 2 ? options : [
            { content: 'a) Mệnh đề 1', is_correct: true },
            { content: 'b) Mệnh đề 2', is_correct: false },
          ],
        });
      } else if (hasABCD) {
        // === CÂU TRẮC NGHIỆM 4 LỰA CHỌN (PHẦN I) ===
        const firstOptIndex = abcdIndices[0].tagIndex;
        let questionContent = blockWithoutHeader.substring(0, firstOptIndex).trim();

        // Kiểm tra xem bảng Hướng dẫn chấm hoặc cuối câu có đáp án không
        let detectedCorrectLetter = p1AnswerMap[qNum] || '';
        const endAns = qBlock.match(/(?:Đáp\s*án(?:\s*đúng)?|Answer):\s*([A-D])/i);
        if (endAns) {
          detectedCorrectLetter = endAns[1].toUpperCase();
        }

        const options: { content: string; is_correct: boolean }[] = [];

        for (let i = 0; i < abcdIndices.length; i++) {
          const cur = abcdIndices[i];
          const next = abcdIndices[i + 1];
          let optText = next
            ? blockWithoutHeader.substring(cur.startIndex, next.tagIndex)
            : blockWithoutHeader.substring(cur.startIndex);

          // Cắt phần giải thích hoặc đáp án ở cuối phương án cuối cùng
          optText = optText
            .replace(/(?:Lời\s*giải|Giải\s*thích)[\s\S]*$/i, '')
            .replace(/(?:Đáp\s*án(?:\s*đúng)?|Answer):[\s\S]*$/i, '')
            .trim();

          const isCorrect =
            cur.is_correct ||
            (detectedCorrectLetter ? cur.letter === detectedCorrectLetter : i === 0);

          options.push({
            content: optText,
            is_correct: isCorrect,
          });
        }

        // Đảm bảo có ít nhất 1 đáp án đúng
        if (!options.some((o) => o.is_correct) && options.length > 0) {
          options[0].is_correct = true;
        }

        result.push({
          content: questionContent,
          question_type: 'single_choice',
          difficulty_level: diff,
          group_type: 'part1',
          options,
        });
      } else {
        // === TỰ LUẬN (PHẦN IV) ===
        const p4Data = p4AnswerMap[qNum];
        result.push({
          content: blockWithoutHeader,
          question_type: 'short_answer',
          difficulty_level: diff,
          explanation: p4Data ? p4Data.explanation : undefined,
          points: p4Data ? p4Data.points : 1.0,
          group_type: 'part4',
          options: [{ content: p4Data ? p4Data.explanation : 'Đáp án tự luận', is_correct: true }],
        });
      }

      questionGlobalIndex++;
    }
  }

  // Nhóm theo các phần
  const groups = {
    part1: result.filter((q) => q.group_type === 'part1'),
    part2: result.filter((q) => q.group_type === 'part2'),
    part3: result.filter((q) => q.group_type === 'part3'),
    part4: result.filter((q) => q.group_type === 'part4'),
  };

  return {
    title: extractedTitle,
    school_name: schoolName,
    department_name: deptName,
    duration_minutes: durationMinutes,
    grade_name: gradeName,
    subject_name: subjectName,
    questions: result,
    groups,
    totalCount: result.length,
  };
};
