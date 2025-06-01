'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { InstrumentHolding } from '@/lib/models/census';
import { truncateText } from '@/lib/utils';
import Image from 'next/image';

interface TopHoldingsProps {
  holdings: InstrumentHolding[];
}

export default function TopHoldings({ holdings }: TopHoldingsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(holdings.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHoldings = holdings.slice(startIndex, startIndex + itemsPerPage);

  const formatReturn = (returnValue: number | undefined) => {
    if (returnValue === undefined || returnValue === null) return '-';
    return returnValue > 0 ? `+${returnValue.toFixed(1)}%` : `${returnValue.toFixed(1)}%`;
  };

  const getReturnBadgeClass = (returnValue: number | undefined) => {
    if (returnValue === undefined || returnValue === null) {
      return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
    }
    if (returnValue > 0) {
      return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800';
    }
    if (returnValue < 0) {
      return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
    }
    return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Popular Holdings</CardTitle>
        <CardDescription>
          Instruments held by the highest number of investors ({holdings.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Holders</TableHead>
              <TableHead className="text-right">% of PIs</TableHead>
              <TableHead className="text-right">Avg Allocation</TableHead>
              <TableHead className="text-right">Yesterday</TableHead>
              <TableHead className="text-right">Week TD</TableHead>
              <TableHead className="text-right">Month TD</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedHoldings.map((holding, index) => {
              const globalIndex = startIndex + index;
              return (
              <TableRow key={holding.instrumentId}>
                <TableCell className="font-medium">#{globalIndex + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    {holding.imageUrl ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={holding.imageUrl}
                          alt={holding.symbol}
                          fill
                          className="object-cover"
                          unoptimized
                          onError={(e) => {
                            console.log('Image failed to load:', holding.imageUrl);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-white">
                          {holding.symbol.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium" title={holding.instrumentName}>
                        {truncateText(holding.instrumentName, 24)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {holding.symbol}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {holding.holdersCount}
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {holding.holdersPercentage}%
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {holding.averageAllocation.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  <span className={getReturnBadgeClass(holding.yesterdayReturn)}>
                    {formatReturn(holding.yesterdayReturn)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={getReturnBadgeClass(holding.weekTDReturn)}>
                    {formatReturn(holding.weekTDReturn)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={getReturnBadgeClass(holding.monthTDReturn)}>
                    {formatReturn(holding.monthTDReturn)}
                  </span>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {holdings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No holdings data available
          </div>
        )}
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={holdings.length}
        />
      </CardContent>
    </Card>
  );
}