export interface ParsedQuestion {
  content: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'short_answer';
  difficulty_level: number;
  explanation?: string;
  options: Array<{
    content: string;
    is_correct: boolean;
  }>;
  group_type?: 'part1' | 'part2' | 'part3' | 'part4';
}

export interface ParsedExamResult {
  title: string;
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

  // Chuẩn hóa dòng và ngắt dòng
  const cleanText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .trim();

  // Tách các phần lớn nếu có (PHẦN I, PHẦN II, PHẦN III, PHẦN IV...)
  const partSplitRegex = /(?=PHẦN\s*(?:[I|V|X]+|\d+)[\.:\s])/gi;
  const rawParts = cleanText.split(partSplitRegex);

  // Đọc bảng đáp án tổng hợp ở cuối đề nếu có (ví dụ: 1.A 2.B 3.C... hoặc 1-A 2-C...)
  const endTableKeyMatch = cleanText.match(/(?:BẢNG\s*ĐÁP\s*ÁN|ĐÁP\s*ÁN\s*CÁC\s*CÂU)[\s\S]*$/i);
  const globalAnswerMap: Record<number, string> = {};
  if (endTableKeyMatch) {
    const tableText = endTableKeyMatch[0];
    const pairRegex = /(\d+)[\.\s\:\-]+([A-D]|Đ|S|\d+)/gi;
    let pm;
    while ((pm = pairRegex.exec(tableText)) !== null) {
      globalAnswerMap[parseInt(pm[1], 10)] = pm[2].toUpperCase();
    }
  }

  let questionGlobalIndex = 1;

  for (const part of rawParts) {
    const isExplicitPart2 = /PHẦN\s*(?:II\b|2\b|ĐÚNG\s*SAI)/i.test(part);
    const isExplicitPart3 = /PHẦN\s*(?:III\b|3\b|TRẢ\s*LỜI\s*NGẮN|ĐIỀN\s*SỐ)/i.test(part);
    const isExplicitPart4 = /PHẦN\s*(?:IV\b|4\b|TỰ\s*LUẬN)/i.test(part);

    // Tách các khối câu hỏi
    const qBlocks = part
      .split(/(?=(?:Câu|Bài)\s*\d+[\.:])/i)
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
        // === CÂU TRẢ LỜI NGẮN / ĐIỀN SỐ ===
        const explMatch = qBlock.match(/(?:Lời\s*giải|Giải\s*thích|Explanation):?([\s\S]*?)(?:Đáp\s*án|$)/i);

        let content = qBlock
          .replace(/^(?:Câu|Bài)\s*\d+[\.:]\s*/i, '')
          .replace(/\[(?:NB|TH|VD|VDC|\d+|Nhận biết|Thông hiểu|Vận dụng|Vận dụng cao)\]/gi, '')
          .replace(/(?:Lời\s*giải|Giải\s*thích)[\s\S]*$/i, '')
          .replace(/(?:Đáp\s*án(?:\s*đúng)?|Answer):[\s\S]*$/i, '')
          .trim();

        const correctAns = ansMatch ? ansMatch[1].trim() : (globalAnswerMap[qNum] || '');
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
        // === CÂU ĐÚNG / SAI (a, b, c, d) ===
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
        // === CÂU TRẮC NGHIỆM 4 LỰA CHỌN (A, B, C, D) ===
        const firstOptIndex = abcdIndices[0].tagIndex;
        let questionContent = blockWithoutHeader.substring(0, firstOptIndex).trim();

        // Tách các phương án
        const options: { content: string; is_correct: boolean }[] = [];
        let detectedCorrectLetter = globalAnswerMap[qNum] || '';

        // Kiểm tra xem cuối câu có "Đáp án: A" hay không
        const endAns = qBlock.match(/(?:Đáp\s*án(?:\s*đúng)?|Answer):\s*([A-D])/i);
        if (endAns) {
          detectedCorrectLetter = endAns[1].toUpperCase();
        }

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
        // Tự luận hoặc dạng khác
        result.push({
          content: blockWithoutHeader,
          question_type: 'short_answer',
          difficulty_level: diff,
          group_type: 'part4',
          options: [{ content: 'Đáp án tự luận', is_correct: true }],
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
    title: 'Đề thi từ file Word',
    questions: result,
    groups,
    totalCount: result.length,
  };
};
