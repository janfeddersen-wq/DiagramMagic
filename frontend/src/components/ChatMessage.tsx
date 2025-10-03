import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
            : 'bg-white text-gray-900 border border-gray-200/50'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200/50">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-600">AI Assistant</span>
          </div>
        )}
        <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
              code: ({ children }) => (
                <code className={`${isUser ? 'bg-blue-600/50' : 'bg-gray-100'} px-1.5 py-0.5 rounded text-sm`}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className={`${isUser ? 'bg-blue-600/50' : 'bg-gray-100'} p-3 rounded-lg overflow-x-auto my-2 text-sm`}>
                  {children}
                </pre>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-3">
                  <table className={`min-w-full divide-y ${isUser ? 'divide-blue-400' : 'divide-gray-200'}`}>
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className={isUser ? 'bg-blue-600/30' : 'bg-gray-50'}>
                  {children}
                </thead>
              ),
              tbody: ({ children }) => (
                <tbody className={`divide-y ${isUser ? 'divide-blue-400' : 'divide-gray-200'}`}>
                  {children}
                </tbody>
              ),
              tr: ({ children }) => (
                <tr>{children}</tr>
              ),
              th: ({ children }) => (
                <th className={`px-3 py-2 text-left text-xs font-semibold ${isUser ? 'text-white' : 'text-gray-900'}`}>
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className={`px-3 py-2 text-sm ${isUser ? 'text-white' : 'text-gray-700'}`}>
                  {children}
                </td>
              )
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
