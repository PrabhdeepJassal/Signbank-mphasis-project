package com.signbank.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "pages")
public class Page {

    @Id
    @Column(name = "page_id")
    private String pageId;

    @Column(name = "page_name")
    private String pageName;

    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;

    public String getPageId() {
        return pageId;
    }

    public void setPageId(String pageId) {
        this.pageId = pageId;
    }

    public String getPageName() {
        return pageName;
    }

    public void setPageName(String pageName) {
        this.pageName = pageName;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}