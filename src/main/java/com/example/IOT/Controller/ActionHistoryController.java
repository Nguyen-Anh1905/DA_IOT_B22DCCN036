package com.example.IOT.Controller;

import com.example.IOT.Service.ActionHIstoryService;
import com.example.IOT.dto.ActionHistoryDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/actionhistory")

public class ActionHistoryController {

    @Autowired
    private ActionHIstoryService actionHIstoryService;

    @GetMapping
    public Page<ActionHistoryDto> getActionHistory(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "5") int size,
        @RequestParam(defaultValue = "id") String sortBy,
        @RequestParam(defaultValue = "desc") String direction
    )
    {
        return actionHIstoryService.getAll(page, size, sortBy, direction);
    }

    // Search
    @GetMapping("/search")
    public Page<ActionHistoryDto> search(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "all") String device,
            @RequestParam(defaultValue = "all") String status,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String direction
    ){
        return actionHIstoryService.search(page, size, device, status, keyword,sortBy, direction);
    }

}
