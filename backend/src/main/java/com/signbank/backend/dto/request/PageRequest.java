package com.signbank.backend.dto.request;

public class PageRequest {

    private String pageName;
    private String roleId;

    public String getPageName() { return pageName; }
    public void setPageName(String pageName) { this.pageName = pageName; }

    public String getRoleId() { return roleId; }
    public void setRoleId(String roleId) { this.roleId = roleId; }
}