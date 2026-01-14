'use client';

import { useState } from 'react';

export default function Home() {
  const [repo, setRepo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!repo || !repo.includes('/')) {
      setError('Please enter a valid repository (e.g., facebook/react)');
      return;
    }

    setError(null);
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repo }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Analysis failed');
        return;
      }

      setResult(data.data);

      // Save to localStorage
      localStorage.setItem('lastAnalysis', JSON.stringify(data.data));
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setRepo('');
    setError(null);
  };

  const handleTryExample = () => {
    setRepo('facebook/react');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-github-canvas">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-github-text mb-4">
            oh-my-github
          </h1>
          <p className="text-xl text-github-text-secondary">
            AI-powered GitHub repository analysis
          </p>
        </div>

        {/* Analysis Form */}
        {!result && (
          <div className="bg-white border border-github-border rounded-lg shadow-sm p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="repo" className="block text-sm font-medium text-github-text mb-2">
                  Repository
                </label>
                <input
                  id="repo"
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="Enter repository (e.g., facebook/react)"
                  className="w-full px-4 py-2 border border-github-border rounded-md focus:outline-none focus:ring-2 focus:ring-github-primary"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-github-primary text-white px-6 py-2 rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? 'Analyzing...' : 'Analyze'}
                </button>
                <button
                  type="button"
                  onClick={handleTryExample}
                  disabled={isLoading}
                  className="px-6 py-2 border border-github-border rounded-md hover:bg-github-canvas-subtle disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Try Example
                </button>
              </div>
            </form>

            {isLoading && (
              <div className="mt-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-github-primary"></div>
                <p className="mt-2 text-sm text-github-text-secondary">
                  Analyzing repository... This may take 20-30 seconds
                </p>
              </div>
            )}
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2 items-center">
                <span className="px-3 py-1 bg-github-canvas-subtle border border-github-border rounded-full text-sm">
                  Tokens: {result.tokenUsage?.totalTokens || 0}
                </span>
                <span className="px-3 py-1 bg-github-canvas-subtle border border-github-border rounded-full text-sm">
                  Cost: ${(result.tokenUsage?.estimatedCost || 0).toFixed(4)}
                </span>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-github-primary hover:underline"
              >
                Analyze Another
              </button>
            </div>

            <div className="bg-white border border-github-border rounded-lg shadow-sm p-8 prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap">
                {result.report?.content || 'No report available'}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
