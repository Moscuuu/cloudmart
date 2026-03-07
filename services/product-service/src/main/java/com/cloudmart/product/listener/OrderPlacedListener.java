package com.cloudmart.product.listener;

import com.cloudmart.product.dto.OrderPlacedEvent;
import com.cloudmart.product.service.InventoryService;
import com.google.cloud.spring.pubsub.support.BasicAcknowledgeablePubsubMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class OrderPlacedListener {

    private static final Logger log = LoggerFactory.getLogger(OrderPlacedListener.class);

    private final InventoryService inventoryService;

    public OrderPlacedListener(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    public void handleOrderPlaced(OrderPlacedEvent event,
                                  BasicAcknowledgeablePubsubMessage ackMessage) {
        log.info("Received order-placed event: orderId={}, productId={}, quantity={}",
                event.orderId(), event.productId(), event.quantity());

        try {
            boolean success = inventoryService.decrementStock(event.productId(), event.quantity());
            if (success) {
                log.info("Successfully decremented stock for order {}, product {}",
                        event.orderId(), event.productId());
            } else {
                log.warn("Insufficient stock for order {}, product {} -- skipping decrement",
                        event.orderId(), event.productId());
            }
            ackMessage.ack();
        } catch (Exception ex) {
            log.error("Failed to process order-placed event for order {}: {}",
                    event.orderId(), ex.getMessage(), ex);
            ackMessage.nack();
        }
    }
}
