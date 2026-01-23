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
    <div className="result-card h-[280px] flex flex-col">
      {/* Header with ACS Badge */}
      <div className="result-card-header flex-shrink-0">
        <div className="flex-1 min-w-0">
          <a
            href={repository.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:underline truncate max-w-full"
          >
            <Code className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{repository.fullName}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>

          {/* Stars inline */}
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span>{repository.stars.toLocaleString()} stars</span>
          </div>
        </div>

        {/* ACS Score Badge */}
        <div className="acs-score-badge flex-shrink-0">
          <div className={`acs-score-number ${getScoreTextColor(acsScore.total)}`}>
            {acsScore.total}
          </div>
          <div className="acs-score-label">ACS</div>
        </div>
      </div>
      {/* Body */}
      <div className="p-4 space-y-2.5 flex-1 flex flex-col min-h-0">
        {/* Description */}
        {repository.description && (
          <p className="text-sm text-foreground leading-relaxed line-clamp-2">
            {repository.description}
          </p>
        )}

        {/* Language Tag */}
        {repository.language && (
          <div className="inline-flex items-center px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground self-start">
            {repository.language}
          </div>
        )}

        {/* AI Summary (simplified reasoning) */}
        {repository.reasoningText && (
          <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-2 flex-1">
            {repository.reasoningText}
          </p>
        )}

        {/* CTA Button */}
        <button
          onClick={() => onConvert(repository.url)}
          disabled={isConverting}
          className="w-full bg-foreground text-background font-semibold py-2 px-4 rounded-lg hover:bg-foreground/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-auto"
        >
          {isConverting ? (
            <>
              <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              <span>Converting...</span>
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
