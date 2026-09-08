import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"

interface MessageEditingContextValue {
  editingId: string | null
  startEditing: (id: string) => void
  stopEditing: () => void
  composerRef: React.RefObject<HTMLTextAreaElement | null>
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

  const stopEditing = useCallback(() => {
    setEditingId(null)
    composerRef.current?.focus()
  }, [])

  const value = useMemo(
    () => ({
      editingId,
      startEditing: setEditingId,
      stopEditing,
      composerRef,
      lastOwnMessageIdRef,
    }),
    [editingId, stopEditing]
  )

  return (
    <MessageEditingContext.Provider value={value}>
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
