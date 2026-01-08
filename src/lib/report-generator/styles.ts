// CSS styles for HTML report generation

export const reportStyles = `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background-color: #f9fafb;
    color: #111827;
    line-height: 1.5;
}

.container {
    max-width: 1120px;
    margin: 0 auto;
    padding: 0 24px;
}

.header {
    background-color: transparent;
    margin-bottom: 32px;
}

.header-content {
    max-width: 1120px;
    margin: 0 auto;
    padding: 32px 24px;
    text-align: center;
}

.header h1 {
    font-size: 2.5rem;
    font-weight: bold;
    color: #111827;
    margin-bottom: 8px;
}

.header .creator {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 8px;
}

.header .creator a {
    color: #00C896;
    text-decoration: none;
    font-weight: 500;
}

.header .creator a:hover {
    text-decoration: underline;
}

/* Tabs */
.tabs {
    display: flex;
    justify-content: center;
    margin-bottom: 32px;
    border-bottom: 1px solid #e5e7eb;
    gap: 16px;
    overflow-x: auto;
}

.tab {
    padding: 12px 24px;
    cursor: pointer;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: 1rem;
    color: #6b7280;
    transition: all 0.2s;
    white-space: nowrap;
}

.tab:hover {
    color: #111827;
}

.tab.active {
    color: #00C896;
    border-bottom-color: #00C896;
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
}

/* Cards and Grid */
.grid {
    display: grid;
    gap: 24px;
    margin-bottom: 32px;
}

.grid-cols-2 {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.grid-cols-3 {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.card {
    background: transparent;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    padding: 24px;
    box-shadow: none;
}

.card-header {
    margin-bottom: 1.5rem;
    text-align: left;
}

.card-header h3 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 0.25rem 0;
    text-align: left;
}

.card-description {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
    text-align: left;
}

.card-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: left;
}

.metric-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: #111827;
    line-height: 1;
    text-align: center;
    margin: 16px 0 8px 0;
}

.metric-label {
    font-size: 0.875rem;
    color: #6b7280;
    text-align: center;
    margin-top: 8px;
}

/* Distribution Charts */
.distribution-row {
    margin-bottom: 16px;
}

.distribution-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.distribution-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #111827;
}

.distribution-stats {
    display: flex;
    align-items: center;
    gap: 8px;
}

.distribution-count {
    font-size: 0.875rem;
    color: #6b7280;
}

.distribution-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
}

.progress-bar-container {
    width: 100%;
    height: 8px;
    background-color: #f3f4f6;
    border-radius: 9999px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    border-radius: 9999px;
    transition: width 0.7s ease;
}

/* Tables */
.table-container {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    background: transparent;
}

th {
    background-color: transparent;
    padding: 12px 16px;
    text-align: left;
    font-weight: 500;
    font-size: 0.75rem;
    color: #6b7280;
    border-bottom: 1px solid #e5e7eb;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

td {
    padding: 12px 16px;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.875rem;
}

tr:last-child td {
    border-bottom: none;
}

tr:hover {
    background-color: transparent;
}

.text-right {
    text-align: right;
}

/* Table Elements */
.name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.name-primary {
    font-weight: 500;
    color: #111827;
    font-size: 0.875rem;
}

.name-secondary {
    font-size: 0.75rem;
    color: #6b7280;
}

.rank {
    font-weight: 600;
    color: #111827;
    font-size: 0.875rem;
}

/* Instrument images */
.instrument-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
}

.instrument-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #60a5fa, #a855f7);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
}

.avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
}

.avatar-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    flex-shrink: 0;
}

/* Badges */
.badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
}

.badge-green {
    background-color: #dcfce7;
    color: #16a34a;
}

.badge-red {
    background-color: #fee2e2;
    color: #dc2626;
}

.badge-blue {
    background-color: #dbeafe;
    color: #2563eb;
}

.badge-yellow {
    background-color: #fef3c7;
    color: #ca8a04;
}

.badge-purple {
    background-color: #f3e8ff;
    color: #9333ea;
}

.badge-primary {
    background-color: rgba(0, 200, 150, 0.1);
    color: #00C896;
}

.badge-positive {
    background-color: rgba(34, 197, 94, 0.1);
    color: #16a34a;
}

.badge-negative {
    background-color: rgba(239, 68, 68, 0.1);
    color: #dc2626;
}

.badge-neutral {
    background-color: rgba(59, 130, 246, 0.1);
    color: #2563eb;
}

.risk-badge {
    padding: 4px 8px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
}

.risk-badge.risk-1,
.risk-badge.risk-2,
.risk-badge.risk-3 {
    background-color: #dcfce7;
    color: #16a34a;
}

.risk-badge.risk-4,
.risk-badge.risk-5,
.risk-badge.risk-6 {
    background-color: #fef3c7;
    color: #ca8a04;
}

.risk-badge.risk-7,
.risk-badge.risk-8,
.risk-badge.risk-9,
.risk-badge.risk-10 {
    background-color: #fee2e2;
    color: #dc2626;
}

/* Pagination */
.pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    margin-top: 16px;
}

.pagination-info {
    font-size: 0.875rem;
    color: #6b7280;
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 16px;
}

.pagination-btn {
    padding: 6px 12px;
    border: 1px solid #e5e7eb;
    background-color: transparent;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
    background-color: rgba(0, 0, 0, 0.05);
    border-color: #d1d5db;
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.hidden {
    display: none;
}

.space-y-8 > * + * {
    margin-top: 2rem;
}

/* Full width sections */
.full-width {
    width: 100%;
    background-color: #f9fafb;
    padding: 48px 0;
    margin-top: 48px;
    margin-bottom: 48px;
}

/* Footer */
.footer {
    background-color: transparent;
    margin-top: 64px;
    padding: 32px 0;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    color: #6b7280;
    font-size: 0.875rem;
}

.footer a {
    color: #00C896;
    text-decoration: none;
}

.footer a:hover {
    text-decoration: underline;
}

/* Responsive */
@media (max-width: 768px) {
    .header h1 {
        font-size: 2rem;
    }

    .metric-value {
        font-size: 2rem;
    }

    .tabs {
        justify-content: flex-start;
    }

    .grid-cols-4 {
        grid-template-columns: 1fr;
    }

    .top-row {
        grid-template-columns: 1fr;
    }
}

/* Grid helper */
.grid-cols-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
}

@media (max-width: 1024px) {
    .grid-cols-4 {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 640px) {
    .grid-cols-3 {
        grid-template-columns: 1fr;
    }
}

/* Additional utility classes */
.font-medium {
    font-weight: 500;
}

.font-semibold {
    font-weight: 600;
}

.text-muted {
    color: #6b7280;
}

/* External Links */
.external-link {
    color: #111827;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: color 0.2s;
}

.external-link:hover {
    color: #00C896;
}

.external-icon {
    width: 12px;
    height: 12px;
    opacity: 0;
    transition: opacity 0.2s;
    flex-shrink: 0;
}

.external-link:hover .external-icon {
    opacity: 1;
}
`;
