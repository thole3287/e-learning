export type UserRole = 'super_admin' | 'teacher' | 'student';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  code?: string;
  phone?: string;
  avatar_url?: string;
  school_id?: number;
}

export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'short_answer';

export interface QuestionOption {
  id: number;
  content: string;
  is_correct?: boolean;
}

export interface Question {
  id: number;
  question_type: QuestionType;
  difficulty_level: 1 | 2 | 3 | 4;
  content: string;
  explanation?: string;
  default_points?: number;
  points?: number;
  options: QuestionOption[];
}

export interface Exam {
  id: number;
  title: string;
  code: string;
  description?: string;
  duration_minutes: number;
  total_points: number;
  pass_points: number;
  status: 'draft' | 'published' | 'closed' | 'archived';
  subject?: { id: number; name: string };
  exam_questions_count?: number;
}

export interface StudentExamItem {
  assignment_id: number;
  exam_id: number;
  title: string;
  subject_name: string;
  duration_minutes: number;
  total_points: number;
  start_time: string;
  end_time: string;
  max_attempts: number;
  completed_attempts_count: number;
  has_in_progress_attempt: boolean;
  in_progress_attempt_id?: number;
  latest_attempt_id?: number;
  can_view_solutions?: boolean;
  show_solutions?: boolean;
  view_score_type?: string;
  status_label: 'upcoming' | 'open' | 'closed';
  latest_score?: number;
  best_score?: number;
  attempts?: {
    id: number;
    attempt_number: number;
    score: number;
    submitted_at?: string;
  }[];
}

export interface SavedAnswer {
  question_id: number;
  selected_option_ids: number[] | null;
  text_answer: string | null;
  is_flagged: boolean;
}

export interface ExamRoomData {
  attempt_id: number;
  exam_id: number;
  title: string;
  description?: string;
  duration_minutes: number;
  started_at: string;
  expires_at: string;
  server_now: string;
  total_questions: number;
  questions: Question[];
  saved_answers: SavedAnswer[];
}

export interface ExamResultData {
  attempt_id: number;
  exam_id: number;
  title: string;
  status: string;
  submitted_at: string;
  can_view_score: boolean;
  can_view_solutions: boolean;
  score?: number;
  total_correct?: number;
  total_incorrect?: number;
  total_unanswered?: number;
  total_points?: number;
  message?: string;
  detailed_questions?: Array<{
    id: number;
    question_type?: QuestionType;
    content: string;
    explanation?: string;
    options: Array<{ id: number; content: string; is_correct: boolean }>;
    student_selected_option_ids?: number[];
    student_text_answer?: string;
    is_correct?: boolean;
    earned_points?: number;
  }>;
}

export interface PracticeChapter {
  id: number;
  name: string;
  order_index: number;
  total_questions: number;
  level_counts: {
    1: number;
    2: number;
    3: number;
    4: number;
  };
}

export interface PracticeMatrixInfo {
  subject: {
    id: number;
    name: string;
    code: string;
  };
  chapters: PracticeChapter[];
  total_available_questions: number;
  total_by_level: {
    1: number;
    2: number;
    3: number;
    4: number;
  };
}

export interface PracticeSessionQuestion {
  id: number;
  question_type: QuestionType;
  difficulty_level: 1 | 2 | 3 | 4;
  content: string;
  explanation?: string;
  options: Array<{
    id: number;
    content: string;
    is_correct?: boolean;
  }>;
  student_selected_option_ids?: number[] | null;
  student_text_answer?: string | null;
  is_correct?: boolean | null;
}

export interface PracticeSessionData {
  id: number;
  title: string;
  subject_id: number;
  subject_name: string;
  duration_minutes: number;
  mode: 'interactive' | 'exam';
  status: 'in_progress' | 'completed';
  score?: number | null;
  total_questions: number;
  total_correct?: number;
  total_incorrect?: number;
  total_unanswered?: number;
  started_at: string;
  completed_at?: string;
  questions: PracticeSessionQuestion[];
  student?: {
    id: number;
    name: string;
    class_name: string;
  };
}

export interface PracticeHistoryItem {
  id: number;
  title: string;
  subject?: { id: number; name: string };
  duration_minutes: number;
  mode: 'interactive' | 'exam';
  status: 'in_progress' | 'completed';
  score?: number | null;
  total_questions: number;
  total_correct?: number;
  total_incorrect?: number;
  total_unanswered?: number;
  started_at: string;
  completed_at?: string;
}

export interface TeacherPracticeSessionItem {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  class_name: string;
  subject_name: string;
  title: string;
  score: number;
  total_questions: number;
  total_correct: number;
  total_incorrect: number;
  mode: 'interactive' | 'exam';
  completed_at: string;
}
