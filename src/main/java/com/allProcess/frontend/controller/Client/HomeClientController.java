package com.allProcess.frontend.controller.Client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Controller
public class HomeClientController {

    private final RestTemplate restTemplate;

    @Value("${backend.url}")
    private String backendUrl;

    public HomeClientController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping("/homeclient")
    public String homeclient(Model model) {
        List<Map<String, Object>> topProductos;
        try {
            topProductos = restTemplate.exchange(
                    backendUrl + "/api/productos/top-stock",
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            ).getBody();
            if (topProductos == null) topProductos = Collections.emptyList();
        } catch (Exception e) {
            topProductos = Collections.emptyList();
        }
        model.addAttribute("topProductos", topProductos);
        return "homeclient";
    }
}
