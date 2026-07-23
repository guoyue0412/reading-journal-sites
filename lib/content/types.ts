export type ContentType = "jobs" | "internship" | "papers" | "reflections";
export type ReadingStatus = "queued" | "reading" | "reviewed" | "reproduced";

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
  topics?: string[];
}

export interface PaperEntry extends ContentEntry {
  type: "papers";
  authors: string[];
  venue: string;
  year: number;
  paperUrl: string;
  readingStatus: ReadingStatus;
  topics: string[];
}
