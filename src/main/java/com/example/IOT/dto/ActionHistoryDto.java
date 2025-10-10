package com.example.IOT.dto;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import lombok.Data;

@Data
public class ActionHistoryDto {
    private Long id;
    private String device;
    private String status;
    private String time;

    public ActionHistoryDto(Long id, String device, String status, LocalDateTime time) {
        this.id = id;
        this.device = device;
        this.status = status;
        this.time = time.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
