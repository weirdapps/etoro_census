'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { InstrumentHolding } from '@/lib/models/census';
import { truncateText } from '@/lib/utils';
import Image from 'next/image';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Search } from 'lucide-react';

interface TopHoldingsProps {
  holdings: InstrumentHolding[];
}

type SortField = 'holdersCount' | 'holdersPercentage' | 'averageAllocation' | 'yesterdayReturn' | 'weekTDReturn' | 'monthTDReturn';
type SortDirection = 'asc' | 'desc';

export default function TopHoldings({ holdings }: TopHoldingsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('holdersCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const itemsPerPage = 20;

  // Filter holdings based on search query
  const filteredHoldings = useMemo(() => {
    if (!searchQuery.trim()) return holdings;
    const query = searchQuery.toLowerCase();
    return holdings.filter(holding =>
      holding.instrumentName?.toLowerCase().includes(query) ||
      holding.symbol?.toLowerCase().includes(query)
    );
  }, [holdings, searchQuery]);

  // Sort filtered holdings
  const sortedHoldings = useMemo(() => {
    return [...filteredHoldings].sort((a, b) => {
      const aValue = a[sortField] ?? 0;
      const bValue = b[sortField] ?? 0;
      const modifier = sortDirection === 'asc' ? 1 : -1;
      return (aValue - bValue) * modifier;
    });
  }, [filteredHoldings, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedHoldings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHoldings = sortedHoldings.slice(startIndex, startIndex + itemsPerPage);

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

  const formatReturn = (returnValue: number | undefined) => {
    if (returnValue === undefined || returnValue === null) return '-';
    return returnValue > 0 ? `+${returnValue.toFixed(1)}%` : `${returnValue.toFixed(1)}%`;
  };

  const getReturnBadgeClass = (returnValue: number | undefined) => {
    if (returnValue === undefined || returnValue === null) {
      return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
    if (returnValue > 0) {
      return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
    if (returnValue < 0) {
      return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }
    return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Most Popular Holdings</CardTitle>
            <CardDescription>
              Instruments held by the highest number of investors ({holdings.length} total)
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort('holdersCount')}>
                <div className="flex items-center justify-end gap-1">Holders{renderSortIcon('holdersCount')}</div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort('holdersPercentage')}>
                <div className="flex items-center justify-end gap-1">% of PIs{renderSortIcon('holdersPercentage')}</div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort('averageAllocation')}>
                <div className="flex items-center justify-end gap-1">Avg Allocation{renderSortIcon('averageAllocation')}</div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort('yesterdayReturn')}>
                <div className="flex items-center justify-end gap-1">Yesterday{renderSortIcon('yesterdayReturn')}</div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort('weekTDReturn')}>
                <div className="flex items-center justify-end gap-1">Week TD{renderSortIcon('weekTDReturn')}</div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort('monthTDReturn')}>
                <div className="flex items-center justify-end gap-1">Month TD{renderSortIcon('monthTDReturn')}</div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedHoldings.map((holding, index) => {
              const globalIndex = startIndex + index;
              return (
              <TableRow key={holding.instrumentId} className="hover:bg-muted/50 transition-colors">
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
                      <a
                        href={`https://www.etoro.com/markets/${holding.symbol.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:text-primary transition-colors inline-flex items-center gap-1 group"
                        title={`View ${holding.instrumentName} on eToro (external site)`}
                      >
                        {truncateText(holding.instrumentName, 24)}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
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
        </div>

        {sortedHoldings.length === 0 && searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            No assets found matching &quot;{searchQuery}&quot;
          </div>
        )}

        {holdings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No holdings data available
          </div>
        )}

        {sortedHoldings.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={sortedHoldings.length}
          />
        )}
      </CardContent>
    </Card>
  );
}
