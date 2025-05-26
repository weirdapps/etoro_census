'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FearGreedGaugeProps {
  value: number;
}

export default function FearGreedGauge({ value }: FearGreedGaugeProps) {
  const getColor = (value: number) => {
    if (value <= 20) return 'text-red-500';
    if (value <= 40) return 'text-orange-500';
    if (value <= 60) return 'text-yellow-500';
    if (value <= 80) return 'text-lime-500';
    return 'text-green-500';
  };

  const getLabel = (value: number) => {
    if (value <= 20) return 'Extreme Fear';
    if (value <= 40) return 'Fear';
    if (value <= 60) return 'Neutral';
    if (value <= 80) return 'Greed';
    return 'Extreme Greed';
  };

  const rotation = ((value / 100) * 180) - 90;

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
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="25%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="75%" stopColor="#84cc16" />
                <stop offset="100%" stopColor="#22c55e" />
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
            {value}
          </div>
          <div className={`text-lg font-medium ${getColor(value)}`}>
            {getLabel(value)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}