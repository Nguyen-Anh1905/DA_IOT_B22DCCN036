package com.example.IOT.Entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "data_sensor")  // nên khai báo rõ tên bảng
@Data
public class DataSensor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "DATETIME(0)")
    private LocalDateTime time; // convert từ tsprivate String time;

    private double temperature;
    private double humidity;
    private int light;
}
