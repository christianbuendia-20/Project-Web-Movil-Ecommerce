package com.allProcess.frontend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class VerificacionController {

    @GetMapping("/verificar-email")
    public String verificarEmail() {
        return "verificacion";
    }
}
