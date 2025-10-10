package com.example.IOT.Controller;

import com.example.IOT.Entity.DataSensor;
import com.example.IOT.dto.DataSensorDto;
import com.example.IOT.Service.DataSensorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/datasensor")
public class DataSensorController {

    // API phân trang: page = số trang, size = số dòng mỗi trang
    @Autowired
    private DataSensorService dataSensorService;
    @GetMapping
    public Page<DataSensorDto> getDataSensors(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction
    ) {
        return dataSensorService.getAll(page, size,  sortBy, direction);
    }

    // Search
    @GetMapping("/search")
    public Page<DataSensorDto> search(
            @RequestParam String column,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction
    ) {
        return dataSensorService.search(column, keyword, page, size, sortBy, direction);
    }
}
