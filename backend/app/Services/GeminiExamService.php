<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class GeminiExamService
{
    protected string $defaultApiKey;
    protected string $model;

    public function __construct()
    {
        $this->defaultApiKey = (string) config('services.gemini.api_key', env('GEMINI_API_KEY', ''));
        $this->model = (string) config('services.gemini.model', 'gemini-2.5-flash');
    }

    /**
     * Sinh đề thi trắc nghiệm chuẩn GDPT 2018 bằng Google Gemini AI
     *
     * @param array $params
     * @return array
     * @throws Exception
     */
    public function generateExam(array $params): array
    {
        $apiKey = !empty($params['api_key']) ? trim($params['api_key']) : $this->defaultApiKey;
        if (empty($apiKey)) {
            throw new Exception('Chưa cấu hình Gemini API Key! Vui lòng cung cấp API key trong cài đặt hoặc file .env.');
        }

        $subjectName = $params['subject_name'] ?? 'Hóa học';
        $gradeName = $params['grade_name'] ?? 'Khối 10';
        $topic = $params['topic'] ?? 'Kiểm tra kiến thức tổng hợp';
        $durationMinutes = (int) ($params['duration_minutes'] ?? 45);
        $numPart1 = (int) ($params['num_part1'] ?? 18); // single_choice
        $numPart2 = (int) ($params['num_part2'] ?? 4);  // true_false
        $numPart3 = (int) ($params['num_part3'] ?? 6);  // short_answer
        $customRequirements = $params['custom_requirements'] ?? '';

        $prompt = $this->buildPrompt(
            $subjectName,
            $gradeName,
            $topic,
            $numPart1,
            $numPart2,
            $numPart3,
            $customRequirements
        );

        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$apiKey}";

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt]
                    ]
                ]
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'temperature' => 0.4,
            ]
        ];

        try {
            $response = Http::timeout(90)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($endpoint, $payload);

            if (!$response->successful()) {
                $errorData = $response->json();
                $errorMessage = $errorData['error']['message'] ?? $response->body();
                Log::error('Gemini API Error: ' . $errorMessage);
                throw new Exception("Lỗi gọi Gemini API ({$response->status()}): " . $errorMessage);
            }

            $resJson = $response->json();
            $rawText = $resJson['candidates'][0]['content']['parts'][0]['text'] ?? '';

            if (empty($rawText)) {
                throw new Exception('Gemini không phản hồi nội dung đề thi. Vui lòng thử lại!');
            }

            $cleanedJson = $this->cleanJsonString($rawText);
            $examData = json_decode($cleanedJson, true);
            if (json_last_error() !== JSON_ERROR_NONE || !isset($examData['questions'])) {
                Log::error('Gemini JSON Parse Error: ' . $rawText);
                throw new Exception('Dữ liệu đề thi từ Gemini không đúng định dạng JSON chuẩn: ' . json_last_error_msg());
            }

            // Chuẩn hóa và gán group_type, điểm, thứ tự
            $questions = [];
            $totalPoints = 10.0;
            $rawQuestions = $examData['questions'];

            foreach ($rawQuestions as $index => $q) {
                $rawType = strtolower(str_replace(['-', ' '], '_', trim((string) ($q['question_type'] ?? ''))));
                if (in_array($rawType, ['single_choice', 'single', 'multiple_choice_single', 'trac_nghiem'])) {
                    $type = 'single_choice';
                } elseif (in_array($rawType, ['true_false', 'tf', 'truefalse', 'dung_sai'])) {
                    $type = 'true_false';
                } elseif (in_array($rawType, ['short_answer', 'fill_in_blank', 'short', 'shortanswer', 'tra_loi_ngan', 'dien_khuyet'])) {
                    $type = 'short_answer';
                } else {
                    // Fallback theo group_type
                    $group = strtolower(trim((string) ($q['group_type'] ?? '')));
                    if ($group === 'part2') $type = 'true_false';
                    elseif ($group === 'part3') $type = 'short_answer';
                    else $type = 'single_choice';
                }

                $groupType = $q['group_type'] ?? ($type === 'single_choice' ? 'part1' : ($type === 'true_false' ? 'part2' : 'part3'));

                // Chuẩn hóa options
                $options = [];
                if (!empty($q['options']) && is_array($q['options'])) {
                    foreach ($q['options'] as $oIdx => $opt) {
                        $options[] = [
                            'content' => (string) ($opt['content'] ?? ''),
                            'is_correct' => (bool) ($opt['is_correct'] ?? false),
                        ];
                    }
                }

                // Với short_answer, nếu options trống thì tạo 1 option từ đáp án mẫu
                if ($type === 'short_answer' && empty($options)) {
                    $ansText = (string) ($q['correct_answer'] ?? $q['answer'] ?? 'Đáp án');
                    $options[] = [
                        'content' => $ansText,
                        'is_correct' => true,
                    ];
                }

                $questions[] = [
                    'content' => (string) ($q['content'] ?? "Câu " . ($index + 1)),
                    'question_type' => $type,
                    'difficulty_level' => (int) ($q['difficulty_level'] ?? 1),
                    'group_type' => $groupType,
                    'explanation' => (string) ($q['explanation'] ?? ''),
                    'options' => $options,
                ];
            }

            return [
                'title' => (string) ($examData['title'] ?? "Đề kiểm tra {$subjectName} - {$gradeName}"),
                'subject_name' => $subjectName,
                'grade_name' => $gradeName,
                'duration_minutes' => $durationMinutes,
                'total_points' => $totalPoints,
                'total_questions' => count($questions),
                'questions' => $questions,
            ];

        } catch (Exception $e) {
            Log::error('GeminiExamService Exception: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Làm sạch chuỗi JSON và tự động escape các ký tự LaTeX
     */
    protected function cleanJsonString(string $rawText): string
    {
        $text = trim($rawText);
        // Bỏ markdown ```json ... ```
        if (str_starts_with($text, '```')) {
            $text = preg_replace('/^```(?:json)?\s*/i', '', $text);
            $text = preg_replace('/\s*```$/', '', $text);
            $text = trim($text);
        }

        // 1. Tự động escape các lệnh LaTeX từ 2 ký tự trở lên (\frac, \text, \to, \rightarrow, \ce, \sqrt, \alpha, \beta, \Delta, \pm,...)
        $text = preg_replace('/(?<!\\\\)\\\\([a-zA-Z]{2,25})/', '\\\\\\\\$1', $text);

        // 2. Escape các ký hiệu toán/hóa học, dấu ngoặc và ký tự đặc biệt LaTeX: \( \) \[ \] \{ \} \% \_ \$ \# \& \: \, \; \! \+ \- \* \= \< \> \| \~ \^ \. \/
        $text = preg_replace('/(?<!\\\\)\\\\([()[\]{}%_$#&:,;!+\-*=<>|~^.\/])/', '\\\\\\\\$1', $text);

        // 3. Escape các backslash đơn đứng trước chữ cái đơn không phải escape JSON chuẩn (b, f, n, r, t, u, ", \)
        $text = preg_replace('/(?<!\\\\)\\\\([acdeg-hijklmopqsv-wxyzAC-Z])/', '\\\\\\\\$1', $text);

        // 4. Escape các backslash đứng cô lập theo sau bởi khoảng trắng
        $text = preg_replace('/(?<!\\\\)\\\\(\s+)/', '\\\\\\\\$1', $text);

        return $text;
    }

    /**
     * Xây dựng Prompt chuẩn hóa kiến thức GDPT 2018 cho Gemini
     */
    protected function buildPrompt(
        string $subjectName,
        string $gradeName,
        string $topic,
        int $numPart1,
        int $numPart2,
        int $numPart3,
        string $customRequirements
    ): string {
        return <<<PROMPT
Bạn là chuyên gia giáo dục hàng đầu, chuyên gia ra đề thi chuẩn theo Chương trình Giáo dục Phổ thông 2018 (GDPT 2018) của Bộ Giáo dục và Đào tạo Việt Nam.
Hãy biên soạn một đề kiểm tra hoàn chỉnh, chất lượng cao, khoa học và chính xác tuyệt đối.

THÔNG TIN ĐỀ THI:
- Môn học: {$subjectName}
- Khối lớp: {$gradeName}
- Chủ đề / Nội dung kiến thức: {$topic}
- Yêu cầu đặc biệt của giáo viên: {$customRequirements}

CẤU TRÚC ĐỀ THI GDPT 2018:
1. PHẦN I (Trắc nghiệm nhiều lựa chọn - single_choice): Tạo đúng {$numPart1} câu hỏi.
   - Mỗi câu có 4 phương án lựa chọn A, B, C, D (đúng 1 phương án đúng).
   - "question_type": "single_choice"
   - "group_type": "part1"
   - Tuyệt đối không để trống phương án hay nội dung câu hỏi!
2. PHẦN II (Trắc nghiệm Đúng / Sai - true_false): Tạo đúng {$numPart2} câu hỏi.
   - Mỗi câu gồm 1 ngữ cảnh/đề bài và 4 ý a), b), c), d). Thí sinh chọn Đúng hoặc Sai cho từng ý.
   - "question_type": "true_false"
   - "group_type": "part2"
   - Trong "options": phải có đúng 4 phần tử tương ứng với 4 ý a, b, c, d (ghi rõ is_correct: true nếu ý đó ĐÚNG, false nếu SAI).
3. PHẦN III (Câu hỏi Trả lời ngắn - short_answer): Tạo đúng {$numPart3} câu hỏi.
   - Câu hỏi định lượng hoặc định tính đòi hỏi học sinh tự tính toán/suy luận ra 1 giá trị số hoặc 1 từ/cụm từ ngắn gọn (ví dụ: '15', '3.5', 'chu kì 3').
   - "question_type": "short_answer"
   - "group_type": "part3"
   - Trong "options": chỉ gồm 1 phần tử chứa đáp án chuẩn: [{"content": "<đáp án số hoặc chữ>", "is_correct": true}]

QUY TẮC CÔNG THỨC TOÁN & HÓA HỌC (BẮT BUỘC):
- Tất cả công thức toán, phương trình hóa học, ký hiệu nguyên tử, số khối, electron, số mũ, chỉ số dưới PHẢI ĐẶT TRONG DẤU ĐÔ LA $...$, ví dụ:
  + Cấu hình electron: \$1s^2 2s^2 2p^6\$
  + Ký hiệu đồng vị hạt nhân: \${^{16}_{8}O}\$ hoặc \$\\ce{^{16}_{8}O}\$ hoặc \${^{35}_{17}Cl}\$
  + Phương trình hóa học: \$\\ce{H2SO4 + 2NaOH -> Na2SO4 + 2H2O}\$
  + Phân số: \$\\frac{a}{b}\$
  + Căn thức: \$\\sqrt{x}\$
  + Ký hiệu nguyên tố, phân lớp: \$X\$, \$P, S, Cl\$, phân lớp \$p\$
- TUYỆT ĐỐI KHÔNG để trống công thức hoặc phương án (không bao giờ trả về '.' đơn thuần trong phương án A, B, C, D; luôn ghi rõ nội dung phương án, ví dụ: 'A. \${^{16}_{8}X}\$ và \${^{17}_{8}Y}\$').
- QUY TẮC JSON QUAN TRỌNG: Mọi dấu gạch chéo ngược trong công thức LaTeX (như \\frac, \\times, \\Rightarrow, \\sqrt, \\ce, \\text) PHẢI ĐƯỢC ESCAPE BẰNG HAI DẤU GẠCH CHÉO NGƯỢC (\\\\frac, \\\\times, \\\\Rightarrow, \\\\sqrt, \\\\ce, \\\\text) để đảm bảo chuỗi JSON hoàn toàn hợp lệ.

YÊU CẦU ĐỊNH DẠNG JSON ĐẦU RA (Strict JSON Schema):
Trả về DUY NHẤT một đối tượng JSON hợp lệ (không kèm giải thích bên ngoài hay markdown backticks):
{
  "title": "Tên đề thi phù hợp với chủ đề",
  "questions": [
    {
      "content": "Nội dung câu hỏi (có KaTeX \$...\$)",
      "question_type": "single_choice",
      "difficulty_level": 1,
      "group_type": "part1",
      "explanation": "Lời giải chi tiết từng bước",
      "options": [
        { "content": "Phương án A", "is_correct": true },
        { "content": "Phương án B", "is_correct": false },
        { "content": "Phương án C", "is_correct": false },
        { "content": "Phương án D", "is_correct": false }
      ]
    },
    {
      "content": "Ngữ cảnh / Câu hỏi Đúng Sai...",
      "question_type": "true_false",
      "difficulty_level": 2,
      "group_type": "part2",
      "explanation": "Giải thích chi tiết cho từng ý a, b, c, d",
      "options": [
        { "content": "a) Nội dung ý a", "is_correct": true },
        { "content": "b) Nội dung ý b", "is_correct": false },
        { "content": "c) Nội dung ý c", "is_correct": true },
        { "content": "d) Nội dung ý d", "is_correct": false }
      ]
    },
    {
      "content": "Câu hỏi yêu cầu tính toán hoặc trả lời ngắn...",
      "question_type": "short_answer",
      "difficulty_level": 3,
      "group_type": "part3",
      "explanation": "Các bước tính toán chi tiết",
      "options": [
        { "content": "42", "is_correct": true }
      ]
    }
  ]
}
PROMPT;
    }
}
