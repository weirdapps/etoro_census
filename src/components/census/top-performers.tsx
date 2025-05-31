'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { PerformerStats } from '@/lib/models/census';
import { truncateText } from '@/lib/utils';
import { getCountryFlag } from '@/lib/utils/country-mapping';

interface TopPerformersProps {
  performers: PerformerStats[];
}

export default function TopPerformers({ performers }: TopPerformersProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(performers.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPerformers = performers.slice(startIndex, startIndex + itemsPerPage);

  const formatGain = (gain: number) => {
    return gain > 0 ? `+${gain.toFixed(1)}%` : `${gain.toFixed(1)}%`;
  };

  const getGainColor = (gain: number) => {
    return gain > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Copied Investors</CardTitle>
        <CardDescription>
          Investors ranked by number of copiers ({performers.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Investor</TableHead>
              <TableHead className="text-right">Gain (YTD)</TableHead>
              <TableHead className="text-right">Trades</TableHead>
              <TableHead className="text-right">Win Ratio</TableHead>
              <TableHead className="text-right">Cash %</TableHead>
              <TableHead className="text-right">Risk Score</TableHead>
              <TableHead className="text-right">Copiers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPerformers.map((performer, index) => {
              const globalIndex = startIndex + index;
              return (
              <TableRow key={performer.username}>
                <TableCell className="font-medium">#{globalIndex + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      {performer.avatarUrl ? (
                        <Image 
                          src={performer.avatarUrl} 
                          alt={performer.fullName}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                          {performer.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium" title={performer.fullName}>
                        {truncateText(performer.fullName, 24)}
                      </div>
                      <div className="text-sm text-muted-foreground" title={performer.username}>
                        @{truncateText(performer.username, 20)} {getCountryFlag(performer.countryId)}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className={`text-right font-medium ${getGainColor(performer.gain)}`}>
                  {formatGain(performer.gain)}
                </TableCell>
                <TableCell className="text-right">
                  {performer.trades}
                </TableCell>
                <TableCell className="text-right">
                  {performer.winRatio.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {performer.cashPercentage.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    performer.riskScore <= 3 
                      ? 'bg-green-100 text-green-800' 
                      : performer.riskScore <= 6
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {performer.riskScore}/10
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {performer.copiers.toLocaleString()}
                  </span>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {performers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No performer data available
          </div>
        )}
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={performers.length}
        />
      </CardContent>
    </Card>
  );
}