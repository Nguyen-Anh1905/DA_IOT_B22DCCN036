// Action History JavaScript
let currentPage = 0; // 0-based like Datasensor
let currentSize = 10;
let totalPages = 1;
let currentSort = { field: null, order: null };
let allData = [];

// DOM elements
let searchInput, deviceDropdown, statusDropdown, searchBtn, tbody, loadingElement, errorElement, paginationElement, pageInfo, pageJumpInput, pageSizeInput;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    handleInitialLoad(); // Use initial load function
});

function initializeElements() {
    searchInput = document.getElementById('searchInput');
    deviceDropdown = document.getElementById('deviceDropdown');
    statusDropdown = document.getElementById('statusDropdown');
    searchBtn = document.getElementById('searchBtn');
    tbody = document.getElementById('dataBody');
    loadingElement = document.getElementById('loading');
    errorElement = document.getElementById('error');
    paginationElement = document.getElementById('paginationContainer');
}

function setupEventListeners() {
    // Search functionality
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Dropdown functionality
    setupDropdown('deviceDropdown', 'deviceDropdownList');
    setupDropdown('statusDropdown', 'statusDropdownList');



    // Sort functionality
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', function() {
            const field = this.getAttribute('data-sort');
            handleSort(field);
        });
    });
}

function setupDropdown(buttonId, listId) {
    const btn = document.getElementById(buttonId);
    const list = document.getElementById(listId);
    
    btn.addEventListener('click', function() {
        // Close other dropdowns
        document.querySelectorAll('.dropdown-list.show').forEach(dropdown => {
            if (dropdown.id !== listId) {
                dropdown.classList.remove('show');
            }
        });
        
        list.classList.toggle('show');
    });

    // Handle dropdown item selection
    list.addEventListener('click', function(e) {
        if (e.target.classList.contains('dropdown-item')) {
            const value = e.target.getAttribute('data-value');
            const text = e.target.textContent;
            
            btn.querySelector('span').textContent = text;
            btn.setAttribute('data-value', value);
            list.classList.remove('show');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!btn.contains(e.target) && !list.contains(e.target)) {
            list.classList.remove('show');
        }
    });
}

async function loadData() {
    showLoading();
    
    try {
        let url;
        let params = new URLSearchParams();
        
        // Check if this is a search request
        const searchTerm = searchInput.value.trim();
        const deviceValue = deviceDropdown.getAttribute('data-value');
        const statusValue = statusDropdown.getAttribute('data-value');
        const hasFilters = searchTerm || (deviceValue && deviceValue !== 'all') || (statusValue && statusValue !== 'all');
        
        // Always use search API but with different parameters
        url = 'http://localhost:8080/api/actionhistory/search';
        
        // Page starts from 0 for search API
        params.append('page', currentPage);
        params.append('size', currentSize);
        
        // Add search keyword (empty if no search)
        params.append('keyword', searchTerm || '');
        
        // Add device filter
        params.append('device', (deviceValue && deviceValue !== 'all') ? deviceValue : 'all');
        
        // Add status filter
        params.append('status', (statusValue && statusValue !== 'all') ? statusValue : 'all');
        
        // Add sorting
        if (currentSort.field && currentSort.order) {
            params.append('sortBy', currentSort.field);
            params.append('direction', currentSort.order);
        } else {
            params.append('sortBy', 'id');
            params.append('direction', 'desc');
        }

        console.log('API Call:', `${url}?${params.toString()}`); // Debug log
        
        const response = await fetch(`${url}?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        // Handle search API response format
        if (data) {
            allData = data.content || data.data || [];
            totalPages = data.totalPages || 1;
            renderTable(allData);
            renderPagination(data);
            hideError();
        } else {
            throw new Error('Invalid response format');
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError(`Failed to load action history data: ${error.message}`);
        renderTable([]);
    } finally {
        hideLoading();
    }
}

function renderTable(data) {
    console.log('Rendering table with data:', data); // Debug log
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">No data found</td></tr>';
        return;
    }
    
    data.forEach(item => {
        console.log('Processing item:', item); // Debug log
        const row = document.createElement('tr');
        
        // Format status with appropriate styling
        const status = item.status || item.action || 'UNKNOWN';
        const statusClass = status === 'ON' ? 'status-on' : 'status-off';
        const statusText = status === 'ON' ? 'ON' : 'OFF';
        
        // Format date - handle different time field names
        const timeField = item.time || item.timestamp || item.createdAt || item.date;
        const formattedDate = timeField ? formatDate(timeField) : 'N/A';
        
        row.innerHTML = `
            <td>${item.id || 'N/A'}</td>
            <td>${item.device || item.deviceName || 'N/A'}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td>${formattedDate}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    
    // Format: 2025-09-23 06:38:32
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function renderPagination(data) {
    const container = document.getElementById('paginationContainer');
    
    if (!data.totalPages) {
        container.innerHTML = '';
        return;
    }
    
    const totalPages = data.totalPages;
    const currentPageNum = data.number;
    const totalElements = data.totalElements;
    
    let paginationHTML = `
        <button id="prevBtn" ${currentPageNum === 0 ? 'disabled' : ''} onclick="changePage(${currentPageNum - 1})">Prev</button>
    `;
    
    // Page numbers logic
    if (totalPages <= 5) {
        // Show all pages if 5 or less
        for (let i = 0; i < totalPages; i++) {
            paginationHTML += `
                <button class="${i === currentPageNum ? 'active' : ''}" onclick="changePage(${i})">${i + 1}</button>
            `;
        }
    } else {
        // Show 1, 2, ..., current-1, current, current+1, ..., last-1, last
        // Always show page 1
        paginationHTML += `<button class="${0 === currentPageNum ? 'active' : ''}" onclick="changePage(0)">1</button>`;
        
        if (currentPageNum > 3) {
            // Show ellipsis with input
            paginationHTML += `<button class="page-ellipsis" onclick="showPageJump()">...</button>`;
        }
        
        // Show pages around current page
        const start = Math.max(1, currentPageNum - 1);
        const end = Math.min(totalPages - 2, currentPageNum + 1);
        
        for (let i = start; i <= end; i++) {
            if (i !== 0 && i !== totalPages - 1) {
                paginationHTML += `
                    <button class="${i === currentPageNum ? 'active' : ''}" onclick="changePage(${i})">${i + 1}</button>
                `;
            }
        }
        
        if (currentPageNum < totalPages - 4) {
            // Show ellipsis with input
            paginationHTML += `<button class="page-ellipsis" onclick="showPageJump()">...</button>`;
        }
        
        // Always show last page
        if (totalPages > 1) {
            paginationHTML += `<button class="${totalPages - 1 === currentPageNum ? 'active' : ''}" onclick="changePage(${totalPages - 1})">${totalPages}</button>`;
        }
    }
    
    paginationHTML += `
        <button id="nextBtn" ${currentPageNum >= totalPages - 1 ? 'disabled' : ''} onclick="changePage(${currentPageNum + 1})">Next</button>
        
        <div class="page-size-container">
            <span>Page Size:</span>
            <input type="number" class="page-size-input" value="${currentSize}" min="1" max="1000" onchange="updatePageSize(this.value)" onkeypress="handlePageSizeEnter(event)">
        </div>
    `;
    
    container.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    if (page < 0) return;
    currentPage = page;
    loadData();
}

// Show page jump input
function showPageJump() {
    const ellipsis = event.target;
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'page-jump-input';
    input.min = '1';
    input.placeholder = '...';
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const pageNum = parseInt(this.value) - 1; // Convert to 0-based
            if (pageNum >= 0) {
                changePage(pageNum);
            }
        }
    });
    input.addEventListener('blur', function() {
        // Restore ellipsis when input loses focus
        ellipsis.textContent = '...';
        ellipsis.onclick = showPageJump;
    });
    
    ellipsis.textContent = '';
    ellipsis.appendChild(input);
    input.focus();
    ellipsis.onclick = null;
}

// Update page size from input
function updatePageSize(value) {
    const newSize = parseInt(value);
    if (newSize >= 1 && newSize <= 100) {
        currentSize = newSize;
        currentPage = 0; // Reset to first page
        loadData();
    }
}

// Handle Enter key in page size input
function handlePageSizeEnter(event) {
    if (event.key === 'Enter') {
        updatePageSize(event.target.value);
    }
}



function handleSearch() {
    currentPage = 0; // Reset to first page (0-based)
    loadData();
}

// Add function to handle initial page load
function handleInitialLoad() {
    // Reset all filters for initial load
    if (searchInput) searchInput.value = '';
    if (deviceDropdown) {
        deviceDropdown.setAttribute('data-value', 'all');
        const deviceSpan = deviceDropdown.querySelector('span');
        if (deviceSpan) deviceSpan.textContent = 'All Device';
    }
    if (statusDropdown) {
        statusDropdown.setAttribute('data-value', 'all');
        const statusSpan = statusDropdown.querySelector('span');
        if (statusSpan) statusSpan.textContent = 'All Status';
    }
    currentSort = { field: null, order: null };
    currentPage = 0; // 0-based
    
    console.log('Initial load started...'); // Debug log
    loadData();
}

function handleSort(field) {
    if (currentSort.field === field) {
        // Toggle sort order
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        // New field, default to ascending
        currentSort.field = field;
        currentSort.order = 'asc';
    }
    
    updateSortArrows();
    currentPage = 0; // Reset to first page (0-based)
    loadData();
}

function updateSortArrows() {
    // Reset all arrows
    document.querySelectorAll('.sort-arrow').forEach(arrow => {
        arrow.classList.remove('active');
    });
    
    // Activate current sort arrows
    if (currentSort.field) {
        const th = document.querySelector(`th[data-sort="${currentSort.field}"]`);
        if (th) {
            const arrows = th.querySelectorAll('.sort-arrow');
            if (currentSort.order === 'asc') {
                arrows[0]?.classList.add('active'); // up arrow
            } else {
                arrows[1]?.classList.add('active'); // down arrow
            }
        }
    }
}

function showLoading() {
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Loading...</td></tr>';
    }
}

function hideLoading() {
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

function showError(message) {
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function hideError() {
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Add status styling to CSS
const style = document.createElement('style');
style.textContent = `
    .status-on {
        color: #10b981;
        font-weight: bold;
        background-color: #d1fae5;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
    }
    
    .status-off {
        color: #ef4444;
        font-weight: bold;
        background-color: #fee2e2;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
    }
`;
document.head.appendChild(style);