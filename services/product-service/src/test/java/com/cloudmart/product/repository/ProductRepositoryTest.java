package com.cloudmart.product.repository;

import com.cloudmart.product.TestcontainersConfiguration;
import com.cloudmart.product.model.Category;
import com.cloudmart.product.model.Product;
import com.cloudmart.product.model.ProductStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProductRepositoryTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Category testCategory;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
        categoryRepository.deleteAll();

        testCategory = new Category("Test Electronics", "Test category for electronics");
        testCategory = categoryRepository.save(testCategory);
    }

    @Test
    void shouldFindProductBySku() {
        Product product = createProduct("Test Laptop", "SKU-FIND-001", new BigDecimal("999.99"));
        productRepository.save(product);

        Optional<Product> found = productRepository.findBySku("SKU-FIND-001");

        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Test Laptop");
        assertThat(found.get().getSku()).isEqualTo("SKU-FIND-001");
    }

    @Test
    void shouldReturnEmptyForNonExistentSku() {
        Optional<Product> found = productRepository.findBySku("NON-EXISTENT-SKU-" + UUID.randomUUID());

        assertThat(found).isEmpty();
    }

    @Test
    void shouldSaveAndRetrieveProduct() {
        Product product = createProduct("Test Monitor", "SKU-SAVE-001", new BigDecimal("499.99"));
        product.setDescription("A test 27-inch monitor");
        product.setImageUrl("https://example.com/monitor.jpg");
        Product saved = productRepository.save(product);

        Optional<Product> found = productRepository.findById(saved.getId());

        assertThat(found).isPresent();
        Product retrieved = found.get();
        assertThat(retrieved.getName()).isEqualTo("Test Monitor");
        assertThat(retrieved.getDescription()).isEqualTo("A test 27-inch monitor");
        assertThat(retrieved.getPrice()).isEqualByComparingTo(new BigDecimal("499.99"));
        assertThat(retrieved.getImageUrl()).isEqualTo("https://example.com/monitor.jpg");
        assertThat(retrieved.getSku()).isEqualTo("SKU-SAVE-001");
        assertThat(retrieved.getStatus()).isEqualTo(ProductStatus.ACTIVE);
        assertThat(retrieved.getCategory()).isNotNull();
        assertThat(retrieved.getCategory().getName()).isEqualTo("Test Electronics");
    }

    @Test
    void shouldGenerateUuidOnSave() {
        Product product = createProduct("Test Keyboard", "SKU-UUID-001", new BigDecimal("79.99"));
        assertThat(product.getId()).isNull();

        Product saved = productRepository.save(product);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getId()).isInstanceOf(UUID.class);
    }

    @Test
    void shouldSetTimestampsOnCreate() {
        Product product = createProduct("Test Mouse", "SKU-TIME-001", new BigDecimal("29.99"));
        Product saved = productRepository.save(product);

        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
        assertThat(saved.getCreatedAt()).isEqualTo(saved.getUpdatedAt());
    }

    private Product createProduct(String name, String sku, BigDecimal price) {
        Product product = new Product();
        product.setName(name);
        product.setSku(sku);
        product.setPrice(price);
        product.setStatus(ProductStatus.ACTIVE);
        product.setCategory(testCategory);
        return product;
    }
}
