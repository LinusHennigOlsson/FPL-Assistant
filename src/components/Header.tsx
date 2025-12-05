import { Zap } from "lucide-react";
import { useFPL } from "@/contexts/FPLContext";

export function Header() {
  const { currentGameweek } = useFPL();

  return (
    <header className="glass-card border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-foreground">
                FPL<span className="text-primary">AI</span>
              </h1>
              <p className="text-xs text-muted-foreground">Your Fantasy Football Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground px-3 py-1 bg-secondary rounded-full">
              GW {currentGameweek}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
