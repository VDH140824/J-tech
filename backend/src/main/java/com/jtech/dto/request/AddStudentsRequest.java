package com.jtech.dto.request;

import java.util.List;

public record AddStudentsRequest(List<String> emails) {
}
