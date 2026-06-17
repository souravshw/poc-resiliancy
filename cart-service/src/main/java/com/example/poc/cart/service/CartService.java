package com.example.poc.cart.service;

import com.example.poc.cart.client.ProductClient;
import com.example.poc.cart.model.CartItem;
import com.example.poc.cart.repository.CartItemRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductClient productClient;

    @Autowired
    public CartService(CartItemRepository cartItemRepository, ProductClient productClient) {
        this.cartItemRepository = cartItemRepository;
        this.productClient = productClient;
    }

    @Transactional(readOnly = true)
    public List<CartItem> getCartItems() {
        return cartItemRepository.findAll();
    }

    @Transactional
    public CartItem addToCart(Long productId, Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero");
        }

        // 1. Fetch product details from product-service
        ProductClient.ProductDto product = productClient.getProductById(productId);
        if (product == null) {
            throw new IllegalArgumentException("Cannot add to cart: Product with ID " + productId + " does not exist in inventory.");
        }

        Optional<CartItem> existingItemOpt = cartItemRepository.findByProductId(productId);
        CartItem cartItem;

        if (existingItemOpt.isPresent()) {
            cartItem = existingItemOpt.get();
            int newQuantity = cartItem.getQuantity() + quantity;
            
            // Validate stock
            if (product.getQuantity() < newQuantity) {
                throw new IllegalArgumentException("Cannot add to cart: Insufficient stock. Only " + product.getQuantity() + " items available in inventory.");
            }
            
            cartItem.setQuantity(newQuantity);
            // Refresh details in case name or price changed
            cartItem.setProductName(product.getName());
            cartItem.setPrice(product.getPrice());
        } else {
            // Validate stock
            if (product.getQuantity() < quantity) {
                throw new IllegalArgumentException("Cannot add to cart: Insufficient stock. Only " + product.getQuantity() + " items available in inventory.");
            }

            cartItem = new CartItem(
                    null,
                    productId,
                    product.getName(),
                    product.getPrice(),
                    quantity
            );
        }

        return cartItemRepository.save(cartItem);
    }

    @Transactional
    public CartItem removeFromCart(Long productId, Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Quantity to remove must be greater than zero");
        }

        Optional<CartItem> existingItemOpt = cartItemRepository.findByProductId(productId);
        if (existingItemOpt.isEmpty()) {
            return null;
        }

        CartItem cartItem = existingItemOpt.get();
        int newQuantity = cartItem.getQuantity() - quantity;

        if (newQuantity <= 0) {
            cartItemRepository.delete(cartItem);
            return null;
        } else {
            cartItem.setQuantity(newQuantity);
            return cartItemRepository.save(cartItem);
        }
    }

    @Transactional
    public void clearCart() {
        cartItemRepository.deleteAll();
    }
}
