// JavaScript for HTML report client-side functionality

export const reportScripts = `
function showTab(index) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelectorAll('.tab')[index].classList.add('active');
    document.getElementById('tab-' + index).classList.add('active');
}

// Pagination for Holdings
const holdingsPages = {};
const performersPages = {};

function showHoldingsPage(tabIndex, direction) {
    if (!holdingsPages[tabIndex]) holdingsPages[tabIndex] = 1;

    const rows = document.querySelectorAll('.holdings-row-' + tabIndex);
    const totalPages = Math.ceil(rows.length / 20);

    if (direction === 'next' && holdingsPages[tabIndex] < totalPages) {
        holdingsPages[tabIndex]++;
    } else if (direction === 'prev' && holdingsPages[tabIndex] > 1) {
        holdingsPages[tabIndex]--;
    }

    const currentPage = holdingsPages[tabIndex];
    const start = (currentPage - 1) * 20 + 1;
    const end = Math.min(currentPage * 20, rows.length);

    // Hide all rows
    rows.forEach(row => row.style.display = 'none');

    // Show current page rows
    rows.forEach(row => {
        if (parseInt(row.getAttribute('data-page')) === currentPage) {
            row.style.display = '';
        }
    });

    // Update pagination info
    document.getElementById('holdings-start-' + tabIndex).textContent = start;
    document.getElementById('holdings-end-' + tabIndex).textContent = end;

    // Update button states
    document.getElementById('holdings-prev-' + tabIndex).disabled = currentPage === 1;
    document.getElementById('holdings-next-' + tabIndex).disabled = currentPage === totalPages;
}

function showPerformersPage(tabIndex, direction) {
    if (!performersPages[tabIndex]) performersPages[tabIndex] = 1;

    const rows = document.querySelectorAll('.performers-row-' + tabIndex);
    const totalPages = Math.ceil(rows.length / 20);

    if (direction === 'next' && performersPages[tabIndex] < totalPages) {
        performersPages[tabIndex]++;
    } else if (direction === 'prev' && performersPages[tabIndex] > 1) {
        performersPages[tabIndex]--;
    }

    const currentPage = performersPages[tabIndex];
    const start = (currentPage - 1) * 20 + 1;
    const end = Math.min(currentPage * 20, rows.length);

    // Hide all rows
    rows.forEach(row => row.style.display = 'none');

    // Show current page rows
    rows.forEach(row => {
        if (parseInt(row.getAttribute('data-page')) === currentPage) {
            row.style.display = '';
        }
    });

    // Update pagination info
    document.getElementById('performers-start-' + tabIndex).textContent = start;
    document.getElementById('performers-end-' + tabIndex).textContent = end;

    // Update button states
    document.getElementById('performers-prev-' + tabIndex).disabled = currentPage === 1;
    document.getElementById('performers-next-' + tabIndex).disabled = currentPage === totalPages;
}
`;
