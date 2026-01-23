import { Star, ExternalLink, Zap, FileText, Code } from 'lucide-react';
import { ScoredRepository } from '@/lib/types/chat';

interface ACSScoreCardProps {
  repository: ScoredRepository;
  onConvert: (repoUrl: string) => void;
  isConverting?: boolean;
}

const getScoreTextColor = (score: number): string => {
  if (score >= 80) return 'text-foreground';
  if (score >= 60) return 'text-foreground';
  if (score >= 40) return 'text-muted-foreground';
  return 'text-muted-foreground';
};

/**
 * ACSScoreCard - Simplified prototype-based design
 *
 * Features:
 * - Compact header with inline metadata
 * - Large ACS score badge (right-aligned)
 * - 2-column metadata grid
 * - Single CTA button
 * - Full shadcn theme support
 */
export function ACSScoreCard({ repository, onConvert, isConverting }: ACSScoreCardProps) {
  const { acsScore } = repository;

  return (
    <div className="result-card">
      {/* Header with ACS Badge */}
      <div className="result-card-header">
        <div className="flex-1">
          <a
            href={repository.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-base font-semibold text-foreground hover:underline"
          >
            <Code className="w-4 h-4" />
            <span>{repository.fullName}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Stars inline */}
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span>{repository.stars.toLocaleString()} stars</span>
          </div>
        </div>

        {/* ACS Score Badge */}
        <div className="acs-score-badge">
          <div className={`acs-score-number ${getScoreTextColor(acsScore.total)}`}>
            {acsScore.total}
          </div>
          <div className="acs-score-label">ACS SCORE</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Description */}
        {repository.description && (
          <p className="text-sm text-foreground leading-relaxed">
            {repository.description}
          </p>
        )}

        {/* Metadata Grid - 2 columns */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Code className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Interface</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {acsScore.interface}
            </div>
          </div>

          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Documentation</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {acsScore.documentation}
            </div>
          </div>
        </div>

        {/* Reasoning */}
        {repository.reasoning && (
          <div className="bg-muted border border-border rounded-lg p-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              💭 {repository.reasoning}
            </p>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={() => onConvert(repository.url)}
          disabled={isConverting}
          className="w-full bg-foreground text-background font-semibold py-3 px-4 rounded-lg hover:bg-foreground/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isConverting ? (
            <>
              <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              <span>Converting to Skill...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Convert to Skill</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
