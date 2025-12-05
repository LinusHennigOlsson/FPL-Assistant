import { useCurrentGameweek, useFPLData } from '@/hooks/useFPLData';
import { RefreshCw, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export function GameweekInfo() {
  const { currentGameweek, nextDeadline, isLoading } = useCurrentGameweek();
  const { refetch } = useFPLData();

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-border/50">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground">Gameweek</span>
        <span className="font-bold text-foreground">{currentGameweek}</span>
      </div>
      
      {nextDeadline && (
        <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-border/50">
          <Clock className="h-4 w-4 text-accent" />
          <span className="text-sm text-muted-foreground">Next Deadline:</span>
          <span className="font-medium text-foreground">
            {format(nextDeadline, 'MMM d, HH:mm')}
          </span>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isLoading}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Updating...' : 'Refresh Data'}
      </Button>
    </div>
  );
}
