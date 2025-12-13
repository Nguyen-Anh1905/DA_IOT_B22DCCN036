// ===================== CONFIG & UTILS =====================
const COLOR_CB1 = "#FFC107";   // Vàng
const COLOR_CB2 = "#9C27B0";   // Tím
const COLOR_CB3 = "#FF5722";   // Cam đỏ
const GRID_COLOR = "#E5E5E5";  // Lưới xám nhạt

// Ngưỡng cảnh báo cho cb1, cb2, cb3 (50%)
const WARNING_THRESHOLD = 50;
let lastWarningTime = { cb1: 0, cb2: 0, cb3: 0 }; // Tránh spam cảnh báo

function fmtTime(t) {
    const d = new Date(t);
    return d.toLocaleTimeString("vi-VN", { hour12: false });
}

function updateHeaderValues(latest) {
    if (!latest) return;
    const c1 = document.querySelector('.chart-header.cb1 span');
    const c2 = document.querySelector('.chart-header.cb2 span');
    const c3 = document.querySelector('.chart-header.cb3 span');
    
    if (c1) {
        c1.textContent = `${latest.cb1 || 0}`;
        updateHeaderColor('.chart-header.cb1', latest.cb1 || 0, 0, 100, COLOR_CB1);
        checkWarningThreshold('CB1', latest.cb1 || 0);
        updateBoxBorder('.chart-header.cb1', latest.cb1 || 0);
    }
    if (c2) {
        c2.textContent = `${latest.cb2 || 0}`;
        updateHeaderColor('.chart-header.cb2', latest.cb2 || 0, 0, 100, COLOR_CB2);
        checkWarningThreshold('CB2', latest.cb2 || 0);
        updateBoxBorder('.chart-header.cb2', latest.cb2 || 0);
    }
    if (c3) {
        c3.textContent = `${latest.cb3 || 0}`;
        updateHeaderColor('.chart-header.cb3', latest.cb3 || 0, 0, 100, COLOR_CB3);
        checkWarningThreshold('CB3', latest.cb3 || 0);
        updateBoxBorder('.chart-header.cb3', latest.cb3 || 0);
    }
}

// Kiểm tra ngưỡng cảnh báo cho CB1, CB2, CB3
function checkWarningThreshold(sensorName, value) {
    const now = Date.now();
    const sensorKey = sensorName.toLowerCase();
    
    // Chỉ cảnh báo nếu vượt ngưỡng và chưa cảnh báo trong 10s gần đây
    if (value > WARNING_THRESHOLD && (now - lastWarningTime[sensorKey]) > 10000) {
        lastWarningTime[sensorKey] = now;
        showWarningNotification(sensorName, value);
    }
}

// Hiển thị cảnh báo
function showWarningNotification(sensorName, value) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #FF5722;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: Arial, sans-serif;
        font-weight: bold;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = `⚠️ CẢNH BÁO: ${sensorName} vượt ngưỡng! (${value} > ${WARNING_THRESHOLD})`;
    
    document.body.appendChild(toast);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Cập nhật viền box khi vượt ngưỡng
function updateBoxBorder(selector, value) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    if (value > WARNING_THRESHOLD) {
        // Viền đỏ đậm khi vượt ngưỡng
        element.style.border = '4px solid #FF0000';
        element.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
    } else {
        // Trở về bình thường
        element.style.border = '';
        element.style.boxShadow = '';
    }
}

// Hàm đổi màu header đơn giản - chỉ thay đổi màu nền
function updateHeaderColor(selector, value, minValue, maxValue, baseColor) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    // Tính độ đậm nhạt (0.2 - 0.8)
    const normalizedValue = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));
    const opacity = 0.2 + (normalizedValue * 0.8); // Từ 20% đến 80% opacity
    
    // Chuyển hex sang rgba
    const rgba = hexToRgba(baseColor, opacity);
    
    // Chỉ thay đổi màu nền, giữ nguyên màu chữ đen
    element.style.backgroundColor = rgba;
    element.style.transition = 'background-color 0.5s ease';
}

// Convert hex to rgba
function hexToRgba(hex, opacity) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Nếu API rỗng, tạo data mẫu
function demoData() {
    const now = Date.now();
    const step = 60 * 1000; // 1 phút
    const points = [
        { cb1: 10, cb2: 20, cb3: 30 },
        { cb1: 15, cb2: 25, cb3: 35 },
        { cb1: 12, cb2: 22, cb3: 32 },
        { cb1: 18, cb2: 28, cb3: 38 },
        { cb1: 20, cb2: 30, cb3: 40 },
        { cb1: 17, cb2: 27, cb3: 37 },
    ];
    return points.map((p, i) => ({ ...p, time: new Date(now - (points.length - 1 - i) * step).toISOString() }));
}

// ===================== DATA FETCH & HISTORY =====================
const MAX_HISTORY = 20;
let historyData = [];

// Sử dụng background sync service để lấy dữ liệu
function loadHistoryFromBackgroundSync() {
    if (window.backgroundDataSync) {
        const syncedData = window.backgroundDataSync.getData();
        if (syncedData.length > 0) {
            historyData = [...syncedData];
            console.log(`✅ Loaded ${historyData.length} data points from background sync`);
            return true;
        }
    }
    return false;
}

// Lắng nghe sự kiện cập nhật dữ liệu từ background sync
function setupBackgroundSyncListener() {
    window.addEventListener('dataUpdated', function(event) {
        const { newPoint, allData } = event.detail;
        historyData = [...allData];
        
        if (document.visibilityState === 'visible') {
            refreshDashboardUI();
            console.log('📊 Dashboard New updated with new data:', newPoint.time);
        }
    });
}

// Dashboard-specific UI refresh
function refreshDashboardUI() {
    if (window.backgroundDataSync) {
        historyData = window.backgroundDataSync.getData();
    }
    
    // Luôn dùng demo data để đảm bảo có dữ liệu hiển thị
    if (historyData.length === 0) {
        historyData = demoData();
        console.log('📊 Using demo data for Dashboard New');
    }

    const arr = historyData;
    const labels = arr.map(r => fmtTime(r.time));
    const cb1 = arr.map(r => r.cb1 || 0);
    const cb2 = arr.map(r => r.cb2 || 0);
    const cb3 = arr.map(r => r.cb3 || 0);
    
    console.log('📊 Dashboard New - Rendering chart with', arr.length, 'points');
    console.log('📊 CB1:', cb1, 'CB2:', cb2, 'CB3:', cb3);

    updateHeaderValues(arr[arr.length - 1]);
    renderCharts({ labels, cb1, cb2, cb3 });
}

// ===================== RENDER CHARTS =====================
function renderCharts({ labels, cb1, cb2, cb3 }) {
    console.log('🎨 renderCharts called with:', { labels: labels.length, cb1: cb1.length, cb2: cb2.length, cb3: cb3.length });
    
    // Render 3 separate charts
    renderSingleChart('cb1Chart', 'CB1', labels, cb1, COLOR_CB1, 'rgba(255, 193, 7, 0.2)');
    renderSingleChart('cb2Chart', 'CB2', labels, cb2, COLOR_CB2, 'rgba(156, 39, 176, 0.2)');
    renderSingleChart('cb3Chart', 'CB3', labels, cb3, COLOR_CB3, 'rgba(255, 87, 34, 0.2)');
}

function renderOldChart({ labels, cb1, cb2, cb3 }) {
    console.log('🎨 renderCharts called with:', { labels: labels.length, cb1: cb1.length, cb2: cb2.length, cb3: cb3.length });
    
    const ctxEl = document.getElementById("sensorChart");
    console.log('🎨 Canvas element:', ctxEl);
    
    if (!ctxEl) {
        console.error('❌ Canvas element #sensorChart not found!');
        return;
    }
    
    if (ctxEl) {
        if (!window.sensorChartInstance) {
            console.log('🎨 Creating new chart instance...');
            const ctx = ctxEl.getContext("2d");
            window.sensorChartInstance = new Chart(ctx, {
                type: "line",
                data: {
                    labels: [...labels],
                    datasets: [
                        {
                            label: "CB1",
                            data: [...cb1],
                            borderColor: COLOR_CB1,
                            backgroundColor: "rgba(255, 193, 7, 0.2)",
                            borderWidth: 2,
                            fill: false,
                            tension: 0.3,
                            pointRadius: 2,
                            pointHoverRadius: 4,
                            pointBackgroundColor: COLOR_CB1,
                        },
                        {
                            label: "CB2",
                            data: [...cb2],
                            borderColor: COLOR_CB2,
                            backgroundColor: "rgba(156, 39, 176, 0.2)",
                            borderWidth: 2,
                            fill: false,
                            tension: 0.3,
                            pointRadius: 2,
                            pointHoverRadius: 4,
                            pointBackgroundColor: COLOR_CB2,
                        },
                        {
                            label: "CB3",
                            data: [...cb3],
                            borderColor: COLOR_CB3,
                            backgroundColor: "rgba(255, 87, 34, 0.2)",
                            borderWidth: 2,
                            fill: false,
                            tension: 0.3,
                            pointRadius: 2,
                            pointHoverRadius: 4,
                            pointBackgroundColor: COLOR_CB3,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 500 },
                    plugins: {
                        legend: { 
                            display: true,
                            position: 'top',
                        },
                        tooltip: { enabled: true },
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            beginAtZero: true,
                            suggestedMax: 100,
                            grid: { color: GRID_COLOR, lineWidth: 1 },
                            ticks: { stepSize: 10, color: "#666" },
                        },
                        x: {
                            grid: { color: GRID_COLOR, lineWidth: 1 },
                            ticks: { color: "#666", maxRotation: 45, minRotation: 45 },
                        },
                    },
                    elements: { point: { radius: 2, hoverRadius: 4 } },
                },
            });
        } else {
            const chart = window.sensorChartInstance;
            if (chart.data.labels.length === labels.length) {
                chart.data.labels.shift();
                chart.data.labels.push(labels[labels.length - 1]);
                chart.data.datasets[0].data.shift();
                chart.data.datasets[0].data.push(cb1[cb1.length - 1]);
                chart.data.datasets[1].data.shift();
                chart.data.datasets[1].data.push(cb2[cb2.length - 1]);
                chart.data.datasets[2].data.shift();
                chart.data.datasets[2].data.push(cb3[cb3.length - 1]);
            } else {
                chart.data.labels = [...labels];
                chart.data.datasets[0].data = [...cb1];
                chart.data.datasets[1].data = [...cb2];
                chart.data.datasets[2].data = [...cb3];
            }
            chart.update('active');
        }
    }
}

function renderSingleChart(canvasId, label, labels, data, borderColor, backgroundColor) {
    const ctxEl = document.getElementById(canvasId);
    
    if (!ctxEl) {
        console.error(`❌ Canvas element #${canvasId} not found!`);
        return;
    }
    
    const chartKey = `${canvasId}Instance`;
    
    if (!window[chartKey]) {
        console.log(`🎨 Creating new chart instance for ${label}...`);
        const ctx = ctxEl.getContext("2d");
        window[chartKey] = new Chart(ctx, {
            type: "line",
            data: {
                labels: [...labels],
                datasets: [{
                    label: label,
                    data: [...data],
                    borderColor: borderColor,
                    backgroundColor: backgroundColor,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    pointBackgroundColor: borderColor
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: { enabled: true }
                },
                scales: {
                    x: {
                        grid: { color: GRID_COLOR, lineWidth: 1 },
                        ticks: { color: "#666", maxRotation: 45, minRotation: 45 }
                    },
                    y: {
                        type: 'linear',
                        beginAtZero: true,
                        suggestedMax: 100,
                        grid: { color: GRID_COLOR, lineWidth: 1 },
                        ticks: { stepSize: 10, color: "#666" }
                    }
                },
                elements: { point: { radius: 2, hoverRadius: 4 } }
            }
        });
    } else {
        // Update existing chart
        const chart = window[chartKey];
        if (chart.data.labels.length === labels.length) {
            chart.data.labels.shift();
            chart.data.labels.push(labels[labels.length - 1]);
            chart.data.datasets[0].data.shift();
            chart.data.datasets[0].data.push(data[data.length - 1]);
        } else {
            chart.data.labels = [...labels];
            chart.data.datasets[0].data = [...data];
        }
        chart.update('none');
    }
}

// ===================== BOOTSTRAP =====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard New - DOMContentLoaded');
    
    setupBackgroundSyncListener();
    
    // Test canvas
    const canvas = document.getElementById("sensorChart");
    console.log('🎨 Canvas check:', canvas ? 'Found' : 'NOT FOUND');
    
    if (loadHistoryFromBackgroundSync()) {
        refreshDashboardUI();
    } else {
        console.log('⚠️ No background data, using demo');
        historyData = demoData();
        refreshDashboardUI();
    }
});

// Thêm CSS animation (tránh conflict với background-sync.js)
const warningStyle = document.createElement('style');
warningStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(warningStyle);
