export type SceneType = "trajectories" | "components" | "range_comparison";
export type Mode = "demo" | "gemini";
export type TopicId =
  "projectile_motion" | "launch_angles" | "velocity_components";

export interface Parameters {
  angle: number;
  speed: number;
  gravity: number;
}

export interface Metrics {
  angle: number;
  horizontal_velocity: number;
  vertical_velocity: number;
  flight_time: number;
  range: number;
  max_height: number;
}

export interface Step {
  id: string;
  title: string;
  text: string;
  equation_key: "components" | "flight_time" | "range" | "height";
  equation: string;
}

export interface UnderstandingCheck {
  id: string;
  question: string;
  options: { id: string; label: string }[];
}

export interface SourceReference {
  filename: string;
  page: number;
  excerpt: string;
}

export interface Lesson {
  id: string;
  session_id: string;
  revision: number;
  created_at: string;
  topic: TopicId;
  title: string;
  objective: string;
  student_question: string;
  explanation: string;
  steps: Step[];
  scene: SceneType;
  parameters: Parameters;
  metrics: Metrics;
  comparisons: Metrics[];
  assumptions: string[];
  verification: { status: "verified"; method: string; scope: string };
  suggested_questions: string[];
  mode: Mode;
  planning_source?: "demo" | "gemini" | "gemini_cache" | null;
  strategy_history: SceneType[];
  adaptation: null | {
    selected_step_id: string;
    student_confusion: string;
    misconception_hypothesis: string;
    category: string;
    previous_strategy: SceneType;
    new_strategy: SceneType;
    title: string;
    explanation: string;
    parameters: Parameters;
    understanding_check: UnderstandingCheck;
  };
  understanding_check: UnderstandingCheck;
  sources: SourceReference[];
}

export interface Topic {
  id: TopicId;
  name: string;
  description: string;
  example: string;
}

export interface LessonSummary {
  id: string;
  title: string;
  topic: TopicId;
  mode: Mode;
  created_at: string;
}

export interface PDFDocument {
  id: string;
  filename: string;
  title: string;
  page_count: number;
  topics: Topic[];
  references: SourceReference[];
  notice: string;
}

export interface CheckResult {
  correct: boolean;
  feedback: string;
  answer_explanation: string;
  suggested_confusion: string | null;
}

export interface Health {
  status: "ok";
  gemini_configured: boolean;
  gemini_model_configured: boolean;
  supported_scenes: SceneType[];
}
