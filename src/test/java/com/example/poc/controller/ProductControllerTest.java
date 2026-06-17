package com.example.poc.controller;

import com.example.poc.model.Product;
import com.example.poc.repository.ProductRepository;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    public void setup() {
        productRepository.deleteAll();
    }

    @Test
    public void testCreateProduct_Success() throws Exception {
        Product product = new Product(null, "Test Product", "Test Description", new BigDecimal("99.99"), 10, "Electronics");

        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(product)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name", is("Test Product")))
                .andExpect(jsonPath("$.price", is(99.99)))
                .andExpect(jsonPath("$.quantity", is(10)))
                .andExpect(jsonPath("$.category", is("Electronics")));
    }

    @Test
    public void testCreateProduct_ValidationFailure() throws Exception {
        // Name is blank, price is zero (invalid), quantity is negative (invalid)
        Product product = new Product(null, "", "Description", BigDecimal.ZERO, -5, "Category");

        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(product)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", is("Validation failed")))
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.price").exists())
                .andExpect(jsonPath("$.errors.quantity").exists());
    }

    @Test
    public void testGetAllProducts() throws Exception {
        Product p1 = new Product(null, "Apple", "Red fruit", new BigDecimal("1.50"), 100, "Fruits");
        Product p2 = new Product(null, "Banana", "Yellow fruit", new BigDecimal("0.80"), 150, "Fruits");
        productRepository.save(p1);
        productRepository.save(p2);

        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name", is("Apple")))
                .andExpect(jsonPath("$[1].name", is("Banana")));
    }

    @Test
    public void testGetProductById_Success() throws Exception {
        Product product = new Product(null, "Unique Laptop", "Spec description", new BigDecimal("1200.00"), 5, "Electronics");
        Product saved = productRepository.save(product);

        mockMvc.perform(get("/api/products/" + saved.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Unique Laptop")));
    }

    @Test
    public void testGetProductById_NotFound() throws Exception {
        mockMvc.perform(get("/api/products/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.message", is("Product not found with id: 999")));
    }

    @Test
    public void testUpdateProduct_Success() throws Exception {
        Product product = new Product(null, "Old Product", "Old Desc", new BigDecimal("10.00"), 20, "Misc");
        Product saved = productRepository.save(product);

        Product updatedDetails = new Product(null, "Updated Product", "New Desc", new BigDecimal("15.00"), 25, "Misc");

        mockMvc.perform(put("/api/products/" + saved.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updatedDetails)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Updated Product")))
                .andExpect(jsonPath("$.description", is("New Desc")))
                .andExpect(jsonPath("$.price", is(15.00)))
                .andExpect(jsonPath("$.quantity", is(25)));
    }

    @Test
    public void testDeleteProduct_Success() throws Exception {
        Product product = new Product(null, "To Be Deleted", "Desc", new BigDecimal("5.00"), 2, "Trash");
        Product saved = productRepository.save(product);

        mockMvc.perform(delete("/api/products/" + saved.getId()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/products/" + saved.getId()))
                .andExpect(status().isNotFound());
    }
}
