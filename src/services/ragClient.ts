export type RagStreamHandlers = {
  onToken: (token: string) => void;
  onDone: (payload: { sources?: Array<{ file_path?: string; chunk_index?: number }> }) => void;
  onError: (error: Error) => void;
};

export function startRagStream(question: string, handlers: RagStreamHandlers) {
  const baseUrl = import.meta.env.VITE_RAG_BACKEND_URL as string | undefined;
  if (!baseUrl) {
    throw new Error('VITE_RAG_BACKEND_URL is not set');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/query/stream?question=${encodeURIComponent(question)}`;
  const es = new EventSource(url, { withCredentials: false });

  const tokenListener = (e: MessageEvent) => {
    handlers.onToken(e.data);
  };
  const doneListener = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data || '{}');
      handlers.onDone(data);
    } catch (err) {
      handlers.onDone({});
    } finally {
      es.close();
    }
  };
  const errorListener = (_e: Event) => {
    es.close();
    handlers.onError(new Error('RAG stream error'));
  };

  es.addEventListener('token', tokenListener as EventListener);
  es.addEventListener('done', doneListener as EventListener);
  es.addEventListener('error', errorListener as EventListener);

  return () => {
    try { es.close(); } catch {}
  };
}


