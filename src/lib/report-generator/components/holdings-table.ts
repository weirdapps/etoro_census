import { InstrumentHolding } from '@/lib/models/census';
import { truncateText } from '@/lib/utils';

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

  return `
    <tr class="holdings-row-${tabIndex}" data-page="${pageNum}" ${displayStyle}>
      <td class="rank">#${index + 1}</td>
      <td>
        <div class="name-cell">
          ${iconHtml}
          <div>
            <div class="name-primary" title="${holding.instrumentName || 'Unknown'}">${truncateText(holding.instrumentName || 'Unknown', 24)}</div>
            <div class="name-secondary">${holding.symbol || ''}</div>
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
