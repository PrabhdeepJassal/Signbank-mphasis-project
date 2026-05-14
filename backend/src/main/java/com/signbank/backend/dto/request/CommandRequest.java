package com.signbank.backend.dto.request;

public class CommandRequest {

    private String commandName;
    private String commandDescription;
    private String pageId;

    public String getCommandName() { return commandName; }
    public void setCommandName(String commandName) { this.commandName = commandName; }

    public String getCommandDescription() { return commandDescription; }
    public void setCommandDescription(String commandDescription) { this.commandDescription = commandDescription; }

    public String getPageId() { return pageId; }
    public void setPageId(String pageId) { this.pageId = pageId; }
}