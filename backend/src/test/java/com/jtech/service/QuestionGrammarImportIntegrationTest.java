package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.entity.Question;
import com.jtech.entity.User;
import com.jtech.repository.*;
import jakarta.persistence.EntityManagerFactory;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.AdditionalAnswers;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/** Opt-in only: JTECH_MYSQL_TEST_URL must point to a seeded, dedicated test database. No DDL. */
@EnabledIfEnvironmentVariable(named = "JTECH_MYSQL_TEST_URL", matches = ".+")
class QuestionGrammarImportIntegrationTest {
    private AnnotationConfigApplicationContext context;
    private JdbcTemplate jdbc;
    private long grammarId;
    private QuestionGrammarService service;
    private QuestionGrammarRepository writer;

    @Configuration(proxyBeanMethods = false)
    @EnableTransactionManagement
    @EnableJpaRepositories(basePackages = "com.jtech.repository", excludeFilters = @ComponentScan.Filter(
            type = FilterType.REGEX, pattern = "com\\.jtech\\.repository\\.(?!(GrammarRepository|QuestionGrammarRepository)$).*"))
    static class Config {
        @Bean DataSource dataSource() {
            return new DriverManagerDataSource(System.getenv("JTECH_MYSQL_TEST_URL"),
                    System.getenv("JTECH_MYSQL_TEST_USER"), System.getenv("JTECH_MYSQL_TEST_PASSWORD"));
        }
        @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setPackagesToScan("com.jtech.entity");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "none"));
            return factory;
        }
        @Bean JpaTransactionManager transactionManager(EntityManagerFactory factory) { return new JpaTransactionManager(factory); }
        @Bean CountDownLatch importUsersRead() { return new CountDownLatch(2); }
        @Bean("importWriter") QuestionGrammarRepository importWriter(
                @Qualifier("questionGrammarRepository") QuestionGrammarRepository actual) {
            return mock(QuestionGrammarRepository.class, AdditionalAnswers.delegatesTo(actual));
        }
        @Bean QuestionGrammarService service(@Qualifier("importWriter") QuestionGrammarRepository writer,
                                            GrammarRepository grammars, DataSource dataSource, CountDownLatch importUsersRead) {
            var userRepo = mock(UserRepository.class);
            var user = new User();
            user.setUserId(new JdbcTemplate(dataSource).queryForObject("SELECT id FROM user_account ORDER BY id LIMIT 1", Long.class));
            when(userRepo.findByEmail("import-test@example.com")).thenAnswer(invocation -> {
                importUsersRead.countDown();
                return Optional.of(user);
            });
            return new QuestionGrammarService(writer, userRepo, mock(LessonRepository.class), grammars,
                    new ObjectMapper());
        }
    }

    @BeforeEach void setup() {
        context = new AnnotationConfigApplicationContext(Config.class);
        jdbc = new JdbcTemplate(context.getBean(DataSource.class));
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO grammar (lesson_id, structure_name, meaning_vi, usage_explanation,
                                     example_jp, example_vi, display_order, status)
                SELECT l.id, ?, 'import test', 'import test', '例', 'ví dụ', 0, 'DRAFT'
                FROM lesson l WHERE l.skill_type='GRAMMAR' ORDER BY l.id LIMIT 1
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, "import-test-" + UUID.randomUUID());
            return statement;
        }, key);
        assertNotNull(key.getKey(), "Test database needs a Grammar lesson and user account.");
        grammarId = key.getKey().longValue();
        service = context.getBean(QuestionGrammarService.class);
        writer = context.getBean("importWriter", QuestionGrammarRepository.class);
    }

    @AfterEach void cleanup() {
        try {
            if (jdbc != null && grammarId != 0) {
                jdbc.update("DELETE FROM question WHERE grammar_id=?", grammarId);
                jdbc.update("DELETE FROM grammar WHERE id=?", grammarId);
            }
        } finally {
            if (context != null) context.close();
        }
    }

    @Test void rollsBackAnActualInsertWhenBatchFails() throws Exception {
        var actual = context.getBean("questionGrammarRepository", QuestionGrammarRepository.class);
        doAnswer(invocation -> {
            List<Question> questions = invocation.getArgument(0);
            actual.saveAndFlush(questions.getFirst());
            throw new IllegalStateException("Simulated failure after first insert");
        }).when(writer).saveAllAndFlush(anyList());
        var file = QuestionGrammarServiceTest.excelWorkbook(sheet -> {
            QuestionGrammarServiceTest.excelQuestion(sheet, 2);
            QuestionGrammarServiceTest.excelQuestion(sheet, 3);
        });
        assertThrows(IllegalStateException.class, () -> service.importGrammarQuestions(grammarId, file, "import-test@example.com"));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM question WHERE grammar_id=?", Integer.class, grammarId));
    }

    @Test void serializesConcurrentImportsAndReadsFreshOrderAfterLock() throws Exception {
        var actual = context.getBean("questionGrammarRepository", QuestionGrammarRepository.class);
        var firstHasLock = new CountDownLatch(1);
        var releaseFirst = new CountDownLatch(1);
        var calls = new java.util.concurrent.atomic.AtomicInteger();
        doAnswer(invocation -> {
            if (calls.incrementAndGet() == 1) {
                firstHasLock.countDown();
                assertTrue(releaseFirst.await(10, TimeUnit.SECONDS));
            }
            return actual.findMaxDisplayOrderByGrammarId(grammarId, Question.Skill.GRAMMAR);
        }).when(writer).findMaxDisplayOrderByGrammarId(grammarId, Question.Skill.GRAMMAR);
        var file = QuestionGrammarServiceTest.excelWorkbook(sheet -> {
            for (int i = 2; i < 102; i++) QuestionGrammarServiceTest.excelQuestion(sheet, i);
        });
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> service.importGrammarQuestions(grammarId, file, "import-test@example.com"));
            try {
                assertTrue(firstHasLock.await(10, TimeUnit.SECONDS));
                var second = executor.submit(() -> service.importGrammarQuestions(grammarId, file, "import-test@example.com"));
                assertTrue(context.getBean(CountDownLatch.class).await(10, TimeUnit.SECONDS));
                releaseFirst.countDown();
                assertEquals(100, first.get(20, TimeUnit.SECONDS).importedCount());
                assertEquals(100, second.get(20, TimeUnit.SECONDS).importedCount());
            } finally { releaseFirst.countDown(); }
        }
        var orders = jdbc.queryForList("SELECT display_order FROM question WHERE grammar_id=? ORDER BY display_order", Integer.class, grammarId);
        assertEquals(java.util.stream.IntStream.rangeClosed(1, 200).boxed().toList(), orders);
    }
}
