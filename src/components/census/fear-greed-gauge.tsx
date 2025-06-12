'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FearGreedGaugeProps {
  value: number;
}

export default function FearGreedGauge({ value }: FearGreedGaugeProps) {
  const getColor = (value: number) => {
    if (value >= 20) return 'text-red-500';     // Extreme Fear (20+)
    if (value >= 15) return 'text-orange-500'; // Fear (15-19)
    if (value >= 12) return 'text-yellow-500'; // Neutral (12-14)
    if (value >= 8) return 'text-lime-500';    // Greed (8-11)
    return 'text-green-500';                   // Extreme Greed (7-)
  };

  const getLabel = (value: number) => {
    if (value >= 20) return 'Extreme Fear';
    if (value >= 15) return 'Fear';
    if (value >= 12) return 'Neutral';
    if (value >= 8) return 'Greed';
    return 'Extreme Greed';
  };

  // Scale value from 4-25 range to 0-100 for gauge display
  // 4 = 100% (rightmost), 25 = 0% (leftmost)
  const normalizedValue = Math.max(0, Math.min(100, ((25 - value) / (25 - 4)) * 100));
  const rotation = ((normalizedValue / 100) * 180) - 90;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fear & Greed Index</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-48 h-24 mb-4">
          <svg width="192" height="96" viewBox="0 0 192 96" className="overflow-visible">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />   {/* Red - Extreme Fear (left) */}
                <stop offset="25%" stopColor="#f97316" />  {/* Orange - Fear */}
                <stop offset="50%" stopColor="#eab308" />  {/* Yellow - Neutral */}
                <stop offset="75%" stopColor="#84cc16" />  {/* Lime - Greed */}
                <stop offset="100%" stopColor="#22c55e" /> {/* Green - Extreme Greed (right) */}
              </linearGradient>
            </defs>
            
            <path
              d="M 16 80 A 80 80 0 0 1 176 80"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            
            <line
              x1="96"
              y1="80"
              x2="96"
              y2="20"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="text-foreground"
              style={{
                transformOrigin: '96px 80px',
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.5s ease-in-out'
              }}
            />
            
            <circle cx="96" cy="80" r="4" fill="currentColor" className="text-foreground" />
          </svg>
        </div>
        
        <div className="text-center">
          <div className={`text-3xl font-bold ${getColor(value)}`}>
            {Math.round(normalizedValue)}
          </div>
          <div className={`text-lg font-medium ${getColor(value)}`}>
            {getLabel(value)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}