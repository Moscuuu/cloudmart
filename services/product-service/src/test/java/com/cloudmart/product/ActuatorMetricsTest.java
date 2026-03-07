package com.cloudmart.product;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class ActuatorMetricsTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldExposePrometheusEndpoint() {
        // First make an HTTP request so http_server_requests metrics get recorded
        restTemplate.getForEntity("/actuator/health", String.class);

        ResponseEntity<String> response = restTemplate.getForEntity(
                "/actuator/prometheus", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("http_server_requests");
    }

    @Test
    void shouldExposeHealthEndpoint() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                "/actuator/health", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    void shouldContainDatabaseHealthIndicator() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                "/actuator/health", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"db\"");
    }

    @Test
    void shouldExposeJvmMetrics() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                "/actuator/prometheus", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("jvm_memory_used_bytes");
    }
}
