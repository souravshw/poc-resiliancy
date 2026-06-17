package com.example.poc.cart.client;

import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

@Component
public class ProductClient {

    private final RestClient restClient;
    private final String productServiceUrl;

    @Autowired
    public ProductClient(RestClient restClient, @Value("${services.product-service.url:http://localhost:8081}") String productServiceUrl) {
        this.restClient = restClient;
        this.productServiceUrl = productServiceUrl;
    }

    public ProductDto getProductById(Long id) {
        try {
            return restClient.get()
                    .uri(productServiceUrl + "/api/products/" + id)
                    .retrieve()
                    .body(ProductDto.class);
        } catch (HttpClientErrorException.NotFound ex) {
            return null; // Product does not exist
        } catch (Exception e) {
            throw new RuntimeException("Product Service verification failed: " + e.getMessage());
        }
    }

    public static class ProductDto {
        private Long id;
        private String name;
        private BigDecimal price;
        private Integer quantity;

        public ProductDto() {}

        public ProductDto(Long id, String name, BigDecimal price, Integer quantity) {
            this.id = id;
            this.name = name;
            this.price = price;
            this.quantity = quantity;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public BigDecimal getPrice() { return price; }
        public void setPrice(BigDecimal price) { this.price = price; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }
}
