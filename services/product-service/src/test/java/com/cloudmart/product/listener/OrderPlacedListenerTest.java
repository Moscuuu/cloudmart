package com.cloudmart.product.listener;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.cloudmart.product.TestcontainersConfiguration;
import com.cloudmart.product.dto.InventoryResponse;
import com.cloudmart.product.dto.OrderPlacedEvent;
import com.cloudmart.product.model.Category;
import com.cloudmart.product.model.Inventory;
import com.cloudmart.product.model.Product;
import com.cloudmart.product.model.ProductStatus;
import com.cloudmart.product.repository.CategoryRepository;
import com.cloudmart.product.repository.InventoryRepository;
import com.cloudmart.product.repository.ProductRepository;
import com.cloudmart.product.service.InventoryService;
import com.google.cloud.spring.pubsub.support.BasicAcknowledgeablePubsubMessage;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class OrderPlacedListenerTest {

    @Autowired
    private OrderPlacedListener listener;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private UUID testProductId;

    @BeforeEach
    void setUp() {
        inventoryRepository.deleteAll();
        productRepository.deleteAll();
        categoryRepository.deleteAll();

        Category category = new Category("Test Category", "For testing");
        category = categoryRepository.save(category);

        Product product = new Product();
        product.setName("Listener Test Product");
        product.setDescription("Product for listener tests");
        product.setPrice(new BigDecimal("49.99"));
        product.setSku("LISTENER-TEST-001");
        product.setStatus(ProductStatus.ACTIVE);
        product.setCategory(category);
        product = productRepository.save(product);
        testProductId = product.getId();

        Inventory inventory = new Inventory(testProductId, 50);
        inventoryRepository.save(inventory);
    }

    @Test
    void shouldDecrementInventoryOnOrderPlaced() {
        BasicAcknowledgeablePubsubMessage mockAck = mock(BasicAcknowledgeablePubsubMessage.class);
        OrderPlacedEvent event = new OrderPlacedEvent("order-001", testProductId, 5);

        listener.handleOrderPlaced(event, mockAck);

        verify(mockAck).ack();

        InventoryResponse inventory = inventoryService.getInventory(testProductId);
        assertThat(inventory.quantity()).isEqualTo(45);
        assertThat(inventory.availableQuantity()).isEqualTo(45);
    }

    @Test
    void shouldNackOnProcessingFailure() {
        BasicAcknowledgeablePubsubMessage mockAck = mock(BasicAcknowledgeablePubsubMessage.class);
        UUID nonExistentProductId = UUID.randomUUID();
        OrderPlacedEvent event = new OrderPlacedEvent("order-002", nonExistentProductId, 1);

        listener.handleOrderPlaced(event, mockAck);

        verify(mockAck).nack();
    }

    @Test
    void shouldHandleInsufficientStock() {
        BasicAcknowledgeablePubsubMessage mockAck = mock(BasicAcknowledgeablePubsubMessage.class);
        OrderPlacedEvent event = new OrderPlacedEvent("order-003", testProductId, 100);

        listener.handleOrderPlaced(event, mockAck);

        // Should ack even with insufficient stock (graceful handling, no retry)
        verify(mockAck).ack();

        // Inventory should NOT be decremented
        InventoryResponse inventory = inventoryService.getInventory(testProductId);
        assertThat(inventory.quantity()).isEqualTo(50);
        assertThat(inventory.availableQuantity()).isEqualTo(50);
    }
}
