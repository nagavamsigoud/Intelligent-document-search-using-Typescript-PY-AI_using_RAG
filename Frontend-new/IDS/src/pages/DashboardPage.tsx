import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate for clean kick-outs
import { aiApi, authApi } from "../api/client";
import ModeToggle from "../components/ModeToggle";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { logout } from "../store/authSlice";
import type { AskResponse, ChatHistoryItem, DocumentItem, SourceItem } from "../types";

type Mode = "document" | "hybrid" | "general";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { accessToken } = useAppSelector((state) => state.auth);

  const [mode, setMode] = useState<Mode>("document");
  const [question, setQuestion] = useState("What security controls are required for vendors?");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState("No answer yet");
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [statusMessage, setStatusMessage] = useState("Synchronizing knowledge base...");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const indexedDocuments = useMemo(
    () => documents.filter((document) => document.status === "indexed"),
    [documents],
  );

  // FIX: Read directly from localStorage on refresh to protect against Redux lag race conditions
  useEffect(() => {
    const activeToken = accessToken || localStorage.getItem("accessToken");
    
    if (activeToken) {
      void loadDashboard();
    } else {
      setStatusMessage("Please log in to start using the system.");
      setDocuments([]);
      setHistory([]);
      setSelectedDocumentIds([]);
    }
  }, [accessToken]);

  async function loadDashboard() {
    try {
      const [documentsResponse, historyResponse] = await Promise.all([
        authApi.get<DocumentItem[]>("/documents/"),
        authApi.get<ChatHistoryItem[]>("/documents/history/"),
      ]);

      setDocuments(documentsResponse.data);
      setHistory(historyResponse.data);

      const activeIds = documentsResponse.data
        .filter((item) => item.status === "indexed")
        .map((item) => item.id);
      setSelectedDocumentIds(activeIds);

      setStatusMessage("Knowledge base synchronized.");
    } catch (err: any) {
      console.error("Dashboard Sync Error:", err);
      // If backend throws a 401, clear credentials safely
      if (err.response?.status === 401) {
        dispatch(logout());
        navigate("/login");
      } else {
        setStatusMessage("Failed to sync backend updates.");
      }
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("title", file.name.replace(/\.[^.]+$/, ""));
    formData.append("file", file);

    setUploading(true);
    setStatusMessage(`Uploading and indexing ${file.name}...`);

    try {
      const response = await authApi.post("/documents/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const fastApiData = new FormData();
      fastApiData.append("file", file);
      fastApiData.append("document_id", response.data.id.toString());
      fastApiData.append("title", file.name);

      await aiApi.post("/documents/import", fastApiData);

      await loadDashboard();
      setStatusMessage(`${file.name} indexed successfully.`);
    } catch (err) {
      setStatusMessage("Upload or Indexing failed. Check if both backends are running.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function toggleSelectedDocument(documentId: number) {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((item) => item !== documentId)
        : [...current, documentId],
    );
  }

  async function handleAskQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatusMessage("Querying local vector database...");

    try {
      const response = await aiApi.post<AskResponse>("/ask", {
        question,
        mode,
        document_ids: selectedDocumentIds,
        max_sources: 4,
      });

      setAnswer(response.data.answer);
      setConfidence(response.data.confidence);
      setSources(response.data.sources);

      const currentToken = accessToken || localStorage.getItem("accessToken");
      if (currentToken) {
        await authApi.post("/documents/history/", {
          question,
          answer: response.data.answer,
          mode,
          confidence: response.data.confidence,
          sources_json: response.data.sources,
        });
        
        const historyResponse = await authApi.get<ChatHistoryItem[]>("/documents/history/");
        setHistory(historyResponse.data);
      }
      setStatusMessage("Answer generated and saved.");
    } catch (err) {
      console.error("Connection Error:", err);
      setStatusMessage("Network Error: Ensure FastAPI is running on Port 8001.");
    } finally {
      setLoading(false);
    }
  }

  async function exportHistory(format: "csv" | "pdf") {
    try {
      const response = await authApi.get<Blob>(`/documents/history/export/${format}/`, {
        responseType: "blob" as const,
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = format === "csv" ? "rag-chat-history.csv" : "rag-chat-history.pdf";
      link.click();
      URL.revokeObjectURL(blobUrl);
      setStatusMessage(`Exported history as ${format.toUpperCase()}.`);
    } catch {
      setStatusMessage("Export failed. Verify Django is running and you are logged in.");
    }
  }

  async function handleDeleteDocument(documentId: number) {
    if (!window.confirm("Are you sure you want to delete this document and all its chunks?")) return;

    try {
      await authApi.delete(`/documents/${documentId}/`);
      await loadDashboard();
      setStatusMessage("Document and chunks deleted successfully.");
    } catch (err) {
      setStatusMessage("Failed to delete document.");
    }
  }

  async function handleDeleteHistoryItem(itemId: number) {
    const currentToken = accessToken || localStorage.getItem("accessToken");
    if (!currentToken) {
      setStatusMessage("Session expired. Please log in again.");
      return;
    }

    try {
      await authApi.delete(`/documents/history/${itemId}/`);
      setHistory((prev) => prev.filter((item) => item.id !== itemId));
      setStatusMessage("History item removed.");
    } catch(err) {
      console.log(`Delete Item Error: ${err}`);
      setStatusMessage("Failed to delete. You may need to log in again.");
    }
  }

  const currentTokenActive = accessToken || localStorage.getItem("accessToken");

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-300 via-violet-200 to-blue-300 px-4 py-6 text-slate-950 md:px-6">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-8 flex flex-col gap-6 rounded-[2rem] border border-white/20 bg-white/90 p-6 shadow-2xl backdrop-blur md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">RAG document search</p>
            <h1 className="mt-4 text-5xl font-semibold leading-tight md:text-6xl">
              Ask your documents with grounded AI search.
            </h1>
            <p className="mt-4 text-base leading-8 text-stone-600">{statusMessage}</p>
          </div>

          {currentTokenActive ? (
            <button
              onClick={() => {
                dispatch(logout());
                navigate("/login");
              }}
              className="self-start rounded-full border border-stone-300 bg-stone-50 px-5 py-3 font-semibold text-stone-700"
            >
              Logout
            </button>
          ) : (
            <div className="flex gap-3">
              <Link to="/login" className="rounded-full border border-stone-300 bg-stone-50 px-5 py-3 font-semibold text-stone-700">
                Login
              </Link>
              <Link to="/register" className="rounded-full bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-red-600 transition-colors shadow-lg shadow-orange-900/40">
                Register
              </Link>
            </div>
          )}
        </nav>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-[2rem] border border-white/20 bg-white/90 p-6 shadow-2xl backdrop-blur">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-500">Knowledge base</p>
                <h2 className="mt-3 text-3xl font-semibold">Documents</h2>
              </div>
              <span className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-900">
                {documents.length} files
              </span>
            </div>

            <label className="mb-4 grid min-h-40 cursor-pointer place-items-center rounded-[1.75rem] border-2 border-dashed border-cyan-300 bg-cyan-50 px-4 text-center">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              <span className="text-lg font-semibold text-cyan-900">{uploading ? "Uploading..." : "Upload PDF, DOCX, CSV, TXT"}</span>
              <p className="mt-2 text-sm text-stone-500">Files are parsed, chunked, embedded, and indexed for retrieval.</p>
            </label>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 font-semibold text-stone-700"
              >
                Import docs
              </button>
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => exportHistory("csv")}
                  className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportHistory("pdf")}
                  className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700"
                >
                  Export PDF
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {documents.length === 0 && (
                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-500">
                  No documents uploaded yet. Login and import a file to start indexing.
                </div>
              )}

              {documents.map((document) => (
                <label
                  key={document.id}
                  className="flex cursor-pointer items-start gap-3 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4"
                >
                  <input
                    type="checkbox"
                    checked={selectedDocumentIds.includes(document.id)}
                    onChange={() => toggleSelectedDocument(document.id)}
                    disabled={document.status !== "indexed"}
                    className="mt-1 h-4 w-4 accent-emerald-800"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-stone-900">{document.title}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-900">
                        {document.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteDocument(document.id);
                        }}
                        className="p-2 text-stone-400 hover:text-rose-500 transition-colors"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-stone-500">
                      {(document.file_type || "file").toUpperCase()} • {document.chunk_count} chunks
                    </p>
                    {document.summary && <p className="mt-2 text-sm leading-6 text-stone-600">{document.summary}</p>}
                    {document.error_message && <p className="mt-2 text-sm font-medium text-rose-600">{document.error_message}</p>}
                  </div>
                </label>
              ))}
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-lg">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-500">Ask your archive</p>
                  <h2 className="mt-3 text-3xl font-semibold">Intelligent search</h2>
                </div>
                <span className="self-start rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900">
                  GPT + pgvector
                </span>
              </div>

              <ModeToggle value={mode} onChange={setMode} />

              <form onSubmit={handleAskQuestion} className="mt-5 flex flex-col gap-3 rounded-[1.75rem] border border-stone-200 bg-stone-50 p-3 md:flex-row">
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask a grounded question about your uploaded documents"
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-stone-900 outline-none placeholder:text-stone-400"
                />
                <button
                  type="submit"
                  disabled={loading || (mode !== "general" && indexedDocuments.length === 0)}
                  className="rounded-full bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-red-600 transition-colors shadow-lg shadow-orange-900/40"
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </form>

              <div className="mt-5 rounded-[1.75rem] bg-gradient-to-br from-slate-800 via-cyan-800 to-teal-700 p-6 text-white">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm uppercase tracking-[0.18em] text-orange-100/90">Generated answer</span>
                  <strong className="rounded-full bg-amber-400/20 px-4 py-2 text-sm text-amber-100">{confidence}</strong>
                </div>
                <p className="text-base leading-8 text-emerald-50">
                  {answer || "Your grounded answer will appear here after you upload and search indexed documents."}
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {sources.length === 0 && (
                  <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-500">
                    Source citations will appear here after a successful search.
                  </div>
                )}

                {sources.map((source) => (
                  <div key={`${source.title}-${source.score}`} className="grid grid-cols-[64px_1fr] gap-4 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 font-semibold text-emerald-900">
                      {source.score}
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-900">{source.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-stone-600">{source.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-lg">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-500">Saved activity</p>
                  <h2 className="mt-3 text-3xl font-semibold">Recent history</h2>
                </div>
                <span className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700">
                  {history.length} entries
                </span>
              </div>

              <div className="space-y-3">
                {history.length === 0 && (
                  <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-500">
                    Your searched prompts and answers will appear here after you start using the system.
                  </div>
                )}

                {history.slice(0, 6).map((item) => (
                  <div key={item.id} className="relative rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 group">
                    <button
                      onClick={() => handleDeleteHistoryItem(item.id)}
                      className="absolute top-4 right-4 text-stone-400 hover:text-rose-500 transition-colors"
                      title="Delete item"
                    >
                      🗑️
                    </button>

                    <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                      <h3 className="font-semibold text-stone-900">{item.question}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-900">
                        {item.mode}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-stone-600">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}