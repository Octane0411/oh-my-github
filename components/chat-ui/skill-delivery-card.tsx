import { Download, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import { SkillArtifact } from '@/lib/types/chat';
import { Button } from '@/components/ui/button';

interface SkillDeliveryCardProps {
  artifact: SkillArtifact;
  onDownload: () => void;
  onReset: () => void;
}

export function SkillDeliveryCard({ artifact, onDownload, onReset }: SkillDeliveryCardProps) {
  const handleCopyContent = () => {
    navigator.clipboard.writeText(artifact.content);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-2xl p-8 space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">
            ✨ Skill Ready!
          </h2>
          <p className="text-lg text-muted-foreground">
            Your Agent Skill has been successfully generated
          </p>
        </div>

        {/* Skill Info */}
        <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              {artifact.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {artifact.description}
            </p>
          </div>

          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Source:</span>
              <a
                href={artifact.repository.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center space-x-1 font-medium"
              >
                <span>{artifact.repository.owner}/{artifact.repository.name}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Instructions Preview */}
          {artifact.instructions.length > 0 && (
            <div className="pt-4 border-t border-github-border">
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Quick Start:
              </h4>
              <ul className="space-y-1.5">
                {artifact.instructions.slice(0, 3).map((instruction, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start">
                    <span className="text-blue-600 font-bold mr-2">{idx + 1}.</span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onDownload}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Skill File</span>
          </Button>

          <Button
            onClick={handleCopyContent}
            variant="outline"
            className="flex-1 border-2 border-foreground text-foreground hover:bg-muted font-medium py-3 rounded-lg transition-colors"
          >
            Copy to Clipboard
          </Button>
        </div>

        {/* Follow-up Actions */}
        <div className="pt-4 border-t border-border space-y-3">
          <h4 className="text-sm font-semibold text-foreground">
            What&apos;s next?
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onReset}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-background border border-border rounded-lg hover:border-foreground hover:bg-muted transition-all text-sm font-medium text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Create Another Skill</span>
            </button>

            <a
              href="/docs"
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-background border border-border rounded-lg hover:border-foreground hover:bg-muted transition-all text-sm font-medium text-foreground"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Documentation</span>
            </a>
          </div>
        </div>

        {/* Metadata */}
        <div className="text-center text-xs text-muted-foreground pt-2">
          Created on {new Date(artifact.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
