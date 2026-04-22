import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  messages: Message[]
  isStreaming: boolean
  error: string | null
}

export function Answer({ messages, isStreaming, error }: Props): JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0 && !error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-600">
        <span className="text-2xl">⌘⇧Space</span>
        <span className="text-xs">Cmd+Shift+Space to capture screen</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
      {messages.map((msg, i) =>
        msg.role === 'user' ? (
          <div key={i} className="text-xs text-gray-500 italic">{msg.content}</div>
        ) : (
          <div key={i} className="text-sm text-gray-100">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const code = String(children).replace(/\n$/, '')
                  if (match) {
                    return (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        customStyle={{ fontSize: '12px', borderRadius: '6px', margin: '6px 0' }}
                      >
                        {code}
                      </SyntaxHighlighter>
                    )
                  }
                  return (
                    <code className="bg-gray-800 text-green-400 px-1.5 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  )
                },
                h2({ children }) {
                  return <h2 className="text-blue-400 font-bold mt-4 mb-1 text-sm first:mt-0">{children}</h2>
                },
                strong({ children }) {
                  return <strong className="text-blue-300 font-semibold">{children}</strong>
                },
                ul({ children }) {
                  return <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>
                },
                li({ children }) {
                  return <li className="text-gray-200 text-sm">{children}</li>
                },
                p({ children }) {
                  return <p className="text-gray-200 my-1 leading-relaxed">{children}</p>
                }
              }}
            >
              {msg.content}
            </ReactMarkdown>
            {i === messages.length - 1 && isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle rounded-sm" />
            )}
          </div>
        )
      )}
      {error && (
        <div className="text-red-400 text-xs p-2 bg-red-900/20 rounded border border-red-800/50">
          {error}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
