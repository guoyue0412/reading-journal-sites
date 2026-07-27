import type {
  ApplicationStage as ContentApplicationStage,
  ContentType,
  ReadingMethod as ContentReadingMethod,
  ReadingStatus as ContentReadingStatus,
} from "../content/types.ts";

export type PostType = ContentType;
export type PostStatus = "draft" | "published";
export type SectionKind = "long_text" | "short_text" | "checklist" | "markdown" | "relation";
export type ReadingMethod = ContentReadingMethod;
export type ReadingStatus = ContentReadingStatus;
export type ApplicationStage = ContentApplicationStage;

export type PaperMetadata = {
  authors: string[];
  venue: string;
  year: number;
  paperUrl: string;
  readAt: string;
  readingMethods: ReadingMethod[];
  readingStatus: ReadingStatus;
  topics: string[];
};

export type JobMetadata = {
  company: string;
  role: string;
  location: string;
  applicationStage: ApplicationStage;
  appliedAt: string;
  nextAction: string;
};

export type GenericMetadata = Record<string, never>;
export type PostMetadata = PaperMetadata | JobMetadata | GenericMetadata;

export interface BlogSection {
  id: string;
  title: string;
  kind: SectionKind;
  content: string;
  items: string[];
  relationSlugs: string[];
  position: number;
  templateId: string | null;
  standardKey: string | null;
}

export interface SectionTemplate {
  id: string;
  postType: PostType;
  title: string;
  kind: SectionKind;
  position: number;
  standardKey: string | null;
  enabled: boolean;
}

export interface BlogPostDraft {
  id: string;
  slug: string;
  type: PostType;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  related: string[];
  status: PostStatus;
  metadata: PostMetadata;
  sections: BlogSection[];
  draftVersion: number;
  publishedRevisionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishedSnapshot extends Omit<BlogPostDraft, "status"> {
  status: "published";
  revisionId: string;
  publishedAt: string;
}
