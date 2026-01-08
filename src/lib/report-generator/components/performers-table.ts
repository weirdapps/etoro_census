import { PerformerStats } from '@/lib/models/census';
import { truncateText } from '@/lib/utils';
import { getCountryFlag } from '@/lib/utils/country-mapping';

function renderPerformerRow(performer: PerformerStats, index: number, tabIndex: number): string {
  const pageNum = Math.floor(index / 20) + 1;
  const displayStyle = pageNum === 1 ? '' : 'style="display: none;"';

  const avatarHtml = performer.avatarUrl
    ? `<img src="${performer.avatarUrl}" alt="${performer.fullName}" class="avatar">`
    : `<div class="avatar-placeholder">${(performer.fullName || 'U').charAt(0).toUpperCase()}</div>`;

  const gainClass = (performer.gain || 0) >= 0 ? 'badge badge-green' : 'badge badge-red';
  const gainPrefix = (performer.gain || 0) > 0 ? '+' : '';

  const winRatioClass = (performer.winRatio || 0) >= 65
    ? 'badge badge-green'
    : (performer.winRatio || 0) >= 55
      ? 'badge badge-yellow'
      : 'badge badge-red';

  const cashClass = (performer.cashPercentage || 0) > 25
    ? 'badge-green'
    : (performer.cashPercentage || 0) >= 5
      ? 'badge-blue'
      : 'badge-red';

  const countryFlag = performer.countryId ? ` ${getCountryFlag(performer.countryId)}` : '';
  const etoroUrl = performer.username ? `https://www.etoro.com/people/${performer.username.toLowerCase()}` : '';

  return `
    <tr class="performers-row-${tabIndex}" data-page="${pageNum}" ${displayStyle}>
      <td class="rank">#${index + 1}</td>
      <td>
        <div class="name-cell">
          ${avatarHtml}
          <div>
            <div class="name-primary" title="${performer.fullName || performer.username || 'Unknown'}">
              ${etoroUrl ? `<a href="${etoroUrl}" target="_blank" rel="noopener noreferrer" class="external-link" title="View on eToro (external site)">${truncateText(performer.fullName || performer.username || 'Unknown', 24)}<svg class="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>` : truncateText(performer.fullName || performer.username || 'Unknown', 24)}
            </div>
            <div class="name-secondary" title="@${performer.username}">
              @${truncateText(performer.username, 20)}${countryFlag}
            </div>
          </div>
        </div>
      </td>
      <td class="text-right">
        <span class="badge badge-purple">${(performer.copiers || 0).toLocaleString()}</span>
      </td>
      <td class="text-right font-medium">
        <span class="${gainClass}">
          ${gainPrefix}${(performer.gain || 0).toFixed(1)}%
        </span>
      </td>
      <td class="text-right font-medium">
        ${(performer.trades || 0).toLocaleString()}
      </td>
      <td class="text-right">
        <span class="${winRatioClass}">${(performer.winRatio || 0).toFixed(1)}%</span>
      </td>
      <td class="text-right">
        <span class="risk-badge risk-${performer.riskScore || 0}">${performer.riskScore || '-'}/10</span>
      </td>
      <td class="text-right">
        <span class="badge ${cashClass}">${(performer.cashPercentage || 0).toFixed(1)}%</span>
      </td>
    </tr>
  `;
}

export function renderPerformersTable(performers: PerformerStats[], tabIndex: number, investorCount: number): string {
  const displayedPerformers = performers.slice(0, Math.min(performers.length, investorCount));
  const rows = displayedPerformers.map((performer, idx) => renderPerformerRow(performer, idx, tabIndex)).join('');

  const pagination = displayedPerformers.length > 20 ? `
    <div class="pagination">
      <div class="pagination-info">
        Showing <span id="performers-start-${tabIndex}">1</span>-<span id="performers-end-${tabIndex}">20</span> of ${displayedPerformers.length}
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" onclick="showPerformersPage(${tabIndex}, 'prev')" id="performers-prev-${tabIndex}" disabled>
          Previous
        </button>
        <button class="pagination-btn" onclick="showPerformersPage(${tabIndex}, 'next')" id="performers-next-${tabIndex}">
          Next
        </button>
      </div>
    </div>
  ` : '';

  return `
    <div class="card">
      <div class="card-header">
        <h3>Most Copied Investors</h3>
        <p class="card-description">Investors ranked by number of copiers (${displayedPerformers.length} shown)</p>
      </div>
      <div class="card-content">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Investor</th>
              <th class="text-right">Copiers</th>
              <th class="text-right">Gain (YTD)</th>
              <th class="text-right">Trades</th>
              <th class="text-right">Win Ratio</th>
              <th class="text-right">Risk Score</th>
              <th class="text-right">Cash %</th>
            </tr>
          </thead>
          <tbody id="performers-tbody-${tabIndex}">
            ${rows}
          </tbody>
        </table>
        ${pagination}
      </div>
    </div>
  `;
}
