package com.allProcess.frontend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.URI;

@Component
@Order(1)
public class ApiProxyFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(ApiProxyFilter.class);

    @Value("${backend.url}")
    private String backendUrl;

    private final RestTemplate restTemplate;

    public ApiProxyFilter(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        String path = request.getRequestURI();

        if (!path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        String method = request.getMethod();
        log.info("API Proxy: {} {} -> {}{}", method, path, backendUrl, path);

        try {
            String query = request.getQueryString();
            String url = backendUrl + path + (query != null ? "?" + query : "");

            // Forward all request headers
            HttpHeaders headers = new HttpHeaders();
            java.util.Enumeration<String> headerNames = request.getHeaderNames();
            while (headerNames.hasMoreElements()) {
                String headerName = headerNames.nextElement();
                java.util.Enumeration<String> headerValues = request.getHeaders(headerName);
                while (headerValues.hasMoreElements()) {
                    headers.add(headerName, headerValues.nextElement());
                }
            }

            // Read body as raw bytes to correctly handle both JSON and multipart/binary
            byte[] bodyBytes = request.getInputStream().readAllBytes();
            HttpEntity<byte[]> entity = new HttpEntity<>(bodyBytes.length > 0 ? bodyBytes : null, headers);

            HttpMethod httpMethod = HttpMethod.valueOf(method.toUpperCase());
            ResponseEntity<byte[]> backendResponse = restTemplate.exchange(
                    URI.create(url), httpMethod, entity, byte[].class
            );

            response.setStatus(backendResponse.getStatusCode().value());

            // Forward Content-Type from backend (supports JSON and images)
            MediaType contentType = backendResponse.getHeaders().getContentType();
            response.setContentType(contentType != null ? contentType.toString() : "application/json;charset=UTF-8");

            byte[] responseBody = backendResponse.getBody();
            if (responseBody != null && responseBody.length > 0) {
                response.getOutputStream().write(responseBody);
            }

        } catch (HttpStatusCodeException e) {
            response.setStatus(e.getStatusCode().value());
            response.setContentType("application/json;charset=UTF-8");
            String body = e.getResponseBodyAsString();
            if (body != null && !body.isEmpty()) {
                response.getWriter().write(body);
            }
        } catch (Exception e) {
            log.error("Proxy error for {} {}: {}", method, path, e.getMessage());
            response.setStatus(502);
            response.setContentType("application/json;charset=UTF-8");
            String detail = e.getMessage() != null ? e.getMessage().replace("\"", "'") : "Error desconocido";
            response.getWriter().write("{\"error\":\"Error de conexión con el backend\",\"detail\":\"" + detail + "\"}");
        }
    }
}
