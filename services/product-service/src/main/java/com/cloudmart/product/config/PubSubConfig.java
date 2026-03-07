package com.cloudmart.product.config;

import com.cloudmart.product.dto.OrderPlacedEvent;
import com.cloudmart.product.listener.OrderPlacedListener;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.spring.pubsub.core.PubSubTemplate;
import com.google.cloud.spring.pubsub.support.BasicAcknowledgeablePubsubMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "spring.cloud.gcp.pubsub.enabled", havingValue = "true", matchIfMissing = true)
public class PubSubConfig {

    private static final Logger log = LoggerFactory.getLogger(PubSubConfig.class);
    private static final String SUBSCRIPTION_NAME = "order-placed-product-service";

    @Bean
    public PubSubSubscriptionInitializer orderPlacedSubscription(
            PubSubTemplate pubSubTemplate,
            OrderPlacedListener listener,
            ObjectMapper objectMapper) {

        pubSubTemplate.subscribe(SUBSCRIPTION_NAME,
                (BasicAcknowledgeablePubsubMessage message) -> {
                    try {
                        String payload = message.getPubsubMessage()
                                .getData()
                                .toStringUtf8();
                        OrderPlacedEvent event = objectMapper.readValue(payload, OrderPlacedEvent.class);
                        listener.handleOrderPlaced(event, message);
                    } catch (Exception ex) {
                        log.error("Failed to deserialize order-placed message: {}", ex.getMessage(), ex);
                        message.nack();
                    }
                });

        log.info("Subscribed to Pub/Sub subscription: {}", SUBSCRIPTION_NAME);
        return new PubSubSubscriptionInitializer();
    }

    /**
     * Marker bean to indicate subscription was initialized.
     */
    static class PubSubSubscriptionInitializer {
    }
}
