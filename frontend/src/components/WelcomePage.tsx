import { useState } from 'react';

interface WelcomePageProps {
  onShowAuth: () => void;
}

export function WelcomePage({ onShowAuth }: WelcomePageProps) {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          {/* Logo/Title */}
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            Diagram<span className="text-blue-600">Magic</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Create stunning diagrams with AI-powered assistance
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Features */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Features</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">AI-Powered Generation</p>
                  <p className="text-sm text-gray-600">Lightning-fast diagram creation with Cerebras inference</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">Image to Diagram</p>
                  <p className="text-sm text-gray-600">Convert images to diagrams using Meta Llama 4 Scout (free!)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">Project Management</p>
                  <p className="text-sm text-gray-600">Organize diagrams with projects and version history</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">Multiple Formats</p>
                  <p className="text-sm text-gray-600">Support for flowcharts, sequence diagrams, ERDs, and more</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">Export Options</p>
                  <p className="text-sm text-gray-600">Save as Markdown or PNG images</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">Draw.io Integration</p>
                  <p className="text-sm text-gray-600">Import existing Draw.io diagrams</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Get Started */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Get Started</h2>
            <div className="space-y-4 mb-8">
              <p className="text-gray-700">
                Sign in to start creating professional diagrams with AI assistance.
                Save your work, organize projects, and track diagram versions.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">Powered by:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Cerebras</strong> - Ultra-fast AI inference</li>
                  <li>• <strong>Meta Llama 4 Scout</strong> - Free image recognition</li>
                  <li>• <strong>Mermaid.js</strong> - Beautiful diagram rendering</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setIsSignUp(false);
                  onShowAuth();
                }}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsSignUp(true);
                  onShowAuth();
                }}
                className="w-full py-3 px-6 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-colors border-2 border-gray-300"
              >
                Create Account
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Free to use • No credit card required
              </p>
            </div>
          </div>
        </div>

        {/* Example Diagram Types */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Supported Diagram Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Flowcharts', icon: '📊' },
              { name: 'Sequence', icon: '🔄' },
              { name: 'Class Diagrams', icon: '🏗️' },
              { name: 'State Diagrams', icon: '🔀' },
              { name: 'ER Diagrams', icon: '🗄️' },
              { name: 'Gantt Charts', icon: '📅' },
              { name: 'Git Graphs', icon: '🌳' },
              { name: 'Mindmaps', icon: '🧠' }
            ].map((type) => (
              <div
                key={type.name}
                className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-3xl mb-2">{type.icon}</span>
                <span className="text-sm font-medium text-gray-700">{type.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
