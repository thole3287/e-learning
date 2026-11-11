import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx';

export interface ShuffledVariant {
  code: string;
  parts: {
    part1?: { title: string; questions: any[] };
    part2?: { title: string; questions: any[] };
    part3?: { title: string; questions: any[] };
    part4?: { title: string; questions: any[] };
  };
  answer_key: Record<number, string>;
}

export interface OfflineExamData {
  exam_title: string;
  duration_minutes: number;
  subject_name: string;
  grade_name: string;
  school_name?: string;
  department_name?: string;
  teacher_name?: string;
  city_name?: string;
  variants: ShuffledVariant[];
  answer_matrix: {
    total_questions: number;
    rows?: Array<{
      code: string;
      answers: Record<number, string>;
    }>;
    part1?: Array<{
      question_number: number;
      answers: Record<string, string>;
    }>;
    part2?: Array<{
      question_number: number;
      sub_label: string;
      answers: Record<string, string>;
    }>;
    part3?: Array<{
      question_number: number;
      answers: Record<string, string>;
    }>;
    part4?: Array<{
      question_number: number;
      content: string;
      points: number;
    }>;
  };
}

/**
 * Hàm chuẩn hóa công thức Toán/Hóa học từ mã LaTeX sang ký tự Unicode chuyên nghiệp cho Word
 */
export const formatDocxMathAndText = (input: string): string => {
  if (!input) return '';

  let text = input;

  // 1. Phân số: \frac{a}{b}, \dfrac{a}{b}, \tfrac{a}{b}
  for (let iter = 0; iter < 3; iter++) {
    text = text.replace(/\\(?:frac|dfrac|tfrac)\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  }
  // Dạng đơn giản \frac12 hoặc \dfrac 1 2
  text = text.replace(/\\(?:frac|dfrac|tfrac)\s*([0-9a-zA-Z])\s*([0-9a-zA-Z])/g, '($1)/($2)');

  // 2. Ký hiệu tập hợp & quan hệ tập hợp
  text = text
    .replace(/\\mathbb\{R\}|\\mathbf\{R\}|\\bm\{R\}/g, 'ℝ')
    .replace(/\\mathbb\{N\}|\\mathbf\{N\}|\\bm\{N\}/g, 'ℕ')
    .replace(/\\mathbb\{Z\}|\\mathbf\{Z\}|\\bm\{Z\}/g, 'ℤ')
    .replace(/\\mathbb\{Q\}|\\mathbf\{Q\}|\\bm\{Q\}/g, 'ℚ')
    .replace(/\\mathbb\{C\}|\\mathbf\{C\}|\\bm\{C\}/g, 'ℂ')
    .replace(/\\mathbb\{D\}|\\mathbf\{D\}|\\bm\{D\}/g, '𝔻')
    .replace(/\\setminus/g, ' \\ ')
    .replace(/\\in\b/g, '∈')
    .replace(/\\notin\b/g, '∉')
    .replace(/\\subset\b/g, '⊂')
    .replace(/\\subseteq\b/g, '⊆')
    .replace(/\\supset\b/g, '⊃')
    .replace(/\\supseteq\b/g, '⊇')
    .replace(/\\cup\b/g, '∪')
    .replace(/\\cap\b/g, '∩')
    .replace(/\\emptyset\b|\\varnothing\b/g, '∅')
    .replace(/\\forall\b/g, '∀')
    .replace(/\\exists\b/g, '∃');

  // 3. Vô cùng, so sánh, đại số & hình học
  text = text
    .replace(/\\(?:pm|mp)\b/g, '±')
    .replace(/\\times\b/g, '×')
    .replace(/\\div\b/g, '÷')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\bullet\b/g, '•')
    .replace(/\\le\b|\\leq\b/g, '≤')
    .replace(/\\ge\b|\\geq\b/g, '≥')
    .replace(/\\ne\b|\\neq\b/g, '≠')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\sim\b/g, '~')
    .replace(/\\equiv\b/g, '≡')
    .replace(/\\parallel\b/g, '∥')
    .replace(/\\perp\b/g, '⊥')
    .replace(/\\angle\b/g, '∠')
    .replace(/\\rightleftharpoons\b/g, '⇌')
    .replace(/\\rightleftarrows\b/g, '⇄')
    .replace(/\\rightarrow\b|\\to\b/g, '→')
    .replace(/\\leftarrow\b/g, '←')
    .replace(/\\Rightarrow\b/g, '⇒')
    .replace(/\\Leftrightarrow\b/g, '⇔')
    .replace(/\\leftrightarrow\b/g, '↔')
    .replace(/\\infty\b/g, '∞');

  // 4. Đạo hàm & độ
  text = text
    .replace(/\\prime\b/g, "'")
    .replace(/\^\{\\circ\}|\^\\circ|\\degree\b/g, '°');

  // 5. Ký tự Hy Lạp
  text = text
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\lambda\b/g, 'λ')
    .replace(/\\Delta\b/g, 'Δ')
    .replace(/\\delta\b/g, 'δ')
    .replace(/\\sigma\b/g, 'σ')
    .replace(/\\omega\b/g, 'ω')
    .replace(/\\Omega\b/g, 'Ω')
    .replace(/\\mu\b/g, 'μ')
    .replace(/\\rho\b/g, 'ρ')
    .replace(/\\phi\b/g, 'φ')
    .replace(/\\Phi\b/g, 'Φ');

  // 6. Căn bậc hai & căn bậc n
  text = text.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');
  text = text.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, '$1√($2)');

  // 7. Số mũ và chỉ số dưới Unicode
  const supers: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ'
  };
  text = text.replace(/\^([0-9+\-=()nxy])/g, (_, ch) => supers[ch] || `^${ch}`);
  text = text.replace(/\^\{([0-9+\-=()nxy]+)\}/g, (_, str) => {
    return str.split('').map((c: string) => supers[c] || c).join('');
  });

  const subs: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'x': 'ₓ'
  };
  text = text.replace(/_([0-9+\-=()aex])/g, (_, ch) => subs[ch] || `_${ch}`);
  text = text.replace(/_\{([0-9+\-=()aex]+)\}/g, (_, str) => {
    return str.split('').map((c: string) => subs[c] || c).join('');
  });

  // 8. Hàm số phổ biến (loại bỏ \sin -> sin)
  text = text
    .replace(/\\(?:sin|cos|tan|cot|ln|log|exp|lim|max|min)\b/g, (m) => m.substring(1));

  // 9. Dọn dẹp thẻ text, left/right và khoảng trắng LaTeX
  text = text
    .replace(/\\text\{([^{}]+)\}/g, '$1')
    .replace(/\\textbf\{([^{}]+)\}/g, '$1')
    .replace(/\\mathbf\{([^{}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^{}]+)\}/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/\\[,;!]/g, ' ')
    .replace(/\\quad|\\qquad/g, ' ');

  // 10. Xóa triệt để dấu $ và $$
  text = text.replace(/\$\$/g, '').replace(/\$/g, '');

  // 11. Chuẩn hóa khoảng trắng
  return text.replace(/[ \t]+/g, ' ').trim();
};

export const generateExamDocx = async (data: OfflineExamData): Promise<Blob> => {
  const sections: any[] = [];

  const schoolName = data.school_name || 'TRƯỜNG THPT HẬU NGHĨA';
  const subjectName = (data.subject_name || '').toUpperCase();
  const examTitle = data.exam_title.toUpperCase();

  // Tự động nhận diện Khối từ exam_title nếu data.grade_name trống
  let gradeName = data.grade_name ? data.grade_name.toUpperCase() : '';
  if (!gradeName) {
    const gradeMatch = examTitle.match(/(?:KHỐI|LỚP|K)\s*(10|11|12)\b/i) || examTitle.match(/\b(10|11|12)\b/);
    if (gradeMatch) {
      gradeName = `KHỐI ${gradeMatch[1]}`;
    }
  }

  // Tự động điều chỉnh Tổ bộ môn chính xác theo môn học
  let deptName = data.department_name;
  if (!deptName || deptName === 'TỔ CHUYÊN MÔN' || (subjectName && deptName === 'TỔ HÓA HỌC' && !subjectName.includes('HÓA'))) {
    deptName = subjectName ? `TỔ ${subjectName}` : 'TỔ CHUYÊN MÔN';
  }

  // Dòng 2 tiêu đề đề thi: MÔN TOÁN HỌC – KHỐI 12 (HỆ GDPT)
  let line2Right = '';
  if (subjectName && examTitle.includes(subjectName)) {
    // Nếu tiêu đề đã chứa tên môn (VD: BÀI KIỂM TRA TOÁN HỌC) thì chỉ ghi Khối
    line2Right = gradeName ? `${gradeName} – CHƯƠNG TRÌNH GDPT 2018` : 'CHƯƠNG TRÌNH GDPT 2018';
  } else {
    const subPart = subjectName ? `MÔN ${subjectName}` : 'MÔN HỌC';
    line2Right = gradeName ? `${subPart} – ${gradeName} (HỆ GDPT)` : `${subPart} – HỆ GDPT`;
  }

  const duration = `Thời gian làm bài: ${data.duration_minutes || 45} phút (không kể thời gian phát đề)`;

  const borderless = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.NONE },
    insideVertical: { style: BorderStyle.NONE },
  };

  // ================= 1. CÁC MÃ ĐỀ THI =================
  data.variants.forEach((variant) => {
    const children: any[] = [];

    // Header 2 cột chuẩn mẫu trường THPT
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: borderless,
      rows: [
        new TableRow({
          children: [
            // Cột trái: Thông tin Trường, Tổ
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              borders: borderless,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: schoolName, bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: deptName, bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 100 },
                  children: [new TextRun({ text: '(Đề thi có 2 trang)', italics: true, size: 18 })],
                }),
              ],
            }),
            // Cột phải: Kỳ kiểm tra, Môn, Khối, Thời gian
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: borderless,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: examTitle, bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: line2Right, bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 100 },
                  children: [new TextRun({ text: duration, italics: true, size: 18 })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    children.push(headerTable);

    // Dòng Họ tên học sinh & Mã đề thi
    const studentInfoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: borderless,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 68, type: WidthType.PERCENTAGE },
              borders: borderless,
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 140 },
                  children: [
                    new TextRun({
                      text: 'Họ tên : ............................................................... Lớp : ...................',
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 32, type: WidthType.PERCENTAGE },
              borders: borderless,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 80, after: 140 },
                  children: [
                    new TextRun({
                      text: `Mã đề ${variant.code}`,
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    children.push(studentInfoTable);

    // NỘI DUNG 4 PHẦN CỦA ĐỀ THI
    const parts = [
      variant.parts.part1,
      variant.parts.part2,
      variant.parts.part3,
      variant.parts.part4,
    ].filter(Boolean);

    parts.forEach((part: any) => {
      if (!part || !part.questions || part.questions.length === 0) return;

      // Tiêu đề phần
      children.push(
        new Paragraph({
          spacing: { before: 180, after: 120 },
          children: [
            new TextRun({
              text: part.title,
              bold: true,
              size: 20,
            }),
          ],
        })
      );

      // Danh sách câu hỏi
      part.questions.forEach((q: any) => {
        const cleanContent = formatDocxMathAndText(q.content || '');
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 40 },
            children: [
              new TextRun({
                text: `Câu ${q.question_number}. `,
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: cleanContent,
                size: 20,
              }),
            ],
          })
        );

        // Các lựa chọn phương án
        if (q.options && q.options.length > 0) {
          if (q.question_type === 'true_false') {
            // Đúng / Sai: in a), b), c), d)
            q.options.forEach((opt: any) => {
              const cleanOpt = formatDocxMathAndText(opt.content.replace(/^[a-d]\)\s*/i, ''));
              children.push(
                new Paragraph({
                  indent: { left: 360 },
                  spacing: { after: 30 },
                  children: [
                    new TextRun({
                      text: `${opt.label}) `,
                      bold: true,
                      size: 20,
                    }),
                    new TextRun({
                      text: cleanOpt,
                      size: 20,
                    }),
                  ],
                })
              );
            });
          } else if (q.question_type === 'short_answer' || q.question_type === 'fill_in_blank') {
            // Trả lời ngắn / Tự luận
          } else {
            // Trắc nghiệm 4 lựa chọn (A, B, C, D)
            const formattedOpts = q.options.map((opt: any) => ({
              label: opt.label || 'A',
              content: formatDocxMathAndText(opt.content || ''),
            }));

            const maxLen = Math.max(...formattedOpts.map((o: any) => o.content.length));

            if (maxLen <= 10 && formattedOpts.length === 4) {
              // 1 hàng 4 cột (25% mỗi cột) - Dành cho số hoặc ký tự ngắn (1, -1, 3, -2)
              const rowCells = formattedOpts.map((opt: any) =>
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  borders: borderless,
                  children: [
                    new Paragraph({
                      spacing: { before: 20, after: 30 },
                      children: [
                        new TextRun({ text: `${opt.label}. `, bold: true, size: 20 }),
                        new TextRun({ text: opt.content, size: 20 }),
                      ],
                    }),
                  ],
                })
              );
              children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: borderless, rows: [new TableRow({ children: rowCells })] }));
            } else if (maxLen <= 32) {
              // 2 hàng 2 cột (50% mỗi cột) - Dành cho biểu thức vừa (y' = 3x² - 6x)
              const tRows: TableRow[] = [];
              for (let i = 0; i < formattedOpts.length; i += 2) {
                const pair = formattedOpts.slice(i, i + 2);
                tRows.push(
                  new TableRow({
                    children: pair.map((opt: any) =>
                      new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: borderless,
                        children: [
                          new Paragraph({
                            spacing: { before: 20, after: 30 },
                            children: [
                              new TextRun({ text: `${opt.label}. `, bold: true, size: 20 }),
                              new TextRun({ text: opt.content, size: 20 }),
                            ],
                          }),
                        ],
                      })
                    ),
                  })
                );
              }
              children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: borderless, rows: tRows }));
            } else {
              // 4 hàng 1 cột (100%) - Dành cho câu dài giải thích
              const tRows = formattedOpts.map((opt: any) =>
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      borders: borderless,
                      children: [
                        new Paragraph({
                          indent: { left: 360 },
                          spacing: { before: 20, after: 30 },
                          children: [
                            new TextRun({ text: `${opt.label}. `, bold: true, size: 20 }),
                            new TextRun({ text: opt.content, size: 20 }),
                          ],
                        }),
                      ],
                    }),
                  ],
                })
              );
              children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: borderless, rows: tRows }));
            }
          }
        }
      });
    });

    // Kết thúc đề
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 200 },
        children: [new TextRun({ text: '----HẾT---', bold: true, size: 20 })],
      })
    );

    sections.push({
      properties: {
        page: {
          margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
        },
      },
      children,
    });
  });

  // ================= 2. TRANG HƯỚNG DẪN CHẤM & MA TRẬN ĐÁP ÁN =================
  const guideChildren: any[] = [];

  // Header Hướng dẫn chấm
  const guideHeaderTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderless,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: borderless,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: schoolName, bold: true, size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: deptName, bold: true, size: 20 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: borderless,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: examTitle, bold: true, size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `HƯỚNG DẪN CHẤM MÔN ${subjectName}`, bold: true, size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${gradeName} – HỆ GDPT`, bold: true, size: 20 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  guideChildren.push(guideHeaderTable);

  const codes = data.variants.map((v) => v.code);

  // Helper tạo cell border
  const borderStyle = {
    top: { style: BorderStyle.SINGLE, size: 4 },
    bottom: { style: BorderStyle.SINGLE, size: 4 },
    left: { style: BorderStyle.SINGLE, size: 4 },
    right: { style: BorderStyle.SINGLE, size: 4 },
  };

  // --- BẢNG PHẦN 1: TRẮC NGHIỆM NHIỀU LỰA CHỌN ---
  if (data.answer_matrix.part1 && data.answer_matrix.part1.length > 0) {
    guideChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: 'I. Phần 1. Trắc nghiệm nhiều lựa chọn', bold: true, size: 20 })],
      })
    );

    const p1Rows: TableRow[] = [];
    const hCells = [
      new TableCell({
        borders: borderStyle,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Câu', bold: true, size: 18 })] })],
      }),
      ...codes.map(
        (c) =>
          new TableCell({
            borders: borderStyle,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: c, bold: true, size: 18 })] })],
          })
      ),
    ];
    p1Rows.push(new TableRow({ children: hCells }));

    data.answer_matrix.part1.forEach((item) => {
      const rCells = [
        new TableCell({
          borders: borderStyle,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.question_number}`, bold: true, size: 18 })] })],
        }),
        ...codes.map(
          (c) =>
            new TableCell({
              borders: borderStyle,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.answers[c] || '-', size: 18 })] })],
            })
        ),
      ];
      p1Rows.push(new TableRow({ children: rCells }));
    });

    guideChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: p1Rows }));
  }

  // --- BẢNG PHẦN 2: TRẮC NGHIỆM ĐÚNG – SAI ---
  if (data.answer_matrix.part2 && data.answer_matrix.part2.length > 0) {
    guideChildren.push(
      new Paragraph({
        spacing: { before: 240, after: 100 },
        children: [new TextRun({ text: 'II. Phần 2. Trắc nghiệm đúng – sai', bold: true, size: 20 })],
      })
    );

    const p2Rows: TableRow[] = [];
    const hCells = [
      new TableCell({
        borders: borderStyle,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Câu', bold: true, size: 18 })] })],
      }),
      new TableCell({
        borders: borderStyle,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Lệnh hỏi', bold: true, size: 18 })] })],
      }),
      ...codes.map(
        (c) =>
          new TableCell({
            borders: borderStyle,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: c, bold: true, size: 18 })] })],
          })
      ),
    ];
    p2Rows.push(new TableRow({ children: hCells }));

    data.answer_matrix.part2.forEach((item) => {
      const rCells = [
        new TableCell({
          borders: borderStyle,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.question_number}`, bold: true, size: 18 })] })],
        }),
        new TableCell({
          borders: borderStyle,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.sub_label, bold: true, size: 18 })] })],
        }),
        ...codes.map(
          (c) =>
            new TableCell({
              borders: borderStyle,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.answers[c] || '-', size: 18 })] })],
            })
        ),
      ];
      p2Rows.push(new TableRow({ children: rCells }));
    });

    guideChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: p2Rows }));
  }

  // --- BẢNG PHẦN 3: TRẮC NGHIỆM TRẢ LỜI NGẮN ---
  if (data.answer_matrix.part3 && data.answer_matrix.part3.length > 0) {
    guideChildren.push(
      new Paragraph({
        spacing: { before: 240, after: 100 },
        children: [new TextRun({ text: 'III. Phần 3. Trắc nghiệm trả lời ngắn', bold: true, size: 20 })],
      })
    );

    const p3Rows: TableRow[] = [];
    const hCells = [
      new TableCell({
        borders: borderStyle,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Câu', bold: true, size: 18 })] })],
      }),
      ...codes.map(
        (c) =>
          new TableCell({
            borders: borderStyle,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: c, bold: true, size: 18 })] })],
          })
      ),
    ];
    p3Rows.push(new TableRow({ children: hCells }));

    data.answer_matrix.part3.forEach((item) => {
      const rCells = [
        new TableCell({
          borders: borderStyle,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.question_number}`, bold: true, size: 18 })] })],
        }),
        ...codes.map(
          (c) =>
            new TableCell({
              borders: borderStyle,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatDocxMathAndText(item.answers[c] || '-'), size: 18 })] })],
            })
        ),
      ];
      p3Rows.push(new TableRow({ children: rCells }));
    });

    guideChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: p3Rows }));
  }

  // --- BẢNG PHẦN 4: TỰ LUẬN ---
  if (data.answer_matrix.part4 && data.answer_matrix.part4.length > 0) {
    guideChildren.push(
      new Paragraph({
        spacing: { before: 240, after: 100 },
        children: [new TextRun({ text: 'IV. Phần 4. Tự luận', bold: true, size: 20 })],
      })
    );

    const p4Rows: TableRow[] = [];
    const hCells = [
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        borders: borderStyle,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Câu', bold: true, size: 18 })] })],
      }),
      new TableCell({
        width: { size: 75, type: WidthType.PERCENTAGE },
        borders: borderStyle,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nội dung', bold: true, size: 18 })] })],
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: borderStyle,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Điểm', bold: true, size: 18 })] })],
      }),
    ];
    p4Rows.push(new TableRow({ children: hCells }));

    data.answer_matrix.part4.forEach((item) => {
      const rCells = [
        new TableCell({
          borders: borderStyle,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.question_number}`, bold: true, size: 18 })] })],
        }),
        new TableCell({
          borders: borderStyle,
          children: [new Paragraph({ children: [new TextRun({ text: formatDocxMathAndText(item.content), size: 18 })] })],
        }),
        new TableCell({
          borders: borderStyle,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.points}`, size: 18 })] })],
        }),
      ];
      p4Rows.push(new TableRow({ children: rCells }));
    });

    guideChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: p4Rows }));
  }

  // Chữ ký Người ra đề
  const today = new Date();
  const dateStr = `ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
  const city = data.city_name || 'Hậu Nghĩa';
  const teacher = data.teacher_name || 'Lê Trọng Đức';

  guideChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 300, after: 60 },
      children: [new TextRun({ text: `${city}, ${dateStr}`, italics: true, size: 20 })],
    })
  );

  guideChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 400 },
      children: [new TextRun({ text: 'Người ra đề\t\t\t', bold: true, size: 20 })],
    })
  );

  guideChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `${teacher}\t\t\t`, bold: true, size: 20 })],
    })
  );

  sections.push({
    properties: {
      page: {
        margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
      },
    },
    children: guideChildren,
  });

  const doc = new Document({
    sections,
  });

  return await Packer.toBlob(doc);
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
