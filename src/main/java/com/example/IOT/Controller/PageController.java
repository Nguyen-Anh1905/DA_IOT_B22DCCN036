package com.example.IOT.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/dashboard")
    public String dashboard() {
        return "dashboard"; // tương ứng với templates/dashboard.html
    }

    @GetMapping("/actionhistory")
    public String actionHistory() {
        return "actionhistory";
    }

    @GetMapping("/datasensor")
    public String dataSensor() {
        return "datasensor";
    }

    @GetMapping("/profile")
    public String profile() {
        return "profile";
    }
}
