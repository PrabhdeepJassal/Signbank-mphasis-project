package com.signbank.backend.dto.response;

public class AlertRuleResponse {
    private String ruleId;
    private String name;
    private String category;
    private String description;
    private boolean enabled;
    private String severity;
    private String params;

    public AlertRuleResponse() {}

    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    public String getParams() { return params; }
    public void setParams(String params) { this.params = params; }
}
