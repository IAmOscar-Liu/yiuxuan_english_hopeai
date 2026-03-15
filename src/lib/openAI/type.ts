export type ChatType = "share" | "topic" | "follow-up";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type Report = {
  complete: boolean;
  block_type: string;
  feasibility: number;
  task_done: number;
  session_stage: number;
  next_step: string;
  planned_time: string;
  planned_duration: string;
  success_definition: string;
  task_status: string;
  session_type: string;
  summary: string;
  coach_feedback: string;
};

export type OpenAIResult =
  | { success: true; completed: false; reply: string }
  | {
      success: true;
      completed: true;
      report: Report;
      chatType: ChatType;
      followupId?: string | null;
      history: ChatMessage[];
    }
  | { success: false; error: any };
