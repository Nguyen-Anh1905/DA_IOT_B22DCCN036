package com.example.IOT.Repository;

import com.example.IOT.Entity.DataSensor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface DataSensorRepository extends JpaRepository<DataSensor, Long> {
    List<DataSensor> findTop1ByOrderByTimeDesc();
    // Tìm theo id
    Page<DataSensor> findById(Long id, Pageable pageable);
    // Tìm theo temperature
    Page<DataSensor> findByTemperature(Double temperature, Pageable pageable);
    // Tìm theo humidity
    Page<DataSensor> findByHumidity(Double humidity, Pageable pageable);
    // Tìm theo light
    Page<DataSensor> findByLight(Integer light, Pageable pageable);
    // Tìm theo time LIKE (so sánh chuỗi)
    @Query("SELECT d FROM DataSensor d WHERE CAST(d.time AS string) LIKE %:time%")
    Page<DataSensor> findByTimeLike(@Param("time") String time, Pageable pageable);

    @Query("SELECT d FROM DataSensor d " +
            "WHERE CAST(d.id AS string) = :keyword " +
            "   OR CAST(d.time AS string) = :keyword " +
            "   OR CAST(d.temperature AS string) = :keyword " +
            "   OR CAST(d.humidity AS string) = :keyword " +
            "   OR CAST(d.light AS string) = :keyword")
    Page<DataSensor> searchAll(@Param("keyword") String keyword, Pageable pageable);

}
