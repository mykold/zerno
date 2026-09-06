import { useMemo } from "react";
import type { DocMap } from "@automerge/react";

import type { ZernoMessage, ZernoMessageList } from "../service/messages.js";
import { applyQueryOption } from "../service/query-option.js";
import type { QueryOption } from "../service/query-option.js";

export function useMessages(
  messageLists: DocMap<ZernoMessageList>,
  option?: QueryOption,
) {
  return useMemo(() => {
    if (!messageLists || messageLists.size === 0) return [];
    const messages: ZernoMessage[] = [];
    for (const doc of messageLists.values()) {
      if (!doc) continue;
      messages.push(...doc.messages);
    }
    messages.sort((a, b) => a.createdAt - b.createdAt);
    // TODO: We merge and sort all messages just to show the latest few.
    // This will lag the app when the chat gets big.
    // We need a way to process only the chunks we actually need.
    return applyQueryOption(messages, option);
  }, [messageLists, option?.limit, option?.offset, option?.order]);
}
