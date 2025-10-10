// Global variables
let currentPage = 0;
let currentSize = 10; // Max 10 records per page
let currentSortBy = 'id';
let currentDirection = 'asc';
let currentColumn = '';
let currentKeyword = '';
let selectedFilter = 'All';

// API endpoints
const API_BASE = 'http://localhost:8080/api/datasensor';
const API_SEARCH = `${API_BASE}/search`;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
	initializeDropdown();
	initializeSearch();
	initializeSorting();
	loadData();
});

// Dropdown functionality
function initializeDropdown() {
	const dropdownBtn = document.querySelector('.dropdown-btn');
	const dropdownList = document.querySelector('.dropdown-list');
	const dropdownItems = document.querySelectorAll('.dropdown-item');
	
	dropdownBtn.addEventListener('click', function() {
		dropdownList.classList.toggle('show');
	});
	
	dropdownItems.forEach(item => {
		item.addEventListener('click', function() {
			selectedFilter = this.textContent;
			dropdownBtn.childNodes[0].textContent = selectedFilter + ' ';
			dropdownList.classList.remove('show');
		});
	});
	
	// Close dropdown when clicking outside
	document.addEventListener('click', function(event) {
		if (!event.target.closest('.custom-dropdown')) {
			dropdownList.classList.remove('show');
		}
	});
}

// Search functionality
function initializeSearch() {
	const searchBtn = document.querySelector('.search-btn');
	const searchInput = document.querySelector('.search-input');
	
	searchBtn.addEventListener('click', function() {
		performSearch();
	});

	searchInput.addEventListener('keypress', function(e) {
		if (e.key === 'Enter') {
			performSearch();
		}
	});
}

// Sorting functionality
function initializeSorting() {
	const headers = document.querySelectorAll('.data-table th[data-column]');
	
	headers.forEach(header => {
		header.addEventListener('click', function() {
			const column = this.getAttribute('data-column');
			
			// Toggle direction if same column, otherwise set to asc
			if (currentSortBy === column) {
				currentDirection = currentDirection === 'asc' ? 'desc' : 'asc';
			} else {
				currentSortBy = column;
				currentDirection = 'asc';
			}
			
			// Update arrow indicators
			updateSortArrows(column, currentDirection);
			
			// Reload data with new sorting
			currentPage = 0;
			loadData();
		});
	});
}

// Update sort arrow indicators
function updateSortArrows(activeColumn, direction) {
	const headers = document.querySelectorAll('.data-table th[data-column]');
	
	headers.forEach(header => {
		const arrows = header.querySelectorAll('.sort-arrow');
		arrows.forEach(arrow => arrow.classList.remove('active'));
		
		if (header.getAttribute('data-column') === activeColumn) {
			const targetArrow = direction === 'asc' ? 
				header.querySelector('.sort-arrow.up') : 
				header.querySelector('.sort-arrow.down');
			targetArrow.classList.add('active');
		}
	});
}

// Perform search
function performSearch() {
	const searchTerm = document.querySelector('.search-input').value.trim();
	
	if (searchTerm) {
		currentKeyword = searchTerm;
		currentColumn = getColumnFromFilter(selectedFilter);
		currentPage = 0;
		console.log('Searching with:', { currentKeyword, currentColumn, selectedFilter }); // Debug log
		loadData();
	} else {
		// Reset to load all data
		currentKeyword = '';
		currentColumn = '';
		currentPage = 0;
		loadData();
	}
}

// Get column name from filter
function getColumnFromFilter(filter) {
	const filterMap = {
		'Temperature': 'temperature',
		'Humidity': 'humidity',
		'Light': 'light',
		'Time': 'time',
		'All': 'all'
	};
	return filterMap[filter] || 'all';
}

// Load data from API
async function loadData() {
	try {
		showLoading();
		
		let url;
		if (currentKeyword) {
			// Search API - always use search API when there's a keyword
			url = `${API_SEARCH}?column=${currentColumn}&keyword=${currentKeyword}&page=${currentPage}&size=${currentSize}&sortBy=${currentSortBy}&direction=${currentDirection}`;
		} else {
			// Load all data API - only when no search keyword
			url = `${API_BASE}?page=${currentPage}&size=${currentSize}&sortBy=${currentSortBy}&direction=${currentDirection}`;
		}
		
		console.log('API URL:', url); // Debug log
		
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const data = await response.json();
		console.log('API Response:', data); // Debug log
		
		// Handle different response structures
		let tableData;
		if (data.content) {
			// Paginated response
			tableData = data.content;
		} else if (Array.isArray(data)) {
			// Direct array response
			tableData = data;
		} else {
			// Unknown structure
			tableData = [];
		}
		
		renderTable(tableData);
		renderPagination(data);
		
	} catch (error) {
		console.error('Error loading data:', error);
		showError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
	}
}

// Show loading indicator
function showLoading() {
	const tbody = document.getElementById('sensorTableBody');
	tbody.innerHTML = '<tr><td colspan="5" class="loading">Đang tải dữ liệu...</td></tr>';
}

// Show error message
function showError(message) {
	const tbody = document.getElementById('sensorTableBody');
	tbody.innerHTML = `<tr><td colspan="5" class="error">${message}</td></tr>`;
}

// Render table data
function renderTable(data) {
	const tbody = document.getElementById('sensorTableBody');
	
	if (!data || data.length === 0) {
		tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">Không có dữ liệu</td></tr>';
		return;
	}
	
	tbody.innerHTML = data.map(item => `
		<tr>
			<td>${item.id}</td>
			<td>${item.temperature}</td>
			<td>${item.humidity}</td>
			<td>${item.light}</td>
			<td>${formatTime(item.time)}</td>
		</tr>
	`).join('');
}

// Format time
function formatTime(timeString) {
	if (!timeString) return 'N/A';
	// Return original format: "2025-09-21 01:06:10"
	return timeString;
}

// Render pagination
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