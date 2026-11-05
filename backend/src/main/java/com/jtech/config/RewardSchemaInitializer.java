package com.jtech.config;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

@Component
public class RewardSchemaInitializer implements ApplicationRunner {
    private final DataSource dataSource;

    public RewardSchemaInitializer(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (var connection = dataSource.getConnection()) {
            if (!"MySQL".equals(connection.getMetaData().getDatabaseProductName())) return;
            ScriptUtils.executeSqlScript(connection, migration("20261104_learning_streak.sql"));
            if (!hasColumn(connection, "user_account", "exp_balance")) {
                ScriptUtils.executeSqlScript(connection, migration("20261104_coin_reward_exp.sql"));
            }
            ScriptUtils.executeSqlScript(connection, migration("20261104_coin_rules.sql"));
            if (!hasColumn(connection, "feedback", "version")) {
                ScriptUtils.executeSqlScript(connection, migration("20261104_feedback_version.sql"));
            }
            ScriptUtils.executeSqlScript(connection, migration("20261104_feedback_roles.sql"));
            ScriptUtils.executeSqlScript(connection, migration("20261105_correct_reward_frames.sql"));
            ScriptUtils.executeSqlScript(connection, migration("20261105_correct_reward_avatars.sql"));
        }
    }

    private boolean hasColumn(java.sql.Connection connection, String table, String column)
            throws java.sql.SQLException {
        try (var columns = connection.getMetaData().getColumns(connection.getCatalog(), null, table, column)) {
            return columns.next();
        }
    }

    private EncodedResource migration(String name) {
        return new EncodedResource(new ClassPathResource("reward-migrations/" + name), StandardCharsets.UTF_8);
    }
}
