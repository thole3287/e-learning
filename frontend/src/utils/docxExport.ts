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
  variants: ShuffledVariant[];
  answer_matrix: {
    total_questions: number;
    rows: Array<{
      code: string;
      answers: Record<number, string>;
    }>;
  };
}

export const generateExamDocx = async (data: OfflineExamData): Promise<Blob> => {
  const sections: any[] = [];

  const schoolName = data.school_name || 'TRƯỜNG THPT CHUYÊN CHU VĂN AN';
  const deptName = data.department_name || 'TỔ CHUYÊN MÔN HÓA HỌC';
  const examTitle = data.exam_title.toUpperCase();
  const subjectGrade = `Môn: ${data.subject_name || 'Hóa Học'} - ${data.grade_name || 'Khối 10'}`;
  const duration = `Thời gian làm bài: ${data.duration_minutes || 45} phút (không kể thời gian giao đề)`;

  // Duyệt qua từng mã đề thi
  data.variants.forEach((variant) => {
    const children: any[] = [];

    // 1. HEADER HAI CỘT (Thông tin trường + Tiêu đề đề thi + Mã đề)
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
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: schoolName, bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: deptName, bold: true, size: 18 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '-----------------------', size: 18 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: examTitle, bold: true, size: 22 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: subjectGrade, bold: true, size: 20 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: duration, italics: true, size: 18 })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    children.push(headerTable);

    // Khung Mã Đề
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: `  MÃ ĐỀ THI: ${variant.code}  `,
            bold: true,
            size: 22,
          }),
        ],
      })
    );

    // Thông tin thí sinh
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: 'Họ và tên thí sinh: ................................................................ Số báo danh: ....................... Lớp: ................',
            italics: true,
            size: 20,
          }),
        ],
      })
    );

    // Đường gạch ngang phân cách
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: '_________________________________________________________________________________', size: 16 })],
      })
    );

    // 2. NỘI DUNG CÁC PHẦN TRONG ĐỀ THI
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
          spacing: { before: 200, after: 140 },
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
        // Nội dung câu
        const cleanContent = (q.content || '').replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: `Câu ${q.question_number}: `,
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

        // Các phương án lựa chọn
        if (q.options && q.options.length > 0) {
          if (q.question_type === 'true_false') {
            // Dạng Đúng/Sai: in a), b), c), d)
            q.options.forEach((opt: any) => {
              children.push(
                new Paragraph({
                  indent: { left: 360 },
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: `${opt.label}) `,
                      bold: true,
                      size: 20,
                    }),
                    new TextRun({
                      text: `${opt.content}`,
                      size: 20,
                    }),
                  ],
                })
              );
            });
          } else if (q.question_type === 'short_answer' || q.question_type === 'fill_in_blank') {
            // Dạng trả lời ngắn
            children.push(
              new Paragraph({
                indent: { left: 360 },
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: 'Trả lời: .....................................................................................................................................',
                    italics: true,
                    size: 20,
                  }),
                ],
              })
            );
          } else {
            // Dạng trắc nghiệm 4 lựa chọn A, B, C, D
            // Đưa vào 1 đoạn hoặc 2 dòng
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
                  text: `${opt.content}${idx < q.options.length - 1 ? '          ' : ''}`,
                  size: 20,
                })
              );
            });

            children.push(
              new Paragraph({
                indent: { left: 360 },
                spacing: { after: 60 },
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
        spacing: { before: 300, after: 300 },
        children: [new TextRun({ text: '---------- HẾT ----------', bold: true, size: 20 })],
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

  // 3. TRANG ĐÁP ÁN MA TRẬN TỔNG HỢP (ANSWER KEY MATRIX TABLE)
  const matrixChildren: any[] = [];

  matrixChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: 'BẢNG MA TRẬN ĐÁP ÁN CÁC MÃ ĐỀ THI',
          bold: true,
          size: 26,
        }),
      ],
    })
  );

  matrixChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `Đề thi: ${examTitle} | ${subjectGrade}`,
          italics: true,
          size: 20,
        }),
      ],
    })
  );

  // Xây dựng bảng ma trận đáp án
  const totalQuestions = data.answer_matrix.total_questions || 40;
  const tableRows: TableRow[] = [];

  // Hàng Header
  const headerCells: TableCell[] = [
    new TableCell({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Mã Đề', bold: true, size: 18 })],
        }),
      ],
    }),
  ];

  for (let q = 1; q <= totalQuestions; q++) {
    headerCells.push(
      new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `C${q}`, bold: true, size: 16 })],
          }),
        ],
      })
    );
  }

  tableRows.push(new TableRow({ children: headerCells }));

  // Hàng từng mã đề
  data.answer_matrix.rows.forEach((row) => {
    const rowCells: TableCell[] = [
      new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: row.code, bold: true, size: 18 })],
          }),
        ],
      }),
    ];

    for (let q = 1; q <= totalQuestions; q++) {
      const ans = row.answers[q] || '-';
      rowCells.push(
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: ans, size: 16 })],
            }),
          ],
        })
      );
    }

    tableRows.push(new TableRow({ children: rowCells }));
  });

  const matrixTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });

  matrixChildren.push(matrixTable);

  sections.push({
    properties: {
      page: {
        margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
      },
    },
    children: matrixChildren,
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
