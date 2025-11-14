package com.example.IOT.Controller;

import com.example.IOT.Entity.ActionHistory;
import com.example.IOT.Repository.ActionHistoryRepository;
import com.example.IOT.Service.DeviceControlService;
import com.example.IOT.dto.ControlDto;
import com.example.IOT.Entity.DataSensor;

import com.example.IOT.Repository.DataSensorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DataSensorRepository dataSensorRepository;
    @Autowired
    private ActionHistoryRepository actionHistoryRepository;

    @Autowired
    private MessageChannel controlChannel;
    
    @Autowired
    private DeviceControlService deviceControlService;

    // API lấy dữ liệu cho biểu đồ
    @GetMapping("/chart")
    public List<DataSensor> getLatestData() {
        return dataSensorRepository.findTop1ByOrderByTimeDesc();
    }

    // API điều khiển bật tắt - Đợi phản hồi từ ESP8266
    @PostMapping("/control")
    public CompletableFuture<Map<String, Object>> controlDevice(@RequestBody ControlDto request) {
        String device = request.getDevice();
        String status = request.getStatus();
        
        // Tạo pending request để đợi phản hồi
        CompletableFuture<ActionHistory> pendingRequest = deviceControlService.createPendingRequest(device);
        
        // Gửi lệnh điều khiển lên MQTT
        String payload = String.format("{\"device\":\"%s\",\"status\":\"%s\"}", device, status);
        controlChannel.send(MessageBuilder.withPayload(payload)
                .setHeader("mqtt_topic", "esp8266/control")
                .build());
        
        System.out.println("📤 Sent control command: " + payload);
        
        // Đợi phản hồi từ ESP8266 (qua statusHandler)
        return pendingRequest
            .thenApply(actionHistory -> {
                // Thành công - trả về kết quả
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Device controlled successfully");
                response.put("device", actionHistory.getDevice());
                response.put("status", actionHistory.getStatus());
                response.put("time", actionHistory.getTime());
                System.out.println("✅ Control successful: " + device + " → " + actionHistory.getStatus());
                return response;
            })
            .exceptionally(ex -> {
                // Thất bại - trả về lỗi
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", ex.getMessage());
                response.put("device", device);
                response.put("requestedStatus", status);
                System.err.println("❌ Control failed: " + ex.getMessage());
                return response;
            });
    }
    
}
