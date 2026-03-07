package com.cloudmart.product.service;

import com.cloudmart.product.dto.InventoryResponse;
import com.cloudmart.product.exception.ResourceNotFoundException;
import com.cloudmart.product.model.Inventory;
import com.cloudmart.product.repository.InventoryRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class InventoryService {

    private static final Logger log = LoggerFactory.getLogger(InventoryService.class);

    private final InventoryRepository inventoryRepository;

    public InventoryService(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    public InventoryResponse getInventory(UUID productId) {
        Inventory inventory = inventoryRepository.findByProductId(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory", productId));
        return toResponse(inventory);
    }

    @Transactional
    public boolean decrementStock(UUID productId, int quantity) {
        Inventory inventory = inventoryRepository.findByProductId(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory", productId));

        if (inventory.getAvailableQuantity() < quantity) {
            log.warn("Insufficient stock for product {}: available={}, requested={}",
                    productId, inventory.getAvailableQuantity(), quantity);
            return false;
        }

        inventory.setQuantity(inventory.getQuantity() - quantity);
        inventoryRepository.save(inventory);
        log.info("Decremented stock for product {}: new quantity={}", productId, inventory.getQuantity());
        return true;
    }

    private InventoryResponse toResponse(Inventory inventory) {
        return new InventoryResponse(
                inventory.getProductId(),
                inventory.getQuantity(),
                inventory.getReservedQuantity(),
                inventory.getAvailableQuantity()
        );
    }
}
