package com.jtech.dto.request;

public class ExchangeTokenRequest {
    private String code;

    public ExchangeTokenRequest() {
    }

    public ExchangeTokenRequest(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}
