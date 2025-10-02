import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface TrialBannerProps {
  daysRemaining: number;
  onUpgrade: () => void;
}

export default function TrialBanner({ daysRemaining, onUpgrade }: TrialBannerProps) {
  if (daysRemaining > 7) return null;

  const isExpired = daysRemaining <= 0;
  const urgency = daysRemaining <= 2 ? "high" : "medium";

  return (
    <div 
      className={`border-l-4 p-4 mb-6 ${
        isExpired 
          ? "bg-destructive/10 border-destructive" 
          : urgency === "high"
          ? "bg-chart-2/10 border-chart-2"
          : "bg-chart-2/5 border-chart-2"
      }`}
      data-testid="banner-trial"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 mt-0.5 ${
            isExpired ? "text-destructive" : "text-chart-2"
          }`} />
          <div>
            <p className="font-semibold mb-1" data-testid="text-trial-status">
              {isExpired 
                ? "Trial Expired" 
                : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining in trial`
              }
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-trial-message">
              {isExpired
                ? "Upgrade now to continue tracking your earnings automatically"
                : "Upgrade to continue enjoying automatic earnings tracking after your trial ends"
              }
            </p>
          </div>
        </div>
        <Button 
          onClick={onUpgrade}
          variant={isExpired ? "destructive" : "default"}
          className="shrink-0"
          data-testid="button-upgrade"
        >
          Upgrade Now
        </Button>
      </div>
    </div>
  );
}
