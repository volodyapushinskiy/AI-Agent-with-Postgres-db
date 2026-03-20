"use client";

import ChatSidebar from "@/components/ChatSidebar";
import InputBar from "@/components/InputBar";
import MessageArea from "@/components/MessageArea";
import React, { useCallback, useMemo, useState, useEffect } from "react";

interface SearchInfo {
  stages: string[];
  query: string;
  urls: string[];
  error?: string;
}

interface Message {
  id: number;
  content: string;
  isUser: boolean;
  type: string;
  isLoading?: boolean;
  searchInfo?: SearchInfo;
}

interface Conversation {
  thread_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface BackendMessage {
  role: string;
  content: string;
  created_at: string;
}

interface StreamEventPayload {
  type: string;
  thread_id?: string;
  content?: string;
  query?: string;
  urls?: string[] | string;
  message?: string;
}

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://agentbackend-latest.onrender.com";

const Home = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.thread_id === threadId) || null,
    [conversations, threadId]
  );

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/conversations`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Не удалось загрузить список диалогов");
      }

      const data: Conversation[] = await response.json();
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const mapBackendMessagesToUi = (items: BackendMessage[]): Message[] => {
    return items.map((item, index) => ({
      id: index + 1,
      content: item.content,
      isUser: item.role === "user",
      type: "message",
      isLoading: false,
    }));
  };

  const handleSelectConversation = async (selectedThreadId: string) => {
    if (isStreaming) return;

    setIsLoadingConversation(true);

    try {
      const response = await fetch(
        `${apiBase}/conversations/${encodeURIComponent(selectedThreadId)}/messages`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось загрузить сообщения");
      }

      const data: BackendMessage[] = await response.json();

      setThreadId(selectedThreadId);
      setMessages(mapBackendMessagesToUi(data));
    } catch (error) {
      console.error("Error loading conversation messages:", error);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const handleNewChat = () => {
    if (isStreaming) return;
    setThreadId(null);
    setMessages([]);
    setCurrentMessage("");
  };

  const updateAssistantMessage = (
    messageId: number,
    content: string,
    searchInfo?: SearchInfo,
    isLoading?: boolean
  ) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              content,
              searchInfo: searchInfo ?? msg.searchInfo,
              isLoading: isLoading ?? msg.isLoading,
            }
          : msg
      )
    );
  };

  const parseSseStream = async (
    stream: ReadableStream<Uint8Array>,
    onEvent: (payload: StreamEventPayload) => void
  ) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        const lines = part
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        const dataLines = lines
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.replace(/^data:\s?/, ""));

        if (dataLines.length === 0) continue;

        const raw = dataLines.join("\n");

        try {
          const payload = JSON.parse(raw) as StreamEventPayload;
          onEvent(payload);
        } catch (error) {
          console.error("SSE parse error:", error, raw);
        }
      }

      if (done) break;
    }
  };

  const handleRenameConversation = async (selectedThreadId: string, title: string) => {
  const nextTitle = title.trim();
  if (!nextTitle) return;

  const response = await fetch(
    `${apiBase}/conversations/${encodeURIComponent(selectedThreadId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: nextTitle }),
    }
  );

  if (!response.ok) {
    throw new Error("Не удалось переименовать чат");
  }

  const updatedConversation: Conversation = await response.json();

  setConversations((prev) =>
    prev.map((conversation) =>
      conversation.thread_id === selectedThreadId
        ? updatedConversation
        : conversation
    )
  );
};

const handleDeleteConversation = async (selectedThreadId: string) => {
  const response = await fetch(
    `${apiBase}/conversations/${encodeURIComponent(selectedThreadId)}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Не удалось удалить чат");
  }

  setConversations((prev) =>
    prev.filter((conversation) => conversation.thread_id !== selectedThreadId)
  );

  if (threadId === selectedThreadId) {
    setThreadId(null);
    setMessages([]);
  }
};


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!currentMessage.trim() || isStreaming) return;

    const userInput = currentMessage.trim();
    const userMessageId = Date.now();
    const aiResponseId = userMessageId + 1;

    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        content: userInput,
        isUser: true,
        type: "message",
      },
      {
        id: aiResponseId,
        content: "",
        isUser: false,
        type: "message",
        isLoading: true,
        searchInfo: {
          stages: [],
          query: "",
          urls: [],
        },
      },
    ]);

    setCurrentMessage("");
    setIsStreaming(true);

    let streamedContent = "";
    let searchData: SearchInfo | null = null;
    let runtimeThreadId = threadId;

    try {
      const response = await fetch(`${apiBase}/chat_stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userInput,
          thread_id: threadId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Не удалось открыть поток ответа");
      }

      await parseSseStream(response.body, (data) => {
      if (data.type === "thread" && data.thread_id) {
        const newThreadId = data.thread_id;

        runtimeThreadId = newThreadId;
        setThreadId(newThreadId);

        setConversations((prev) => {
          const exists = prev.some((item) => item.thread_id === newThreadId);
          if (exists) return prev;

          const now = new Date().toISOString();
          return [
            {
              thread_id: newThreadId,
              title: userInput,
              created_at: now,
              updated_at: now,
            },
              ...prev,
            ];
          });
        } else if (data.type === "content") {
          streamedContent += data.content || "";
          updateAssistantMessage(aiResponseId, streamedContent, undefined, false);
        } else if (data.type === "search_start") {
          const newSearchInfo: SearchInfo = {
            stages: ["searching"],
            query: data.query || "",
            urls: [],
          };
          searchData = newSearchInfo;
          updateAssistantMessage(aiResponseId, streamedContent, newSearchInfo, false);
        } else if (data.type === "search_results") {
          const urls = Array.isArray(data.urls)
            ? data.urls
            : typeof data.urls === "string"
            ? JSON.parse(data.urls)
            : [];

          const newSearchInfo: SearchInfo = {
            stages: searchData ? [...searchData.stages, "reading"] : ["reading"],
            query: searchData?.query || "",
            urls,
          };

          searchData = newSearchInfo;
          updateAssistantMessage(aiResponseId, streamedContent, newSearchInfo, false);
        } else if (data.type === "error") {
          updateAssistantMessage(
            aiResponseId,
            data.message || "Произошла ошибка при обработке запроса.",
            searchData || undefined,
            false
          );
        } else if (data.type === "end") {
          if (searchData) {
            const finalSearchInfo: SearchInfo = {
              ...searchData,
              stages: [...searchData.stages, "writing"],
            };
            updateAssistantMessage(aiResponseId, streamedContent, finalSearchInfo, false);
          } else {
            updateAssistantMessage(aiResponseId, streamedContent, undefined, false);
          }
        }
      });

      if (runtimeThreadId) {
        setThreadId(runtimeThreadId);
      }

      await fetchConversations();
    } catch (error) {
      console.error("Stream error:", error);

      updateAssistantMessage(
        aiResponseId,
        "Извините, произошла ошибка при подключении к серверу.",
        undefined,
        false
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="h-screen bg-[#0f1012] flex overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        activeThreadId={threadId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      <main className="flex-1 min-w-0 flex flex-col bg-[#FCFCF8]">
        <div className="h-16 shrink-0 border-b border-gray-200 bg-white flex items-center justify-between px-6">
          <div className="min-w-0">
            <div className="text-sm text-gray-500">AI Agent</div>
            <div className="truncate text-gray-900 font-semibold">
              {activeConversation?.title || "Новый чат"}
            </div>
          </div>

          <div className="text-xs text-gray-400">
            {isStreaming
              ? "Генерация ответа..."
              : isLoadingConversation
              ? "Загрузка истории..."
              : "Готов"}
          </div>
        </div>

        <MessageArea messages={messages} />

        <InputBar
          currentMessage={currentMessage}
          setCurrentMessage={setCurrentMessage}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
};

export default Home;