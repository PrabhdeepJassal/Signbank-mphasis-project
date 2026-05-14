package com.signbank.backend.controller;

import com.signbank.backend.dto.request.*;
import com.signbank.backend.dto.response.*;
import com.signbank.backend.entity.*;
import com.signbank.backend.service.AdminService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ───────────────── ROLES ─────────────────
    @GetMapping("/roles")
    public List<Role> getRoles() {
        return adminService.getRoles();
    }

    // ───────────────── USERS ─────────────────
    @GetMapping("/users")
    public List<UserResponse> getUsers() {
        return adminService.getUsers();
    }
    
    

    @PostMapping("/users")
    public UserResponse createUser(@RequestBody UserCreateRequest request) {
        return adminService.createUser(request);
    }

    @PutMapping("/users/{id}")
    public UserResponse updateUser(@PathVariable String id,
                                  @RequestBody UserCreateRequest request) {
        return adminService.updateUser(id, request);
    }

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable String id) {
        adminService.deleteUser(id);
    }

    // ───────────────── GESTURES ─────────────────
    @GetMapping("/gestures")
    public List<GestureResponse> getGestures() {
        return adminService.getGestures();
    }

    @PostMapping("/gestures")
    public GestureResponse createGesture(@RequestBody GestureRequest request) {
        return adminService.createGesture(request);
    }

    @PutMapping("/gestures/{id}")
    public GestureResponse updateGesture(@PathVariable String id,
                                         @RequestBody GestureRequest request) {
        return adminService.updateGesture(id, request);
    }

    @DeleteMapping("/gestures/{id}")
    public void deleteGesture(@PathVariable String id) {
        adminService.deleteGesture(id);
    }

    // ───────────────── PAGES ─────────────────
    @GetMapping("/pages")
    public List<Page> getPages() {
        return adminService.getPages();
    }

    @PostMapping("/pages")
    public Page createPage(@RequestBody PageRequest request) {
        return adminService.createPage(request);
    }

    @PutMapping("/pages/{id}")
    public Page updatePage(@PathVariable String id,
                           @RequestBody PageRequest request) {
        return adminService.updatePage(id, request);
    }

    @DeleteMapping("/pages/{id}")
    public void deletePage(@PathVariable String id) {
        adminService.deletePage(id);
    }

    // ───────────────── COMMANDS ─────────────────
    @GetMapping("/commands")
    public List<Command> getCommands() {
        return adminService.getCommands();
    }

    @PostMapping("/commands")
    public Command createCommand(@RequestBody CommandRequest request) {
        return adminService.createCommand(request);
    }

    @PutMapping("/commands/{id}")
    public Command updateCommand(@PathVariable String id,
                                 @RequestBody CommandRequest request) {
        return adminService.updateCommand(id, request);
    }

    @DeleteMapping("/commands/{id}")
    public void deleteCommand(@PathVariable String id) {
        adminService.deleteCommand(id);
    }

    // ───────────────── MAPPINGS ─────────────────
    @GetMapping("/mappings")
    public List<CommandMappingResponse> getMappings() {
        return adminService.getMappings();
    }

    @PostMapping("/mappings")
    public CommandMappingResponse createMapping(@RequestBody CommandMappingRequest request) {
        return adminService.createMapping(request);
    }

    @PutMapping("/mappings/{mapId}")
    public CommandMappingResponse updateMapping(
            @PathVariable String mapId,
            @RequestBody CommandMappingRequest request) {
        return adminService.updateMapping(mapId, request);
    }

    @PatchMapping("/mappings/{mapId}/status")
    public void toggleMappingStatus(
            @PathVariable String mapId,
            @RequestParam Boolean active) {
        adminService.updateMappingStatus(mapId, active);
    }

    @DeleteMapping("/mappings/{mapId}")
    public void deleteMapping(@PathVariable String mapId) {
        adminService.deleteMapping(mapId);
    }
}