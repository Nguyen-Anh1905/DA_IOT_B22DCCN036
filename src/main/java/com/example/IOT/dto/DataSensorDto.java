package com.example.IOT.dto;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import lombok.Data;

@Data
public class DataSensorDto {
    private Long id;
    private String time;
    private double temperature;
    private double humidity;
    private int light;

    public DataSensorDto(Long id, LocalDateTime time, double temperature, double humidity, int light) {
        this.id = id;
        this.time = time.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")); // format
        this.temperature = temperature;
        this.humidity = humidity;
        this.light = light;
    }
}
