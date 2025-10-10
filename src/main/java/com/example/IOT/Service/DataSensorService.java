package com.example.IOT.Service;

import com.example.IOT.Entity.DataSensor;
import com.example.IOT.dto.DataSensorDto;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import com.example.IOT.Repository.DataSensorRepository;
import org.springframework.data.domain.Sort;


@Service
public class DataSensorService {

    @Autowired
    private DataSensorRepository dataSensorRepository;

    // Lấy tất cả có phân trang
    public Page<DataSensorDto> getAll(int page, int size, String sortBy, String direction) {
        Sort sort = direction.equalsIgnoreCase("desc") ?
                Sort.by(sortBy).descending() :
                Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        return dataSensorRepository.findAll(pageable)
                .map(sensor -> new DataSensorDto(
                        sensor.getId(),
                        sensor.getTime(),
                        sensor.getTemperature(),
                        sensor.getHumidity(),
                        sensor.getLight()
                ));
    }

    // 🔍 Tìm kiếm có phân trang
    public Page<DataSensorDto> search(
            String column,
            String keyword,
            int page,
            int size,
            String sortBy,
            String direction
    ) {
        Sort sort = direction.equalsIgnoreCase("desc") ?
                Sort.by(sortBy).descending() :
                Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        if(keyword == null || keyword.trim().isEmpty()){
            return dataSensorRepository.findAll(pageable).map(d -> new DataSensorDto(
                    d.getId(),
                    d.getTime(),
                    d.getTemperature(),
                    d.getHumidity(),
                    d.getLight()
            ));
        }
        Page<DataSensor> result;

        try {
            switch (column.toLowerCase()) {
                case "id":
                    result = dataSensorRepository.findById(Long.parseLong(keyword), pageable);
                    break;
                case "temperature":
                    result = dataSensorRepository.findByTemperature(Double.parseDouble(keyword), pageable);
                    break;
                case "humidity":
                    result = dataSensorRepository.findByHumidity(Double.parseDouble(keyword), pageable);
                    break;
                case "light":
                    result = dataSensorRepository.findByLight(Integer.parseInt(keyword), pageable);
                    break;
                case "time":
                    result = dataSensorRepository.findByTimeLike(keyword, pageable);
                    break;
                case "all":
                    result = dataSensorRepository.searchAll(keyword, pageable);
                    break;
                default:
                    throw new IllegalArgumentException("Cột không hợp lệ: " + column);
            }
        } catch (NumberFormatException e) {
            // Nếu parse lỗi, trả về Page rỗng
            result = Page.empty(pageable);
        }


        return result.map(d -> new DataSensorDto(
                d.getId(),
                d.getTime(),
                d.getTemperature(),
                d.getHumidity(),
                d.getLight()
        ));
    }
}

