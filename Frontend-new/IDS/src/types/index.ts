export type DocumentItem = {
  id: number;
  title: string;
  file: string;
  file_url: string;
  file_type: string;
  status: string;
  chunk_count: number;
  file_size: number;
  summary: string;
  error_message: string;
  last_indexed_at: string | null;
  created_at: string;
};

export type SourceItem = {
  document_id: string;
  score: string;
  title: string;
  text: string;
};

export type ChatHistoryItem = {
  id: number;
  document: number | null;
  question: string;
  answer: string;
  mode: string;
  confidence: string;
  sources_json: SourceItem[];
  created_at: string;
};

export type AskResponse = {
  answer: string;
  confidence: string;
  sources: SourceItem[];
};