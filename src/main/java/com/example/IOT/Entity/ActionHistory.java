package com.example.IOT.Entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "action_history")
@Data
public class ActionHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "DATETIME(0)")
    private LocalDateTime time; // convert từ ts

    private String device;
    private String status;
}
