export type ContentType = "jobs" | "internship" | "papers" | "reflections";
export type ReadingMethod = "skim" | "deep" | "synthesis";
export type ReadingStatus = "queued" | "in_progress" | "synthesizing" | "completed" | "archived";
export type ApplicationStage = "applied" | "written_test" | "interview" | "offer" | "closed";

export interface ContentEntry {
  title: string;
  slug: string;
  type: ContentType;
  date: string;
  readAt?: string;
  summary: string;
  tags: string[];
  related: string[];
  status: "draft" | "published";
  body: string;
  authors?: string[];
  venue?: string;
  year?: number;
  paperUrl?: string;
  readingStatus?: ReadingStatus;
  readingMethods?: ReadingMethod[];
  topics?: string[];
  company?: string;
  role?: string;
  location?: string;
  applicationStage?: ApplicationStage;
  appliedAt?: string;
  nextAction?: string;
}

export interface PaperEntry extends ContentEntry {
  type: "papers";
  authors: string[];
  venue: string;
  year: number;
  paperUrl: string;
  readingStatus: ReadingStatus;
  readingMethods: ReadingMethod[];
  topics: string[];
}

export interface RecruitingEntry extends ContentEntry {
  type: "jobs";
  company: string;
  role: string;
  applicationStage: ApplicationStage;
}
