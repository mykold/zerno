import { memo } from "react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"

const remarkPlugins = [remarkGfm, remarkBreaks]

const components: Components = {
  a: ({ children, href, ...props }) => {
    if (!href) return <>{children}</>
    return (
      <a {...props} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  },

  img: ({ src, alt }) => {
    if (src) return <img src={src} alt={alt} />
    if (alt) return <span>{alt}</span>
    return null
  },
}

export interface MarkdownProps {
  children: string
}

export const Markdown = memo(function Markdown({ children }: MarkdownProps) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
})
