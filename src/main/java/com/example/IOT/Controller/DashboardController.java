package com.example.IOT.Controller;

import com.example.IOT.Entity.ActionHistory;
import com.example.IOT.Repository.ActionHistoryRepository;
import com.example.IOT.dto.ControlDto;
import com.example.IOT.Entity.DataSensor;

import com.example.IOT.Repository.DataSensorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.bind.annotation.*;


import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DataSensorRepository dataSensorRepository;
    @Autowired
    private ActionHistoryRepository actionHistoryRepository;

    @Autowired
    private MessageChannel controlChannel;

    // API lấy dữ liệu cho biểu đồ
    @GetMapping("/chart")
    public List<DataSensor> getLatestData() {
        return dataSensorRepository.findTop1ByOrderByTimeDesc();
    }

    // API điều khiển bâtj tắt
    @PostMapping("/control")
    public String controlDevice(@RequestBody ControlDto request) {
        String payload = String.format("{\"device\":\"%s\",\"status\":\"%s\"}",
                request.getDevice(), request.getStatus());
        controlChannel.send(MessageBuilder.withPayload(payload)
                .setHeader("mqtt_topic", "esp8266/control")
                .build());
        return "Sent control: " + payload;
    }


    @GetMapping("/status")
    public List<ActionHistory> getLatestDataStatus() {
        return actionHistoryRepository.findTop1ByOrderByTimeDesc();
    }
}
