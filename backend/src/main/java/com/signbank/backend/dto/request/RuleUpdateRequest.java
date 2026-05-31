package com.signbank.backend.dto.request;

public class RuleUpdateRequest {
    private Boolean enabled;
    private String params;

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getParams() { return params; }
    public void setParams(String params) { this.params = params; }
}
