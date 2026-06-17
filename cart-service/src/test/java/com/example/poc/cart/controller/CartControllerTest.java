package com.example.poc.cart.controller;

import com.example.poc.cart.client.ProductClient;
import com.example.poc.cart.model.CartItem;
import com.example.poc.cart.repository.CartItemRepository;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class CartControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CartItemRepository cartItemRepository;

    @MockitoBean
    private ProductClient productClient;

    private final ObjectMapper jackson3Mapper = new ObjectMapper();

    @BeforeEach
    public void setup() {
        cartItemRepository.deleteAll();
    }

    @Test
    public void testAddToCart_Success() throws Exception {
        ProductClient.ProductDto mockProduct = new ProductClient.ProductDto(
                1L, "Laptop", new BigDecimal("1200.00"), 5
        );
        Mockito.when(productClient.getProductById(1L)).thenReturn(mockProduct);

        CartController.CartItemRequest request = new CartController.CartItemRequest(1L, 2);

        mockMvc.perform(post("/api/cart/add")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jackson3Mapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productId", is(1)))
                .andExpect(jsonPath("$.productName", is("Laptop")))
                .andExpect(jsonPath("$.price", is(1200.00)))
                .andExpect(jsonPath("$.quantity", is(2)));
    }

    @Test
    public void testAddToCart_InsufficientStock() throws Exception {
        ProductClient.ProductDto mockProduct = new ProductClient.ProductDto(
                1L, "Laptop", new BigDecimal("1200.00"), 1
        );
        Mockito.when(productClient.getProductById(1L)).thenReturn(mockProduct);

        // Try to add 2 but stock is only 1
        CartController.CartItemRequest request = new CartController.CartItemRequest(1L, 2);

        mockMvc.perform(post("/api/cart/add")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jackson3Mapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Insufficient stock")));
    }

    @Test
    public void testAddToCart_ProductNotFound() throws Exception {
        Mockito.when(productClient.getProductById(999L)).thenReturn(null);

        CartController.CartItemRequest request = new CartController.CartItemRequest(999L, 1);

        mockMvc.perform(post("/api/cart/add")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jackson3Mapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("does not exist in inventory")));
    }

    @Test
    public void testGetCartItems() throws Exception {
        CartItem item1 = new CartItem(null, 1L, "Item 1", new BigDecimal("10.00"), 2);
        CartItem item2 = new CartItem(null, 2L, "Item 2", new BigDecimal("20.00"), 3);
        cartItemRepository.save(item1);
        cartItemRepository.save(item2);

        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].productName", is("Item 1")))
                .andExpect(jsonPath("$[1].productName", is("Item 2")));
    }

    @Test
    public void testRemoveFromCart_Success() throws Exception {
        CartItem item = new CartItem(null, 1L, "Item 1", new BigDecimal("10.00"), 3);
        cartItemRepository.save(item);

        CartController.CartItemRequest request = new CartController.CartItemRequest(1L, 1);

        mockMvc.perform(post("/api/cart/remove")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jackson3Mapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productId", is(1)))
                .andExpect(jsonPath("$.quantity", is(2)));
    }

    @Test
    public void testRemoveFromCart_DeletedWhenZero() throws Exception {
        CartItem item = new CartItem(null, 1L, "Item 1", new BigDecimal("10.00"), 2);
        cartItemRepository.save(item);

        CartController.CartItemRequest request = new CartController.CartItemRequest(1L, 2);

        mockMvc.perform(post("/api/cart/remove")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jackson3Mapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    public void testClearCart() throws Exception {
        CartItem item = new CartItem(null, 1L, "Item 1", new BigDecimal("10.00"), 2);
        cartItemRepository.save(item);

        mockMvc.perform(delete("/api/cart/clear"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
