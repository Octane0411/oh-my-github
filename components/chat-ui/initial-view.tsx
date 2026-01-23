import { Search, Sparkles, Zap, Github } from 'lucide-react';

interface InitialViewProps {
  onSubmit: (message: string) => void;
}

const trendingSkills = [
  { icon: '📄', name: 'PDF Tools', query: 'Find me a repo for PDF manipulation' },
  { icon: '🎥', name: 'Video Downloader', query: 'I need a YouTube video downloader' },
  { icon: '📊', name: 'Data Visualization', query: 'Find me chart and graph libraries' },
  { icon: '🔐', name: 'Authentication', query: 'I need JWT authentication tools' },
];

export function InitialView({ onSubmit }: InitialViewProps) {
  const handleQuickStart = (query: string) => {
    onSubmit(query);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.16))] px-4 py-12">
      <div className="w-full max-w-4xl space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-muted rounded-full text-sm text-foreground font-medium">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Skill Generation</span>
          </div>

          <h1 className="text-5xl font-bold text-foreground tracking-tight">
            Convert Any GitHub Repo
            <br />
            <span className="text-foreground">
              Into an Agent Skill
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Describe what you need, and I'll help you discover the perfect repository and transform it into a ready-to-use Claude Agent skill.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('query') as HTMLInputElement;
              if (input.value.trim()) {
                onSubmit(input.value);
                input.value = '';
              }
            }}
            className="relative"
          >
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              name="query"
              placeholder="Try: 'I need a tool to extract data from PDFs' or paste a GitHub URL..."
              className="w-full pl-12 pr-4 py-4 text-lg border-2 border-border rounded-xl focus:border-foreground focus:ring-4 focus:ring-muted transition-all outline-none"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
              <button
                type="submit"
                className="px-6 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors font-medium flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Start</span>
              </button>
            </div>
          </form>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>💡 Tip: Be specific about your use case for better results</span>
            <span className="flex items-center space-x-1">
              <Github className="w-3 h-3" />
              <span>or paste a repo URL for direct conversion</span>
            </span>
          </div>
        </div>

        {/* Trending Skills */}
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <span className="w-8 h-px bg-github-border"></span>
            <span className="font-medium">Trending Skills</span>
            <span className="w-8 h-px bg-github-border"></span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {trendingSkills.map((skill) => (
              <button
                key={skill.name}
                onClick={() => handleQuickStart(skill.query)}
                className="group flex flex-col items-center p-4 bg-white border border-github-border rounded-xl hover:border-blue-500 hover:shadow-md transition-all"
              >
                <span className="text-3xl mb-2">{skill.icon}</span>
                <span className="text-sm font-medium text-foreground group-hover:text-blue-600 transition-colors">
                  {skill.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 pt-8">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Search className="w-6 h-6 text-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">Smart Discovery</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered search finds the best repositories for your needs
            </p>
          </div>

          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6 text-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">Instant Conversion</h3>
            <p className="text-sm text-muted-foreground">
              Automatically generates skills with documentation and examples
            </p>
          </div>

          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 text-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">Quality Scored</h3>
            <p className="text-sm text-muted-foreground">
              ACS scoring ensures compatibility with Claude agents
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
