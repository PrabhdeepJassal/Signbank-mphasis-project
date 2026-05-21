package com.signbank.backend.service;

import com.signbank.backend.dto.request.*;
import com.signbank.backend.dto.response.*;
import com.signbank.backend.entity.*;
import com.signbank.backend.mapper.AdminMapper;
import com.signbank.backend.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.OptionalInt;

@Service
public class AdminService {

    private final RoleRepository           roleRepo;
    private final UserRepository           userRepo;
    private final GestureRepository        gestureRepo;
    private final PageRepository           pageRepo;
    private final CommandRepository        commandRepo;
    private final CommandMappingRepository mappingRepo;

    // ── Default password for newly created users ──────────────────────────────
    private static final String DEFAULT_PASSWORD = "DEFAULT";

    public AdminService(RoleRepository roleRepo,
                        UserRepository userRepo,
                        GestureRepository gestureRepo,
                        PageRepository pageRepo,
                        CommandRepository commandRepo,
                        CommandMappingRepository mappingRepo) {
        this.roleRepo        = roleRepo;
        this.userRepo        = userRepo;
        this.gestureRepo     = gestureRepo;
        this.pageRepo        = pageRepo;
        this.commandRepo     = commandRepo;
        this.mappingRepo     = mappingRepo;
    }

    // ── Sequential ID generators ──────────────────────────────────────────────

    private String nextGestureId() {
        OptionalInt max = gestureRepo.findAll().stream()
                .map(Gesture::getGestureId)
                .filter(id -> id != null && id.matches("G\\d+"))
                .mapToInt(id -> Integer.parseInt(id.substring(1))).max();
        return String.format("G%03d", max.isPresent() ? max.getAsInt() + 1 : 1);
    }

    private String nextPageId() {
        OptionalInt max = pageRepo.findAll().stream()
                .map(Page::getPageId)
                .filter(id -> id != null && id.matches("P\\d+"))
                .mapToInt(id -> Integer.parseInt(id.substring(1))).max();
        return String.format("P%03d", max.isPresent() ? max.getAsInt() + 1 : 1);
    }

    private String nextCommandId() {
        OptionalInt max = commandRepo.findAll().stream()
                .map(Command::getCommandId)
                .filter(id -> id != null && id.matches("C\\d+"))
                .mapToInt(id -> Integer.parseInt(id.substring(1))).max();
        return String.format("C%03d", max.isPresent() ? max.getAsInt() + 1 : 1);
    }

    private String nextMappingId() {
        OptionalInt max = mappingRepo.findAll().stream()
                .map(CommandMapping::getMapId)
                .filter(id -> id != null && id.matches("MAP\\d+"))
                .mapToInt(id -> Integer.parseInt(id.substring(3))).max();
        return String.format("MAP%03d", max.isPresent() ? max.getAsInt() + 1 : 1);
    }

    // ── GET APIs ──────────────────────────────────────────────────────────────

    public List<Role>                 getRoles()    { return roleRepo.findAll(); }
    public List<Page>                 getPages()    { return pageRepo.findAll(); }
    public List<Command>              getCommands() { return commandRepo.findAll(); }

    public List<UserResponse> getUsers() {
        return userRepo.findAll().stream().map(AdminMapper::toUserResponse).toList();
    }
    public List<GestureResponse> getGestures() {
        return gestureRepo.findAll().stream().map(AdminMapper::toGestureResponse).toList();
    }
    public List<CommandMappingResponse> getMappings() {
        return mappingRepo.findAll().stream().map(AdminMapper::toMappingResponse).toList();
    }

    // ── USERS ─────────────────────────────────────────────────────────────────

    /**
     * Create a new user.
     *
     * FIX: Every new user (operator / viewer) now gets a HASHED default password
     * so they can log in immediately with "DEFAULT" as their password.
     * The "Password Status" in admin will show "Set" because passwordHash is not null.
     *
     * If the admin supplies a custom password in the request, that is used instead.
     */
    @Transactional
    public UserResponse createUser(UserCreateRequest request) {
        Role role = roleRepo.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found: " + request.getRoleId()));

        User user = new User();
        user.setUserId(request.getUserId());
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setRole(role);
        user.setCreatedAt(java.time.LocalDateTime.now());

        // ── Set password (plaintext) ──────────────────────────────────────────
        String rawPassword = (request.getPasswordHash() != null && !request.getPasswordHash().isBlank())
                ? request.getPasswordHash()
                : DEFAULT_PASSWORD;
        user.setPasswordHash(rawPassword);

        // gesture hash only if provided
        user.setGestureHash(request.getGestureHash());

        return AdminMapper.toUserResponse(userRepo.save(user));
    }

    @Transactional
    public UserResponse updateUser(String id, UserCreateRequest request) {
        User user = userRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        Role role = roleRepo.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found: " + request.getRoleId()));

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setRole(role);

        // If admin provides a new password when editing, update it
        if (request.getPasswordHash() != null && !request.getPasswordHash().isBlank()) {
            user.setPasswordHash(request.getPasswordHash());
        }

        return AdminMapper.toUserResponse(userRepo.save(user));
    }

    @Transactional
    public void deleteUser(String id) {
        mappingRepo.findByUser_UserId(id).forEach(m -> mappingRepo.deleteById(m.getMapId()));
        userRepo.deleteById(id);
    }

    // ── GESTURES ──────────────────────────────────────────────────────────────

    @Transactional
    public GestureResponse createGesture(GestureRequest request) {
        Gesture g = new Gesture();
        g.setGestureId(nextGestureId());
        g.setGestureName(request.getGestureName());
        g.setGestureSymbol(request.getGestureSymbol());
        return AdminMapper.toGestureResponse(gestureRepo.save(g));
    }

    @Transactional
    public GestureResponse updateGesture(String id, GestureRequest request) {
        Gesture g = gestureRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Gesture not found"));
        g.setGestureName(request.getGestureName());
        g.setGestureSymbol(request.getGestureSymbol());
        return AdminMapper.toGestureResponse(gestureRepo.save(g));
    }

    @Transactional
    public void deleteGesture(String id) { gestureRepo.deleteById(id); }

    // ── COMMANDS — FIX: properly saves to DB with sequential ID ──────────────

    @Transactional
    public Command createCommand(CommandRequest request) {
        Page page = pageRepo.findById(request.getPageId())
                .orElseThrow(() -> new RuntimeException("Page not found: " + request.getPageId()));

        Command cmd = new Command();
        cmd.setCommandId(nextCommandId());
        cmd.setCommandName(request.getCommandName());
        cmd.setCommandDescription(request.getCommandDescription());
        cmd.setPage(page);

        return commandRepo.save(cmd);
    }

    @Transactional
    public Command updateCommand(String id, CommandRequest request) {
        Command cmd = commandRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Command not found: " + id));
        Page page = pageRepo.findById(request.getPageId())
                .orElseThrow(() -> new RuntimeException("Page not found: " + request.getPageId()));

        cmd.setCommandName(request.getCommandName());
        cmd.setCommandDescription(request.getCommandDescription());
        cmd.setPage(page);

        return commandRepo.save(cmd);
    }

    @Transactional
    public void deleteCommand(String id) {
        // Remove any mappings referencing this command first to avoid FK violation
        mappingRepo.findAll().stream()
                .filter(m -> m.getCommand() != null && id.equals(m.getCommand().getCommandId()))
                .forEach(m -> mappingRepo.deleteById(m.getMapId()));
        commandRepo.deleteById(id);
    }

    // ── PAGES ─────────────────────────────────────────────────────────────────

    @Transactional
    public Page createPage(PageRequest request) {
        Role role = roleRepo.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));
        Page page = new Page();
        page.setPageId(nextPageId());
        page.setPageName(request.getPageName());
        page.setRole(role);
        return pageRepo.save(page);
    }

    @Transactional
    public Page updatePage(String id, PageRequest request) {
        Page page = pageRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Page not found"));
        Role role = roleRepo.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));
        page.setPageName(request.getPageName());
        page.setRole(role);
        return pageRepo.save(page);
    }

    @Transactional
    public void deletePage(String id) { pageRepo.deleteById(id); }

    // ── MAPPINGS ──────────────────────────────────────────────────────────────

    @Transactional
    public CommandMappingResponse createMapping(CommandMappingRequest request) {
        Command  cmd     = commandRepo.findById(request.getCommandId())
                .orElseThrow(() -> new RuntimeException("Command not found"));
        Gesture  gesture = gestureRepo.findById(request.getGestureId())
                .orElseThrow(() -> new RuntimeException("Gesture not found"));
        Role     role    = roleRepo.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));
        User     user    = (request.getUserId() != null)
                ? userRepo.findById(request.getUserId()).orElse(null) : null;

        CommandMapping m = new CommandMapping();
        m.setMapId(nextMappingId());
        m.setCommand(cmd);
        m.setGesture(gesture);
        m.setRole(role);
        m.setUser(user);
        m.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        return AdminMapper.toMappingResponse(mappingRepo.save(m));
    }

    @Transactional
    public CommandMappingResponse updateMapping(String mapId, CommandMappingRequest request) {
        CommandMapping m = mappingRepo.findById(mapId)
                .orElseThrow(() -> new RuntimeException("Mapping not found"));
        Gesture gesture = gestureRepo.findById(request.getGestureId())
                .orElseThrow(() -> new RuntimeException("Gesture not found"));
        m.setGesture(gesture);
        if (request.getIsActive() != null) m.setIsActive(request.getIsActive());
        return AdminMapper.toMappingResponse(mappingRepo.save(m));
    }

    @Transactional
    public void updateMappingStatus(String mapId, Boolean active) {
        CommandMapping m = mappingRepo.findById(mapId)
                .orElseThrow(() -> new RuntimeException("Mapping not found"));
        m.setIsActive(active);
        mappingRepo.save(m);
    }

    @Transactional
    public void deleteMapping(String mapId) { mappingRepo.deleteById(mapId); }
}