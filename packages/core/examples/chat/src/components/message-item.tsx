import React from "react";
import { Box, Text } from "ink";
import { Spinner } from "@inkjs/ui";

import type { AutomergeUrl } from "@automerge/automerge-repo";
import { useDocumentProgress } from "zerno-react";
import { uint8ArrayToHex } from "@automerge/automerge-repo-keyhive/dist/utilities.js";
import { useDocument } from "@automerge/react/slim";

import type { ZernoMessage } from "../service/index.js";
import { shrinkIdentifier, identifierColor } from "../utilities.js";

export interface MessageItemProps {
  url: AutomergeUrl;
}

export function MessageItem({ url }: MessageItemProps) {
  useDocumentProgress(url);

  const [doc] = useDocument<ZernoMessage>(url);
  if (!doc) return <Spinner label="Message" />;

  const author = uint8ArrayToHex(doc.author);
  return (
    <Box flexDirection="row" flexShrink={0}>
      <Box width={13} flexShrink={0}>
        <Text color={identifierColor(author)}>
          {shrinkIdentifier(author, 6, 4)}
        </Text>
      </Box>
      <Box flexGrow={1} paddingLeft={1}>
        <Text wrap="wrap">{doc.content}</Text>
      </Box>
    </Box>
  );
}
