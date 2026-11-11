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

export const generateExamDocx = async (data: OfflineExamData): Promise<Blob> => {
  const sections: any[] = [];

  const schoolName = data.school_name || 'TRƯỜNG THPT HẬU NGHĨA';
  const deptName = data.department_name || `TỔ ${data.subject_name ? data.subject_name.toUpperCase() : 'HÓA HỌC'}`;
  const examTitle = data.exam_title.toUpperCase();
  const subjectGrade = `ĐỀ KIỂM TRA MÔN ${data.subject_name ? data.subject_name.toUpperCase() : 'HÓA HỌC'}\n${data.grade_name ? data.grade_name.toUpperCase() : 'KHỐI 10'} – HỆ GDPT`;
  const duration = `Thời gian làm bài: ${data.duration_minutes || 45} phút (không kể thời gian phát đề)`;

  // ================= 1. CÁC MÃ ĐỀ THI =================
  data.variants.forEach((variant) => {
    const children: any[] = [];

    // Header 2 cột chuẩn mẫu trường THPT
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            // Cột trái: Thông tin Trường, Tổ
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
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
                  spacing: { after: 120 },
                  children: [new TextRun({ text: '(Đề thi có 2 trang)', italics: true, size: 18 })],
                }),
              ],
            }),
            // Cột phải: Kỳ kiểm tra, Môn, Khối, Thời gian
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: examTitle, bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: subjectGrade, bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 120 },
                  children: [new TextRun({ text: duration, italics: true, size: 18 })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    children.push(headerTable);

    // Dòng Họ tên học sinh & Mã đề thi (khung bảng)
    const studentInfoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 80 },
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
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 80, after: 80 },
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

    // Đường gạch nét phân cách
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: '_________________________________________________________________________________', size: 16 })],
      })
    );

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
        const cleanContent = (q.content || '').replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 50 },
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
                      text: `${opt.content.replace(/^[a-d]\)\s*/i, '')}`,
                      size: 20,
                    }),
                  ],
                })
              );
            });
          } else if (q.question_type === 'short_answer' || q.question_type === 'fill_in_blank') {
            // Trả lời ngắn / Tự luận
            // Không in phương án A B C D
          } else {
            // Trắc nghiệm 4 lựa chọn (A, B, C, D)
            // Ghép 2 lựa chọn 1 dòng hoặc 1 dòng nếu ngắn
            const optRuns: TextRun[] = [];
            q.options.forEach((opt: any, idx: number) => {
              optRuns.push(
                new TextRun({
                  text: `${opt.label}. `,
                  bold: true,
                  size: 20,
                })
              );
              optRuns.push(
                new TextRun({
                  text: `${opt.content}${idx < q.options.length - 1 ? '\t\t' : ''}`,
                  size: 20,
                })
              );
            });

            children.push(
              new Paragraph({
                indent: { left: 360 },
                spacing: { after: 50 },
                children: optRuns,
              })
            );
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
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
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
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: examTitle, bold: true, size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `HƯỚNG DẪN CHẤM MÔN ${data.subject_name ? data.subject_name.toUpperCase() : 'HÓA HỌC'}`, bold: true, size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${data.grade_name ? data.grade_name.toUpperCase() : 'KHỐI 10'} – HỆ GDPT`, bold: true, size: 20 })],
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
    // Header
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

    // Rows
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
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.answers[c] || '-', size: 18 })] })],
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
          children: [new Paragraph({ children: [new TextRun({ text: item.content, size: 18 })] })],
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
