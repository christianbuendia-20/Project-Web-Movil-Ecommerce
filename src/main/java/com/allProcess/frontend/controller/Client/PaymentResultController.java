package com.allProcess.frontend.controller.Client;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/payment")
public class PaymentResultController {

    @GetMapping("/success")
    public String success() {
        return "payment-success";
    }

    @GetMapping("/failure")
    public String failure() {
        return "payment-failure";
    }

    @GetMapping("/pending")
    public String pending() {
        return "payment-pending";
    }
}
