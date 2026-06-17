package com.example.poc.gateway.controller;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

@RestController
public class GatewayController {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${services.product-service.url:http://localhost:8081}")
    private String productServiceUrl;

    @Value("${services.cart-service.url:http://localhost:8082}")
    private String cartServiceUrl;

    @Value("${services.ui-service.url:http://localhost:8083}")
    private String uiServiceUrl;

    // Route Product Service Requests
    @RequestMapping("/api/products/**")
    public ResponseEntity<byte[]> proxyProduct(HttpServletRequest request, @RequestBody(required = false) byte[] body) {
        String path = request.getRequestURI();
        String query = request.getQueryString();
        String targetUrl = productServiceUrl + path + (query != null ? "?" + query : "");
        return forward(targetUrl, request, body);
    }

    // Route Cart Service Requests
    @RequestMapping("/api/cart/**")
    public ResponseEntity<byte[]> proxyCart(HttpServletRequest request, @RequestBody(required = false) byte[] body) {
        String path = request.getRequestURI();
        String query = request.getQueryString();
        String targetUrl = cartServiceUrl + path + (query != null ? "?" + query : "");
        return forward(targetUrl, request, body);
    }

    // Route UI Service Static Asset Requests
    @RequestMapping(value = {"/", "/index.html", "/css/**", "/js/**"})
    public ResponseEntity<byte[]> proxyUi(HttpServletRequest request, @RequestBody(required = false) byte[] body) {
        String path = request.getRequestURI();
        String targetUrl = uiServiceUrl + path;
        return forward(targetUrl, request, body);
    }

    private ResponseEntity<byte[]> forward(String targetUrl, HttpServletRequest request, byte[] body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            Collections.list(request.getHeaderNames()).forEach(headerName -> {
                Collections.list(request.getHeaders(headerName)).forEach(headerValue -> {
                    headers.add(headerName, headerValue);
                });
            });

            HttpEntity<byte[]> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    targetUrl,
                    HttpMethod.valueOf(request.getMethod()),
                    requestEntity,
                    byte[].class
            );

            return ResponseEntity
                    .status(response.getStatusCode())
                    .headers(response.getHeaders())
                    .body(response.getBody());

        } catch (Exception e) {
            String errorMsg = "API Gateway Error: Downstream service at " + targetUrl + " is currently unavailable. Details: " + e.getMessage();
            return ResponseEntity
                    .status(503)
                    .header("Content-Type", "text/plain")
                    .body(errorMsg.getBytes());
        }
    }
}
