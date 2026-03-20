"use client";

import { useState } from "react";

interface ConversationItem {
  thread_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  conversations: ConversationItem[];
  activeThreadId: string | null;
  onSelectConversation: (threadId: string) => void;
  onNewChat: () => void;
  onRenameConversation: (threadId: string, title: string) => Promise<void>;
  onDeleteConversation: (threadId: string) => Promise<void>;
}

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
};

const ChatSidebar = ({
  conversations,
  activeThreadId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
}: ChatSidebarProps) => {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [busyThreadId, setBusyThreadId] = useState<string | null>(null);

  const startEdit = (threadId: string, currentTitle: string | null) => {
    setEditingThreadId(threadId);
    setDraftTitle(currentTitle || "");
  };

  const cancelEdit = () => {
    setEditingThreadId(null);
    setDraftTitle("");
  };

  const submitEdit = async (threadId: string) => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle) return;

    try {
      setBusyThreadId(threadId);
      await onRenameConversation(threadId, nextTitle);
      setEditingThreadId(null);
      setDraftTitle("");
    } finally {
      setBusyThreadId(null);
    }
  };

  const handleDelete = async (threadId: string) => {
    const confirmed = window.confirm("Удалить этот чат?");
    if (!confirmed) return;

    try {
      setBusyThreadId(threadId);
      await onDeleteConversation(threadId);
    } finally {
      setBusyThreadId(null);
    }
  };

  return (
    <aside className="w-[320px] shrink-0 bg-[#111214] border-r border-white/10 text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <button
          onClick={onNewChat}
          className="w-full rounded-2xl bg-[#1b1d21] hover:bg-[#23262b] transition-colors px-4 py-3 text-left font-medium text-sm"
        >
          + Новый чат
        </button>
      </div>

      <div className="px-4 pt-5 pb-2 text-xs uppercase tracking-[0.18em] text-white/35">
        Ваши чаты
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {conversations.length === 0 ? (
          <div className="px-3 py-4 text-sm text-white/40">
            Пока нет сохранённых диалогов
          </div>
        ) : (
          conversations.map((conversation) => {
            const isActive = conversation.thread_id === activeThreadId;
            const isEditing = conversation.thread_id === editingThreadId;
            const isBusy = conversation.thread_id === busyThreadId;

            return (
              <div
                key={conversation.thread_id}
                className={`group relative mb-1 rounded-2xl transition-all ${
                  isActive ? "bg-[#23262b]" : "hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-white/85" />
                )}

                {isEditing ? (
                  <div className="px-4 py-3 pl-6">
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          await submitEdit(conversation.thread_id);
                        }
                        if (e.key === "Escape") {
                          cancelEdit();
                        }
                      }}
                      className="w-full rounded-xl bg-[#1b1d21] border border-white/10 px-3 py-2 text-sm outline-none"
                      placeholder="Название чата"
                    />

                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => submitEdit(conversation.thread_id)}
                        disabled={isBusy}
                        className="rounded-lg bg-white text-black px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        Сохранить
                      </button>

                      <button
                        onClick={cancelEdit}
                        disabled={isBusy}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectConversation(conversation.thread_id)}
                    className="w-full text-left px-4 py-3 pl-6 rounded-2xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 pr-14">
                        <div className="truncate text-sm font-medium text-white">
                          {conversation.title || "Новый чат"}
                        </div>
                      </div>

                      <div className="shrink-0 text-[11px] text-white/35">
                        {formatDate(conversation.updated_at)}
                      </div>
                    </div>
                  </button>
                )}

                {!isEditing && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(conversation.thread_id, conversation.title);
                      }}
                      className="h-8 w-8 rounded-lg bg-black/20 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
                      title="Переименовать"
                    >
                      ✎
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conversation.thread_id);
                      }}
                      className="h-8 w-8 rounded-lg bg-black/20 hover:bg-red-500/20 flex items-center justify-center text-white/70 hover:text-red-300"
                      title="Удалить"
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default ChatSidebar;