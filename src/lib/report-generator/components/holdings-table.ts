import { InstrumentHolding } from '@/lib/models/census';
import { truncateText, getEtoroMarketUrl } from '@/lib/utils';

function renderReturnBadge(returnValue: number | undefined): string {
  if (returnValue === undefined) {
    return '<span class="badge badge-neutral">-</span>';
  }

  const badgeClass = returnValue > 0 ? 'badge-positive' : returnValue < 0 ? 'badge-negative' : 'badge-neutral';
  const prefix = returnValue > 0 ? '+' : '';

  return `<span class="badge ${badgeClass}">${prefix}${returnValue.toFixed(1)}%</span>`;
}

function renderHoldingRow(holding: InstrumentHolding, index: number, tabIndex: number): string {
  const pageNum = Math.floor(index / 20) + 1;
  const displayStyle = pageNum === 1 ? '' : 'style="display: none;"';

  const iconHtml = holding.imageUrl
    ? `<img src="${holding.imageUrl}" alt="${holding.symbol}" class="instrument-icon">`
    : `<div class="instrument-placeholder">${(holding.symbol || 'UN').slice(0, 2).toUpperCase()}</div>`;

  const symbol = holding.symbol || '';
  const etoroUrl = getEtoroMarketUrl(symbol);

  return `
    <tr class="holdings-row-${tabIndex}" data-page="${pageNum}" ${displayStyle}>
      <td class="rank">#${index + 1}</td>
      <td>
        <div class="name-cell">
          ${iconHtml}
          <div>
            <div class="name-primary" title="${holding.instrumentName || 'Unknown'}">
              ${etoroUrl ? `<a href="${etoroUrl}" target="_blank" rel="noopener noreferrer" class="external-link" title="View on eToro (external site)">${truncateText(holding.instrumentName || 'Unknown', 24)}<svg class="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>` : truncateText(holding.instrumentName || 'Unknown', 24)}
            </div>
            <div class="name-secondary">${symbol}</div>
          </div>
        </div>
      </td>
      <td class="text-right">
        <span class="badge badge-primary">${holding.holdersCount || 0}</span>
      </td>
      <td class="text-right font-medium">
        ${(holding.averageAllocation || 0).toFixed(1)}%
      </td>
      <td class="text-right">
        ${renderReturnBadge(holding.yesterdayReturn)}
      </td>
      <td class="text-right">
        ${renderReturnBadge(holding.weekTDReturn)}
      </td>
      <td class="text-right">
        ${renderReturnBadge(holding.monthTDReturn)}
      </td>
    </tr>
  `;
}

export function renderHoldingsTable(holdings: InstrumentHolding[], tabIndex: number, investorCount: number): string {
  const rows = holdings.map((holding, idx) => renderHoldingRow(holding, idx, tabIndex)).join('');

  const pagination = holdings.length > 20 ? `
    <div class="pagination">
      <div class="pagination-info">
        Showing <span id="holdings-start-${tabIndex}">1</span>-<span id="holdings-end-${tabIndex}">20</span> of ${holdings.length}
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" onclick="showHoldingsPage(${tabIndex}, 'prev')" id="holdings-prev-${tabIndex}" disabled>
          Previous
        </button>
        <button class="pagination-btn" onclick="showHoldingsPage(${tabIndex}, 'next')" id="holdings-next-${tabIndex}">
          Next
        </button>
      </div>
    </div>
  ` : '';

  return `
    <div class="card">
      <div class="card-header">
        <h3>Most Popular Holdings</h3>
        <p class="card-description">Instruments held by the highest number of investors in top ${investorCount} PIs (${holdings.length} total)</p>
      </div>
      <div class="card-content">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Asset</th>
              <th class="text-right">Holders</th>
              <th class="text-right">Avg Allocation</th>
              <th class="text-right">Yesterday</th>
              <th class="text-right">Week TD</th>
              <th class="text-right">Month TD</th>
            </tr>
          </thead>
          <tbody id="holdings-tbody-${tabIndex}">
            ${rows}
          </tbody>
        </table>
        ${pagination}
      </div>
    </div>
  `;
}
