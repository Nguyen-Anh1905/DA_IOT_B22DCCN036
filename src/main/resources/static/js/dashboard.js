// ===================== CONFIG & UTILS =====================
const COLOR_TEMP = "#FF6B9D";  // Hồng
const COLOR_HUM = "#20B2FF";   // Xanh dương
const COLOR_LIGHT = "#00D68F"; // Xanh lá
const GRID_COLOR = "#E5E5E5";  // Lưới xám nhạt

function fmtTime(t) {
    const d = new Date(t);
    // HH:mm:ss giống ảnh
    return d.toLocaleTimeString("vi-VN", { hour12: false });
}

function updateHeaderValues(latest) {
    if (!latest) return;
    const t = document.querySelector('.chart-header.temp span');
    const h = document.querySelector('.chart-header.humidity span');
    const l = document.querySelector('.chart-header.light span');
    
    if (t) {
        t.textContent = `${latest.temperature}°C`;
        // Đổi màu nhiệt độ: 20-40°C để màu thay đổi rõ hơn
        updateHeaderColor('.chart-header.temp', latest.temperature, 20, 40, COLOR_TEMP);
    }
    if (h) {
        h.textContent = `${latest.humidity}%`;
        // Đổi màu độ ẩm: 50-100% để màu thay đổi rõ hơn
        updateHeaderColor('.chart-header.humidity', latest.humidity, 50, 100, COLOR_HUM);
    }
    if (l) {
        l.textContent = `${latest.light} lux`;
        // Đổi màu ánh sáng: càng cao càng đậm
        updateHeaderColor('.chart-header.light', latest.light, 0, 1000, COLOR_LIGHT);
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

// Nếu API rỗng, tạo data mẫu giống ảnh (6 điểm)
function demoData() {
    const now = Date.now();
    const step = 60 * 1000; // 1 phút
    const points = [
        { temperature: 20, humidity: 50, light: 200 },
        { temperature: 20, humidity: 40, light: 430 },
        { temperature: 20, humidity: 60, light: 330 },
        { temperature: 20, humidity: 50, light: 520 },
        { temperature: 20, humidity: 50, light: 530 },
        { temperature: 20, humidity: 50, light: 510 },
    ];
    return points.map((p, i) => ({ ...p, time: new Date(now - (points.length - 1 - i) * step).toISOString() }));
}

// ===================== DATA FETCH & HISTORY =====================
const MAX_HISTORY = 20; // Số điểm tối đa trên biểu đồ
let historyData = [];

// Sử dụng background sync service để lấy dữ liệu
function loadHistoryFromBackgroundSync() {
    if (window.backgroundDataSync) {
        const syncedData = window.backgroundDataSync.getData();
        if (syncedData.length > 0) {
            historyData = [...syncedData];
            console.log(`✅ Loaded ${historyData.length} data points from background sync`);
            showRestoreNotification(historyData.length);
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
        
        // Cập nhật UI ngay lập tức khi có dữ liệu mới (chỉ khi đang ở Dashboard)
        if (document.visibilityState === 'visible') {
            refreshDashboardUI();
            console.log('📊 Dashboard updated with new data:', newPoint.time);
        }
    });
}

// Hiển thị thông báo khôi phục dữ liệu (tuỳ chọn)
function showRestoreNotification(count) {
    if (window.backgroundDataSync) {
        window.backgroundDataSync.showNotification(`📊 Restored ${count} data points`, '#4CAF50');
    }
}

// Dashboard-specific UI refresh (không fetch, chỉ render UI)
function refreshDashboardUI() {
    // Lấy dữ liệu từ background sync
    if (window.backgroundDataSync) {
        historyData = window.backgroundDataSync.getData();
    }
    
    // Nếu không có dữ liệu, dùng demo
    if (historyData.length === 0) {
        historyData = demoData();
    }

    // Render UI
    const arr = historyData;
    const labels = arr.map(r => fmtTime(r.time));
    const temp = arr.map(r => r.temperature);
    const hum = arr.map(r => r.humidity);
    const light = arr.map(r => r.light);

    updateHeaderValues(arr[arr.length - 1]);
    renderCharts({ labels, temp, hum, light });
}

// ===================== RENDER CHARTS =====================
function renderCharts({ labels, temp, hum, light }) {
    // --------- Biểu đồ Temperature + Humidity + Light (gộp, 2 trục y) ----------
    const ctx1El = document.getElementById("temHumChart");
    if (ctx1El) {
        if (!window.temHumChartInstance) {
            const ctx1 = ctx1El.getContext("2d");
            window.temHumChartInstance = new Chart(ctx1, {
                type: "line",
                data: {
                    labels: [...labels],
                    datasets: [
                        {
                            label: "Temperature (°C)",
                            data: [...temp],
                            borderColor: COLOR_TEMP,
                            backgroundColor: "rgba(255, 107, 157, 0.2)",
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                            pointRadius: 1,
                            pointHoverRadius: 2,
                            pointBackgroundColor: COLOR_TEMP,
                            yAxisID: 'y',
                        },
                        {
                            label: "Humidity (%)",
                            data: [...hum],
                            borderColor: COLOR_HUM,
                            backgroundColor: "rgba(32, 178, 255, 0.2)",
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                            pointRadius: 1,
                            pointHoverRadius: 2,
                            pointBackgroundColor: COLOR_HUM,
                            yAxisID: 'y',
                        },
                        {
                            label: "Light (lux)",
                            data: [...light],
                            borderColor: COLOR_LIGHT,
                            backgroundColor: "rgba(0, 214, 143, 0.2)",
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                            pointRadius: 1,
                            pointHoverRadius: 2,
                            pointBackgroundColor: COLOR_LIGHT,
                            yAxisID: 'y1',
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 500 },
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: true },
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            position: 'left',
                            beginAtZero: true,
                            suggestedMax: 100,
                            grid: { color: GRID_COLOR, lineWidth: 1 },
                            ticks: { stepSize: 10, color: "#666" },
                        },
                        y1: {
                            type: 'linear',
                            position: 'right',
                            beginAtZero: true,
                            suggestedMax: 300,
                            grid: { drawOnChartArea: false }, // Không vẽ lưới trục phải
                            ticks: { stepSize: 100, color: "#666" },
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
            // Cập nhật dữ liệu, không destroy chart
            const chart = window.temHumChartInstance;
            // Scroll effect: giữ nguyên hình dạng, dịch dần sang trái
            if (chart.data.labels.length === labels.length) {
                chart.data.labels.shift();
                chart.data.labels.push(labels[labels.length - 1]);
                chart.data.datasets[0].data.shift();
                chart.data.datasets[0].data.push(temp[temp.length - 1]);
                chart.data.datasets[1].data.shift();
                chart.data.datasets[1].data.push(hum[hum.length - 1]);
                chart.data.datasets[2].data.shift();
                chart.data.datasets[2].data.push(light[light.length - 1]);
            } else {
                chart.data.labels = [...labels];
                chart.data.datasets[0].data = [...temp];
                chart.data.datasets[1].data = [...hum];
                chart.data.datasets[2].data = [...light];
            }
            chart.update('active');
        }
    }
}

// ===================== DEVICE CONTROL =====================
// Device control được di chuyển hoàn toàn vào background-sync.js

// ===================== BOOTSTRAP =====================
// Khởi tạo Dashboard khi DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup listener cho background sync
    setupBackgroundSyncListener();
    
    // Khởi tạo điều khiển thiết bị từ background sync
    if (window.backgroundDataSync) {
        window.backgroundDataSync.initDeviceControl();
    }
    
    // Load dữ liệu từ background sync ngay khi trang được tải
    if (loadHistoryFromBackgroundSync()) {
        // Render ngay lập tức với dữ liệu có sẵn
        refreshDashboardUI();
    } else {
        // Nếu chưa có dữ liệu, dùng demo
        historyData = demoData();
        refreshDashboardUI();
    }
});



