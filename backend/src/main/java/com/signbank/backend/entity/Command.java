package com.signbank.backend.entity;

import jakarta.persistence.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@Entity
@Table(name = "commands")
public class Command {

    @Id
    @Column(name = "command_id")
    private String commandId;

    @Column(name = "command_name")
    private String commandName;

    @Column(name = "command_description")
    private String commandDescription;


    @ManyToOne
    @JoinColumn(name = "page_id")
    private Page page;

    public Command(){}

    public Command(String commandId, String commandName, String commandDescription, Page page) {
        this.commandId = commandId;
        this.commandName = commandName;
        this.commandDescription = commandDescription;
        this.page = page;
    }


    public String getCommandId() {
        return commandId;
    }

    public void setCommandId(String commandId) {
        this.commandId = commandId;
    }


    public String getCommandName() {
        return commandName;
    }

    public void setCommandName(String commandName) {
        this.commandName = commandName;
    }
    public Page getPage() {
        return page;
    }

    public void setPage(Page page) {
        this.page = page;

    }

    public String getCommandDescription() {
        return commandDescription;
    }

    public void setCommandDescription(String commandDescription) {
        this.commandDescription = commandDescription;
    }

}
