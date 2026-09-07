import { createContext, useContext, useState } from "react"

interface MessageEditingContextValue {
  /** Id of the message currently open in the inline editor */
  editingId: string | null
  startEditing: (id: string) => void
  stopEditing: () => void
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

  return (
    <MessageEditingContext.Provider
      value={{
        editingId,
        startEditing: setEditingId,
        stopEditing: () => setEditingId(null),
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
