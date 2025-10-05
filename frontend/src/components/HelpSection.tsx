interface HelpSectionProps {
  onPromptClick?: (prompt: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function HelpSection({ onPromptClick, isOpen, onClose }: HelpSectionProps) {

  const examplePrompts = [
    {
      category: 'Project Management',
      prompts: [
        'Create a Gantt chart for a website development project',
        'Generate a project timeline with milestones',
        'Show a task dependency diagram'
      ]
    },
    {
      category: 'Software Architecture',
      prompts: [
        'Create a sequence diagram for user authentication',
        'Generate a class diagram for an e-commerce system',
        'Show a microservices architecture diagram'
      ]
    },
    {
      category: 'Workflows & Processes',
      prompts: [
        'Create a flowchart for order processing',
        'Generate a state diagram for user registration',
        'Show an ER diagram for a blog database'
      ]
    },
    {
      category: 'Data & Analytics',
      prompts: [
        'Create a pie chart showing sales distribution',
        'Generate a bar chart comparing quarterly revenue',
        'Show a mindmap of marketing strategies'
      ]
    }
  ];

  const uploadInfo = [
    { type: 'Images', formats: 'PNG, JPG, JPEG, GIF, WebP', description: 'Upload or paste images of diagrams to convert to Mermaid' },
    { type: 'Documents', formats: 'DOCX', description: 'Extract text content for diagram generation' },
    { type: 'Spreadsheets', formats: 'XLSX, XLS, CSV', description: 'Convert data into charts and diagrams' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Quick Start Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close help"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 bg-gradient-to-b from-gray-50 to-white">
          {/* Example Prompts */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Example Prompts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {examplePrompts.map((category, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">{category.category}</h4>
                  <div className="space-y-1.5">
                    {category.prompts.map((prompt, promptIdx) => (
                      <button
                        key={promptIdx}
                        type="button"
                        onClick={() => onPromptClick?.(prompt)}
                        className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors flex items-start gap-2 group"
                      >
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="flex-1">{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* File Upload Info */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Supported File Types
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {uploadInfo.map((info, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-blue-600">{info.type}</span>
                    <span className="text-xs text-gray-500">({info.formats})</span>
                  </div>
                  <p className="text-xs text-gray-600">{info.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>💡 Tip:</strong> You can paste images directly into the chat input (Ctrl+V / Cmd+V) for quick diagram conversion!
              </p>
            </div>
          </div>

          {/* Supported Diagram Types */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Supported Diagram Types
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {[
                { name: 'Flowchart', emoji: '🔀', desc: 'Process flows & decisions' },
                { name: 'Class', emoji: '🏗️', desc: 'OOP structures' },
                { name: 'Sequence', emoji: '🔄', desc: 'Interactions over time' },
                { name: 'ER Diagram', emoji: '🗄️', desc: 'Database relationships' },
                { name: 'State', emoji: '⚡', desc: 'State machines' },
                { name: 'Mindmap', emoji: '🧠', desc: 'Ideas & concepts' },
                { name: 'Architecture', emoji: '🏛️', desc: 'System design' },
                { name: 'Block', emoji: '📦', desc: 'Component diagrams' },
                { name: 'C4', emoji: '🎯', desc: 'Context & containers' },
                { name: 'Gantt', emoji: '📅', desc: 'Project timelines' },
                { name: 'Git', emoji: '🌳', desc: 'Branch history' },
                { name: 'Kanban', emoji: '📋', desc: 'Task boards' },
                { name: 'Packet', emoji: '📡', desc: 'Network packets' },
                { name: 'Pie', emoji: '🥧', desc: 'Data distribution' },
                { name: 'Quadrant', emoji: '📊', desc: 'Priority matrix' },
                { name: 'Radar', emoji: '🎯', desc: 'Multi-axis comparison' },
                { name: 'Requirement', emoji: '📝', desc: 'Requirements & risks' },
                { name: 'Sankey', emoji: '🌊', desc: 'Flow quantities' },
                { name: 'Timeline', emoji: '⏱️', desc: 'Events over time' },
                { name: 'Treemap', emoji: '🌲', desc: 'Hierarchical data' },
                { name: 'User Journey', emoji: '🚶', desc: 'User experiences' },
                { name: 'XY Chart', emoji: '📈', desc: 'Data plotting' }
              ].map((type, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-lg p-2 hover:border-blue-300 hover:shadow-sm transition-all group"
                  title={type.desc}
                >
                  <div className="text-center">
                    <div className="text-xl mb-1">{type.emoji}</div>
                    <div className="text-xs font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                      {type.name}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5 hidden md:block">
                      {type.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs text-purple-800">
                <strong>💡 Pro Tip:</strong> Simply describe what you want in natural language! For example: "Create a pie chart showing sales by region" or "Generate a sequence diagram for user login."
              </p>
            </div>
          </div>

          {/* Draw.io Integration */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
              Visual Editing with Draw.io
            </h3>
            <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Want to visually edit your diagram?</h4>
                  <ol className="text-xs text-gray-700 space-y-1.5 mb-3">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-green-600 flex-shrink-0">1.</span>
                      <span>Download your diagram as Markdown (click the download icon on the diagram)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-green-600 flex-shrink-0">2.</span>
                      <span>Go to <a href="https://app.diagrams.net" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">app.diagrams.net</a> (Draw.io)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-green-600 flex-shrink-0">3.</span>
                      <span>Click <strong>Arrange</strong> → <strong>Insert</strong> → <strong>Advanced</strong> → <strong>Mermaid</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-green-600 flex-shrink-0">4.</span>
                      <span>Paste your Mermaid code and enjoy full visual editing!</span>
                    </li>
                  </ol>
                  <p className="text-xs text-gray-600 italic">
                    Draw.io will convert your Mermaid diagram into a fully editable visual format with drag-and-drop capabilities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
