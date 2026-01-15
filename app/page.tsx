'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AnalysisResult {
  repository: {
    name: string;
    owner: string;
    description?: string;
    url: string;
  };
  report: {
    content: string;
    format: string;
  };
  validation: {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
  };
  tokenUsage: {
    totalTokens: number;
    estimatedCost: number;
  };
}

export default function Home() {
  const [repo, setRepo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

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
    } catch {
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
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="repo" className="block text-sm font-medium text-github-text mb-2">
                  Repository
                </label>
                <Input
                  id="repo"
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="Enter repository (e.g., facebook/react)"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Analyzing...' : 'Analyze'}
                </Button>
                <Button
                  type="button"
                  onClick={handleTryExample}
                  disabled={isLoading}
                  variant="outline"
                >
                  Try Example
                </Button>
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
          </Card>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-4">
            <Card className="p-4 flex justify-between items-center">
              <div className="flex gap-2">
                <Badge>Tokens: {result.tokenUsage?.totalTokens || 0}</Badge>
                <Badge>Cost: ${(result.tokenUsage?.estimatedCost || 0).toFixed(4)}</Badge>
              </div>
              <Button variant="ghost" onClick={handleReset}>
                Analyze Another
              </Button>
            </Card>

            <Card className="p-8 prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap">
                {result.report?.content || 'No report available'}
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}