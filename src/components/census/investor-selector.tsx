'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InvestorSelectorProps {
  onAnalyze: (limit: number, period: string) => void;
  isLoading: boolean;
}

export default function InvestorSelector({ onAnalyze, isLoading }: InvestorSelectorProps) {
  const [limit, setLimit] = useState<number>(100);
  const [period, setPeriod] = useState<string>('CurrYear');

  const handleAnalyze = () => {
    const validLimit = Math.min(Math.max(1, limit), 1000);
    onAnalyze(validLimit, period);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setLimit(1);
      return;
    }
    
    const numValue = parseInt(value);
    if (isNaN(numValue)) {
      return; // Don't update if not a valid number
    }
    
    // Clamp between 1 and 1000
    const clampedValue = Math.min(Math.max(1, numValue), 1000);
    setLimit(clampedValue);
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Census Configuration</CardTitle>
        <CardDescription>
          Select the number of top popular investors to analyze and the time period for performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="limit">Number of Top Investors</Label>
            <Input
              id="limit"
              type="number"
              min="1"
              max="1000"
              value={limit}
              onChange={handleLimitChange}
              placeholder="1-1000 investors"
            />
            <p className="text-sm text-muted-foreground">
              Analyze portfolios of the top {limit} popular investors (1-1000)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="period">Performance Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="period">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CurrYear">Year to Date</SelectItem>
                <SelectItem value="CurrMonth">Current Month</SelectItem>
                <SelectItem value="CurrQuarter">Current Quarter</SelectItem>
                <SelectItem value="LastYear">Last Year</SelectItem>
                <SelectItem value="LastTwoYears">Last Two Years</SelectItem>
                <SelectItem value="OneMonthAgo">One Month Ago</SelectItem>
                <SelectItem value="ThreeMonthsAgo">Three Months Ago</SelectItem>
                <SelectItem value="SixMonthsAgo">Six Months Ago</SelectItem>
                <SelectItem value="OneYearAgo">One Year Ago</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Time period for calculating performance metrics
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleAnalyze} 
          disabled={isLoading}
          className="w-full bg-[#00C896] hover:bg-[#00B085] text-white font-medium"
          size="lg"
        >
          {isLoading ? 'Analyzing...' : `Analyze Top ${limit} Investors`}
        </Button>
      </CardContent>
    </Card>
  );
}