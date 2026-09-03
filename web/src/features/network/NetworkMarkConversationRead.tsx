"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markNetworkConversationReadAction } from "./networkActions";

export function NetworkMarkConversationRead({ conversationId, unreadCount }: { conversationId: string; unreadCount: number }) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (unreadCount < 1 || started.current) return;
    started.current = true;
    void markNetworkConversationReadAction(conversationId).then((result) => {
      if (result.ok) router.refresh();
    });
  }, [conversationId, router, unreadCount]);

  return null;
}
