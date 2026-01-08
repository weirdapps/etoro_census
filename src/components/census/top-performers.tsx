'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { PerformerStats } from '@/lib/models/census';
import { truncateText } from '@/lib/utils';
import { getCountryFlag } from '@/lib/utils/country-mapping';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Search } from 'lucide-react';

interface TopPerformersProps {
  performers: PerformerStats[];
}

type SortField = 'copiers' | 'gain' | 'trades' | 'winRatio' | 'cashPercentage' | 'riskScore';
type SortDirection = 'asc' | 'desc';

export default function TopPerformers({ performers }: TopPerformersProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('copiers');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const itemsPerPage = 20;

  // Filter performers based on search query
  const filteredPerformers = useMemo(() => {
    if (!searchQuery.trim()) return performers;
    const query = searchQuery.toLowerCase();
    return performers.filter(performer =>
      performer.fullName?.toLowerCase().includes(query) ||
      performer.username?.toLowerCase().includes(query)
    );
  }, [performers, searchQuery]);

  // Sort filtered performers
  const sortedPerformers = useMemo(() => {
    return [...filteredPerformers].sort((a, b) => {
      const aValue = a[sortField] ?? 0;
      const bValue = b[sortField] ?? 0;
      const modifier = sortDirection === 'asc' ? 1 : -1;
      return (aValue - bValue) * modifier;
    });
  }, [filteredPerformers, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedPerformers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPerformers = sortedPerformers.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when search or sort changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
    }
    return <ArrowUpDown className="h-4 w-4 opacity-50" />;
  };

  const formatGain = (gain: number) => {
    return gain > 0 ? `+${gain.toFixed(1)}%` : `${gain.toFixed(1)}%`;
  };

  const getGainColor = (gain: number) => {
    return gain > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getCashBadgeClass = (cashPercentage: number) => {
    if (cashPercentage > 25) {
      return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
    if (cashPercentage >= 5) {
      return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
    return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  };

  const getRiskBadgeClass = (riskScore: number) => {
    if (riskScore <= 3) {
      return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
    if (riskScore <= 6) {
      return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
    return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Most Copied Investors</CardTitle>
            <CardDescription>
              Investors ranked by number of copiers ({performers.length} total)
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search investors..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        <Table className="min-w-[850px]">
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Investor</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort('gain')}>
                <div className="flex items-center justify-end gap-1">Gain (YTD){renderSortIcon('gain')}</div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort('trades')}>
                <div className="flex items-center justify-end gap-1">Trades{renderSortIcon('trades')}</div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort('winRatio')}>
                <div className="flex items-center justify-end gap-1">Win Ratio{renderSortIcon('winRatio')}</div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort('cashPercentage')}>
                <div className="flex items-center justify-end gap-1">Cash %{renderSortIcon('cashPercentage')}</div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort('riskScore')}>
                <div className="flex items-center justify-end gap-1">Risk Score{renderSortIcon('riskScore')}</div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort('copiers')}>
                <div className="flex items-center justify-end gap-1">Copiers{renderSortIcon('copiers')}</div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPerformers.map((performer, index) => {
              const globalIndex = startIndex + index;
              return (
              <TableRow key={performer.username} className="hover:bg-muted/50 transition-colors">
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
                      <a
                        href={`https://www.etoro.com/people/${performer.username.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:text-primary transition-colors inline-flex items-center gap-1 group"
                        title={`View ${performer.fullName} on eToro (external site)`}
                      >
                        {truncateText(performer.fullName, 24)}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
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
                  <span className={getCashBadgeClass(performer.cashPercentage)}>
                    {performer.cashPercentage.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={getRiskBadgeClass(performer.riskScore)}>
                    {performer.riskScore}/10
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                    {performer.copiers.toLocaleString()}
                  </span>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>

        {sortedPerformers.length === 0 && searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            No investors found matching &quot;{searchQuery}&quot;
          </div>
        )}

        {performers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No performer data available
          </div>
        )}

        {sortedPerformers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={sortedPerformers.length}
          />
        )}
      </CardContent>
    </Card>
  );
}
