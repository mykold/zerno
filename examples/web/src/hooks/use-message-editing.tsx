import { createContext, useContext, useRef, useState } from "react"

interface MessageEditingContextValue {
  /** Id of the message currently open in the inline editor */
  editingId: string | null
  startEditing: (id: string) => void
  /** Closes the editor and hands focus back to the composer */
  stopEditing: () => void
  /** The composer registers itself here so editing can return focus to it */
  composerRef: React.RefObject<HTMLTextAreaElement | null>
  /**
   * Newest message written by us, kept in a ref so the message list can
   * publish it on every render without re-rendering the composer. The
   * composer reads it to open the editor on ArrowUp.
   */
  lastOwnMessageIdRef: React.RefObject<string | null>
}

const MessageEditingContext = createContext<MessageEditingContextValue | null>(
  null
)

export interface MessageEditingProviderProps {
  children: React.ReactNode
}

export function MessageEditingProvider({
  children,
}: MessageEditingProviderProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const lastOwnMessageIdRef = useRef<string | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)

  const stopEditing = () => {
    setEditingId(null)
    composerRef.current?.focus()
  }

  return (
    <MessageEditingContext.Provider
      value={{
        editingId,
        startEditing: setEditingId,
        stopEditing,
        composerRef,
        lastOwnMessageIdRef,
      }}
    >
      {children}
    </MessageEditingContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMessageEditing() {
  const context = useContext(MessageEditingContext)
  if (!context) {
    throw new Error(
      "useMessageEditing must be used within a MessageEditingProvider"
    )
  }
  return context
}
