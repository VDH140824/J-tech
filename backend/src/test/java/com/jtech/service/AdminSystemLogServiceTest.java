package com.jtech.service;

import com.jtech.repository.SystemLogRepository;
import java.time.LocalDate;
import java.util.Optional;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.util.List;
import com.jtech.dto.response.SystemLogResponse;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminSystemLogServiceTest {
    private final SystemLogRepository repository=mock(SystemLogRepository.class);
    private final AdminSystemLogService service=new AdminSystemLogService(repository);
    @Test void rejectsInvalidFiltersBeforeQuerying() {
        assertThrows(ResponseStatusException.class, () -> service.list(null,null,null,null,null,-1,10));
        assertThrows(ResponseStatusException.class, () -> service.list(null,null,null,null,null,0,101));
        assertThrows(ResponseStatusException.class, () -> service.list(null,"DEBUG",null,null,null,0,10));
        assertThrows(ResponseStatusException.class, () -> service.list(null,null,null,LocalDate.of(2026,2,2),LocalDate.of(2026,2,1),0,10));
        verifyNoInteractions(repository);
    }
    @Test void normalizesLevelAndPassesPagination() {
        service.list("admin"," warning ","AdminUser",null,null,2,25);
        verify(repository).find("admin","WARNING","AdminUser",null,null,PageRequest.of(2,25));
    }
    @Test void missingDetailReturns404() {
        when(repository.findById(9)).thenReturn(Optional.empty());
        assertEquals(404,assertThrows(ResponseStatusException.class, () -> service.detail(9)).getStatusCode().value());
    }
    @Test void repositoryBindsFiltersAndUsesExclusiveEndDateWithStableOrdering() throws Exception {
        var db=mock(JdbcTemplate.class);
        var queries=new SystemLogRepository(db,new ObjectMapper());
        var from=LocalDate.of(2026,11,1);
        var to=LocalDate.of(2026,11,17);
        when(db.queryForObject(org.mockito.ArgumentMatchers.anyString(),eq(Long.class),
            eq("O'Reilly"),eq("O'Reilly"),eq("O'Reilly"),eq("INFO"),eq("AdminUser"),eq(from.atStartOfDay()),eq(to.plusDays(1).atStartOfDay())))
            .thenReturn(1L);
        var row=mock(ResultSet.class);
        when(row.getLong("id")).thenReturn(7L);
        when(row.getString("detail")).thenReturn("{\"result\":\"SUCCESS\"}");
        when(row.getTimestamp("created_at")).thenReturn(Timestamp.valueOf("2026-11-17 12:00:00"));
        when(db.query(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.<RowMapper<SystemLogResponse>>any(),
            eq("O'Reilly"),eq("O'Reilly"),eq("O'Reilly"),eq("INFO"),eq("AdminUser"),eq(from.atStartOfDay()),eq(to.plusDays(1).atStartOfDay()),eq(10),eq(20L)))
            .thenAnswer(invocation -> {
                String sql=invocation.getArgument(0);
                assertTrue(sql.contains("ORDER BY a.created_at DESC,a.id DESC LIMIT ? OFFSET ?"));
                assertFalse(sql.contains("O'Reilly"));
                RowMapper<SystemLogResponse> mapper=invocation.getArgument(1);
                return List.of(mapper.mapRow(row,0));
            });
        var result=queries.find("O'Reilly","INFO","AdminUser",from,to,PageRequest.of(2,10));
        assertEquals(7L,result.getContent().getFirst().id());
        assertEquals("SUCCESS",result.getContent().getFirst().detail().get("result").asText());
        assertNull(result.getContent().getFirst().userId());
    }
}
