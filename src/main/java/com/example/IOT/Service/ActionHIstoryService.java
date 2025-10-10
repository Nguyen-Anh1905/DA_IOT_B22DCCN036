package com.example.IOT.Service;

import com.example.IOT.Repository.ActionHistoryRepository;
import com.example.IOT.Entity.ActionHistory;
import com.example.IOT.dto.ActionHistoryDto;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@Service
public class ActionHIstoryService {
    @Autowired
    private ActionHistoryRepository actionHistoryRepository;

    // lấy tât cả để load trang
    public Page<ActionHistoryDto> getAll(int page, int size, String sortBy, String direction) {

        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        return actionHistoryRepository.findAll(pageable)
                .map(sensor -> new ActionHistoryDto(
                        sensor.getId(),
                        sensor.getDevice(),
                        sensor.getStatus(),
                        sensor.getTime()
                ));
    }
    // search
    public Page<ActionHistoryDto> search(
            int page,
            int size,
            String device,
            String status,
            String keyword,
            String sortBy,
            String direction
    ){
        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        boolean isNumeric = keyword != null && keyword.matches("\\d+");

        if(isNumeric){
            Long id = Long.parseLong(keyword);
            Page<ActionHistory> result = actionHistoryRepository.search(device, status, id, pageable);

            return result.map(action -> new ActionHistoryDto(
                    action.getId(),
                    action.getDevice(),
                    action.getStatus(),
                    action.getTime()
            ));
        }else{
            Page<ActionHistory> result = actionHistoryRepository.search(device, status, keyword, pageable);

            return result.map(action -> new ActionHistoryDto(
                    action.getId(),
                    action.getDevice(),
                    action.getStatus(),
                    action.getTime()
            ));
        }



    }


}


