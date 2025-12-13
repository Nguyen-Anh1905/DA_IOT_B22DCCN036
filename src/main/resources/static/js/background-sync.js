// ===================== BACKGROUND DATA SYNC SERVICE =====================
// File này được include trong tất cả các trang để:
// 1. Sync dữ liệu chart liên tục từ API 
// 2. Quản lý trạng thái thiết bị (ON/OFF) persistent
// 3. Đảm bảo data không bị mất khi chuyển trang

// ===================== UTILITY FUNCTIONS =====================
// Format thời gian hiển thị
function fmtTime(t) {
    const d = new Date(t);
    return d.toLocaleTimeString("vi-VN", { hour12: false });
}

// ===================== CONFIGURATION =====================
const SYNC_CONFIG = {
    // === CHART DATA CONFIG ===
    API_URL: 'http://localhost:8080/api/dashboard/chart',     // API lấy dữ liệu sensor
    STORAGE_KEY: 'iot_dashboard_history',                     // Key lưu lịch sử chart data
    SYNC_INTERVAL: 2000,                                      // 2 giây - sync data từ API
    MAX_HISTORY: 20,                                          // Số điểm tối đa trên chart
    DATA_EXPIRE_TIME: 60 * 60 * 1000,                        // 1 giờ - xóa data cũ
    
    // === DEVICE CONTROL CONFIG ===
    DEVICE_STATE_KEY: 'iot_device_states',                   // Key lưu trạng thái thiết bị
};

// ===================== MAIN BACKGROUND SYNC CLASS =====================
class BackgroundDataSync {
    constructor() {
        // === CHART DATA PROPERTIES ===
        this.syncInterval = null;                             // Timer cho việc sync data
        this.historyData = [];                                // Mảng chứa lịch sử data chart
        this.isRunning = false;                               // Trạng thái sync có đang chạy
        
        // === DEVICE CONTROL PROPERTIES ===
        this.deviceStates = {                                 // Trạng thái thiết bị (persistent)
            'DEV1': 'OFF',                                    // Đèn
            'DEV2': 'OFF',                                    // Quạt
            'DEV3': 'OFF'                                     // Điều hòa
        };
        
        // Khởi động service
        this.init();
    }

    // ===================== INITIALIZATION =====================
    init() {
        console.log('🚀 Initializing Background Data Sync Service...');
        
        // Load dữ liệu chart từ localStorage
        this.loadChartDataFromStorage();
        
        // Load trạng thái thiết bị từ localStorage  
        this.loadDeviceStatesFromStorage();
        
        // Bắt đầu sync dữ liệu chart từ API
        this.startChartDataSync();
        
        // Cleanup khi thoát trang
        window.addEventListener('beforeunload', () => {
            this.stopChartDataSync();
        });

        console.log('✅ Background Data Sync Service ready!');
    }

    // ===================== CHART DATA MANAGEMENT =====================
    
    // Load dữ liệu chart từ localStorage khi khởi động
    loadChartDataFromStorage() {
        try {
            const stored = localStorage.getItem(SYNC_CONFIG.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                const cutoffTime = Date.now() - SYNC_CONFIG.DATA_EXPIRE_TIME;
                
                // Lọc dữ liệu còn hợp lệ (chưa quá 1 giờ)
                this.historyData = parsed.filter(item => 
                    new Date(item.time).getTime() > cutoffTime
                );
                
                if (this.historyData.length > 0) {
                    console.log(`📦 Chart: Loaded ${this.historyData.length} data points from storage`);
                }
            }
        } catch (error) {
            console.error('❌ Chart: Error loading data from storage:', error);
            this.historyData = [];
        }
    }

    // Lưu dữ liệu chart vào localStorage
    saveChartDataToStorage() {
        try {
            localStorage.setItem(SYNC_CONFIG.STORAGE_KEY, JSON.stringify(this.historyData));
        } catch (error) {
            console.error('❌ Chart: Error saving data to storage:', error);
        }
    }

    // Fetch dữ liệu mới từ API và cập nhật chart
    async fetchChartDataFromAPI() {
        try {
            const response = await fetch(SYNC_CONFIG.API_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const raw = await response.json();
            const record = Array.isArray(raw) ? raw[0] : raw;
            
            if (record) {
                const newPoint = {
                    temperature: Number(record.temperature ?? record.temp ?? 0),
                    humidity: Number(record.humidity ?? record.hum ?? 0),
                    light: Number(record.light ?? 0),
                    cb1: Number(record.cb1 ?? 0),
                    cb2: Number(record.cb2 ?? 0),
                    cb3: Number(record.cb3 ?? 0),
                    time: record.time || new Date().toISOString(),
                };

                // Kiểm tra trùng lặp dựa trên timestamp và giá trị
                const isDuplicate = this.historyData.length > 0 && 
                    this.historyData[this.historyData.length - 1].time === newPoint.time;

                // Kiểm tra thêm: nếu cùng thời gian nhưng khác giá trị thì vẫn thêm
                const lastPoint = this.historyData[this.historyData.length - 1];
                const isValueChanged = !lastPoint || 
                    (lastPoint.temperature !== newPoint.temperature || 
                     lastPoint.humidity !== newPoint.humidity || 
                     lastPoint.light !== newPoint.light ||
                     lastPoint.cb1 !== newPoint.cb1 ||
                     lastPoint.cb2 !== newPoint.cb2 ||
                     lastPoint.cb3 !== newPoint.cb3);

                if (!isDuplicate || isValueChanged) {
                    this.historyData.push(newPoint);
                    
                    // Giới hạn số lượng điểm
                    if (this.historyData.length > SYNC_CONFIG.MAX_HISTORY) {
                        this.historyData.shift();
                    }
                    
                    // Lưu vào storage
                    this.saveChartDataToStorage();
                    
                    // Dispatch event để Dashboard cập nhật UI
                    window.dispatchEvent(new CustomEvent('dataUpdated', {
                        detail: { newPoint, allData: this.historyData }
                    }));
                    
                    console.log('🔄 Chart: New data synced:', fmtTime(newPoint.time), 
                               `T:${newPoint.temperature}°C H:${newPoint.humidity}% L:${newPoint.light}lux CB1:${newPoint.cb1} CB2:${newPoint.cb2} CB3:${newPoint.cb3}`);
                    return true;
                } else {
                    console.log('🔄 Chart: Duplicate data ignored:', fmtTime(newPoint.time));
                }
            }
            return false;
        } catch (error) {
            console.warn('⚠️ Chart: Background sync failed:', error.message);
            return false;
        }
    }

    // Bắt đầu sync dữ liệu chart
    startChartDataSync() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        
        // Fetch ngay lần đầu
        this.fetchChartDataFromAPI();
        
        // Tiếp tục fetch theo interval
        this.syncInterval = setInterval(() => {
            this.fetchChartDataFromAPI();
        }, SYNC_CONFIG.SYNC_INTERVAL);
        
        console.log(`🔄 Chart: Background sync started (every ${SYNC_CONFIG.SYNC_INTERVAL/1000}s)`);
    }

    // Dừng sync dữ liệu chart
    stopChartDataSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.isRunning = false;
        console.log('⏸️ Chart: Background sync stopped');
    }

    // API cho các trang khác lấy dữ liệu chart
    getChartData() {
        return [...this.historyData];
    }

    getLatestChartData() {
        return this.historyData.length > 0 ? this.historyData[this.historyData.length - 1] : null;
    }

    // Legacy method name (để tương thích)
    getData() {
        return this.getChartData();
    }

    getLatestData() {
        return this.getLatestChartData();
    }

    // ===================== DEVICE CONTROL MANAGEMENT =====================
    
    // Load trạng thái thiết bị từ localStorage
    loadDeviceStatesFromStorage() {
        try {
            const stored = localStorage.getItem(SYNC_CONFIG.DEVICE_STATE_KEY);
            if (stored) {
                this.deviceStates = { ...this.deviceStates, ...JSON.parse(stored) };
                console.log('� Device: Loaded states from storage:', this.deviceStates);
            }
        } catch (error) {
            console.error('❌ Device: Error loading states from storage:', error);
        }
    }

    // Lưu trạng thái thiết bị vào localStorage
    saveDeviceStatesToStorage() {
        try {
            localStorage.setItem(SYNC_CONFIG.DEVICE_STATE_KEY, JSON.stringify(this.deviceStates));
            console.log('� Device: States saved to storage:', this.deviceStates);
        } catch (error) {
            console.error('❌ Device: Error saving states to storage:', error);
        }
    }

    // API để các trang khác truy cập trạng thái thiết bị
    getDeviceState(device) {
        return this.deviceStates[device] || 'OFF';
    }

    setDeviceState(device, status) {
        console.log(`🎮 Device: Setting ${device} to ${status}`);
        this.deviceStates[device] = status;
        this.saveDeviceStatesToStorage();
    }

    getAllDeviceStates() {
        return { ...this.deviceStates };
    }

    // Khởi tạo điều khiển thiết bị cho trang Dashboard
    initDeviceControl() {
        // Kiểm tra xem có phần tử Device không (chỉ có trong Dashboard)
        const deviceElements = document.querySelectorAll('.Device .DEV1, .Device .DEV2, .Device .DEV3');
        if (deviceElements.length === 0) {
            console.log('ℹ️ Device: Not on dashboard page, skipping device control initialization');
            return;
        }
        
        console.log('🔧 Device: Initializing device control...');
        
        // Mapping icon cho từng thiết bị
        const deviceIcons = {
            'DEV1': { on: '../icon/lamp-on.png', off: '../icon/lamp-off.png' },        // Đèn
            'DEV2': { on: '../icon/fan-on.png', off: '../icon/fan-off.png' },          // Quạt
            'DEV3': { on: '../icon/air-conditioner-on.png', off: '../icon/air-conditioner-off.png' } // Điều hòa
        };
        
        // Setup click event cho các nút điều khiển (ON/OFF buttons)
        document.querySelectorAll('.Device .DEV1 img:last-child, .Device .DEV2 img:last-child, .Device .DEV3 img:last-child').forEach((img) => {
            img.style.cursor = 'pointer';
            
            img.addEventListener('click', () => {
                // Xác định thiết bị nào được click
                let deviceDiv = img.closest('.DEV1, .DEV2, .DEV3');
                let device = '';
                if (deviceDiv.classList.contains('DEV1')) device = 'DEV1';
                else if (deviceDiv.classList.contains('DEV2')) device = 'DEV2';
                else if (deviceDiv.classList.contains('DEV3')) device = 'DEV3';

                // Xác định trạng thái mới (toggle ON/OFF)
                let newStatus = img.src.includes('ON.png') ? 'OFF' : 'ON';

                console.log(`🎮 Device: User clicked ${device} → ${newStatus}`);

                // Hiển thị loading state
                img.style.opacity = '0.5';
                img.style.cursor = 'wait';

                // Gửi lệnh điều khiển đến backend
                fetch('http://localhost:8080/api/dashboard/control', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device: device, status: newStatus })
                })
                    .then(res => res.json()) // 👈 Đổi thành .json() để nhận response
                    .then(data => {
                        // Reset loading state
                        img.style.opacity = '1';
                        img.style.cursor = 'pointer';
                        
                        if (data.success) {
                            // ✅ Thành công - ESP8266 đã phản hồi
                            console.log(`✅ Device: ${device} controlled successfully → ${data.status}`);
                            
                            // Lưu trạng thái mới vào localStorage
                            this.setDeviceState(device, data.status);

                            // Cập nhật icon công tắc (ON.png / OFF.png)
                            img.src = '../icon/' + data.status + '.png';

                            // Cập nhật icon thiết bị (lamp-on.png / lamp-off.png, etc.)
                            let deviceIcon = deviceDiv.querySelector('img:first-child');
                            if (deviceIcons[device]) {
                                deviceIcon.src = data.status === 'ON' ? deviceIcons[device].on : deviceIcons[device].off;

                                // Hiệu ứng zoom khi thay đổi trạng thái
                                deviceIcon.style.transition = 'transform 0.3s ease';
                                deviceIcon.style.transform = 'scale(1.1)';
                                setTimeout(() => {
                                    deviceIcon.style.transform = 'scale(1)';
                                }, 300);
                            }
                            
                            // Hiển thị thông báo thành công
                            this.showSuccessNotification(`${device} đã ${data.status === 'ON' ? 'BẬT' : 'TẮT'} thành công!`);
                        } else {
                            // ❌ Thất bại - ESP8266 không phản hồi hoặc lỗi
                            console.error(`❌ Device: Control failed - ${data.message}`);
                            alert(`⚠️ Lỗi điều khiển thiết bị!\n\n${data.message}\n\nVui lòng kiểm tra kết nối ESP8266.`);
                        }
                    })
                    .catch(err => {
                        // Reset loading state
                        img.style.opacity = '1';
                        img.style.cursor = 'pointer';
                        
                        console.error(`❌ Device: Failed to control ${device}:`, err);
                        alert('⚠️ Lỗi kết nối server!\n\n' + err.message);
                    });
            });
        });

        // Khôi phục trạng thái thiết bị từ localStorage khi load trang
        this.restoreDeviceStatesFromStorage(deviceIcons);
        
        console.log('✅ Device: Control initialization complete');
    }

    // Khôi phục trạng thái thiết bị từ localStorage và cập nhật UI
    restoreDeviceStatesFromStorage(deviceIcons) {
        console.log('🔄 Device: Restoring states from storage...');
        
        document.querySelectorAll('.DEV1, .DEV2, .DEV3').forEach((deviceDiv) => {
            let device = '';
            if (deviceDiv.classList.contains('DEV1')) device = 'DEV1';
            else if (deviceDiv.classList.contains('DEV2')) device = 'DEV2';
            else if (deviceDiv.classList.contains('DEV3')) device = 'DEV3';

            // Lấy trạng thái đã lưu từ localStorage
            const savedStatus = this.getDeviceState(device);
            console.log(`📱 Device: Restoring ${device} → ${savedStatus}`);

            // Cập nhật icon thiết bị (đèn, quạt, điều hòa)
            let deviceIcon = deviceDiv.querySelector('img:first-child');
            if (deviceIcons[device] && deviceIcon) {
                deviceIcon.src = savedStatus === 'ON' ? deviceIcons[device].on : deviceIcons[device].off;
            }

            // Cập nhật icon công tắc (ON.png / OFF.png)
            let controlIcon = deviceDiv.querySelector('img:last-child');
            if (controlIcon) {
                controlIcon.src = `../icon/${savedStatus}.png`;
            }
        });
        
        console.log('✅ Device: States restored successfully');
    }
    
    // Hiển thị thông báo thành công
    showSuccessNotification(message) {
        // Tạo toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-weight: bold;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = '✅ ' + message;
        
        document.body.appendChild(toast);
        
        // Tự động ẩn sau 3 giây
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Thêm CSS animation cho toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Tạo instance global
window.backgroundDataSync = new BackgroundDataSync();

// Export để các module khác có thể sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackgroundDataSync;
}