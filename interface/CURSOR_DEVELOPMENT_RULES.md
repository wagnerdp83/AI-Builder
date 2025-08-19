# 🚨 CURSOR DEVELOPMENT RULES - STRICT ENGINEERING STANDARDS
## AI Page Builder - Beta V2

> **CRITICAL**: These rules MUST be followed for EVERY code change request. No exceptions.

---

## 🚨 GOLDEN RULES - READ BEFORE ANY CODE CHANGE

### 1. **ANALYSIS FIRST - NEVER CODE BLIND**
- **ALWAYS** analyze existing code before making changes
- **ALWAYS** understand the current architecture and dependencies
- **ALWAYS** identify what might be affected by the change
- **NEVER** make assumptions about how code works

### 2. **MINIMAL CHANGE PRINCIPLE**
- Make the **smallest possible change** to achieve the goal
- Touch **only the specific function/component** that needs modification
- **NEVER** refactor unrelated code while fixing an issue
- **NEVER** change imports, exports, or function signatures unless absolutely necessary

### 3. **PRESERVE EXISTING FUNCTIONALITY**
- **NEVER** delete existing functions without explicit user permission
- **NEVER** modify working code that's not related to the issue
- **ALWAYS** maintain backward compatibility
- **ALWAYS** preserve existing API contracts

### 4. **NEVER DIRECTLY EDIT RENDERING COMPONENTS**
- **🚨 CRITICAL: NEVER directly edit files in `/rendering` unless explicitly asked by the user**
- **NEVER hardcode updates into rendering components**
- **ALWAYS work through the `/interface` system and agent handlers**
- The AI agent system exists to handle user requests - use it properly
- Direct rendering edits bypass the entire AI architecture

---

## 📋 MANDATORY ANALYSIS CHECKLIST

Before making ANY change, complete this checklist:

### Pre-Change Analysis
- [ ] **Read and understand** the current code implementation
- [ ] **Identify all dependencies** and imports
- [ ] **Check for usage patterns** across the codebase
- [ ] **Understand the data flow** and function signatures
- [ ] **Identify potential side effects** of the proposed change
- [ ] **Verify the change scope** is minimal and targeted

### Architecture Understanding
- [ ] **Action Pipeline**: Understand Create/Edit/Delete flow
- [ ] **Tool Handlers**: Identify which handler(s) are affected
- [ ] **Orchestration**: Check if orchestrator.ts is impacted
- [ ] **Agent System**: Verify agent decision flow remains intact
- [ ] **Routes**: Ensure API routes are not broken
- [ ] **File Structure**: Respect existing folder organization

---

## 🎯 SPECIFIC RULES BY COMPONENT TYPE

### `/interface/lib/tools/` - Tool Handlers
- **RULE**: Each handler has a specific purpose - don't merge functionalities
- **RULE**: Maintain consistent error handling patterns across all handlers
- **RULE**: Preserve existing function signatures and return types
- **RULE**: Don't modify imports unless the specific function you're adding requires them

### `/interface/lib/routes/` - API Routes
- **RULE**: Don't change route endpoints or request/response structures
- **RULE**: Maintain error response formats
- **RULE**: Preserve middleware chain order

### `/interface/lib/agents/` - Agent Logic
- **RULE**: Don't modify agent decision-making logic unless specifically requested
- **RULE**: Preserve prompt structures and agent communication patterns
- **RULE**: Maintain tool selection logic integrity

### `/interface/lib/services/` - Core Services  
- **RULE**: These are foundational - extreme caution required
- **RULE**: Any change here requires explicit user approval
- **RULE**: Test thoroughly before implementing


### `/interface/lib/tools/` - Core Services  
- **RULE**: These are foundational - extreme caution required
- **RULE**: Any change here requires explicit user approval
- **RULE**: Test thoroughly before implementing

---

## 🚫 PROHIBITED ACTIONS

### NEVER DO THESE:
- ❌ Delete functions without explicit permission
- ❌ Rename existing functions or variables
- ❌ Change function signatures (parameters, return types)
- ❌ Modify unrelated code while fixing an issue
- ❌ Add new dependencies without justification
- ❌ Refactor working code "for improvement"
- ❌ Change file structure or move files
- ❌ Modify configuration files unless specifically requested
- ❌ Change existing error handling patterns
- ❌ Alter existing API contracts

### REQUIRE EXPLICIT PERMISSION:
- 🔒 Modifying core service files
- 🔒 Changing database schemas or models
- 🔒 Modifying orchestration logic
- 🔒 Changing agent prompt structures
- 🔒 Altering tool selection algorithms
- 🔒 Modifying route handlers significantly

---

## 🔧 IMPLEMENTATION METHODOLOGY

### Phase 1: Investigation & Planning
1. **Read the current implementation** completely
2. **Trace the data flow** from input to output  
3. **Identify the exact location** where change is needed
4. **Plan the minimal change** required
5. **Identify test scenarios** to verify the fix

### Phase 2: Surgical Implementation
1. **Make only the targeted change**
2. **Use search-replace for exact matches** when possible
3. **Add new functions** rather than modifying existing ones when feasible
4. **Comment your changes** with clear explanations
5. **Preserve all existing comments and documentation**

### Phase 3: Validation
1. **Check for linting errors** introduced by changes
2. **Verify imports and exports** are correct
3. **Ensure no unintended side effects** in related code
4. **Test the specific functionality** that was changed

---

## 🔄 ERROR HANDLING METHODOLOGY

### When Fixing Issues:
1. **Isolate the problem** - don't fix multiple issues simultaneously
2. **Understand the root cause** - don't apply band-aid solutions
3. **Fix only the broken part** - leave working code untouched
4. **Verify the fix doesn't break anything else**
5. **Document why the original code wasn't working**

### Multi-Issue Scenarios:
- **Address issues one at a time**
- **Test each fix independently**  
- **Don't cascade changes across multiple files**
- **Ask for user prioritization** if multiple issues exist

---

## 📚 REFERENCE QUICK GUIDE

### Before Every Change:
1. **ANALYZE** → Understand current code completely
2. **PLAN** → Design minimal, targeted change
3. **IMPLEMENT** → Make surgical modifications only
4. **VERIFY** → Test and validate the fix
5. **DOCUMENT** → Record what was changed and why

### Remember:
- **Working code is sacred** - don't touch what works
- **Minimal changes win** - less is more
- **Test everything** - assume nothing
- **When in doubt, ask** - clarification is better than assumption

---

## 💡 CURSOR REMINDER SYSTEM

### **COPY AND PASTE THIS REMINDER FOR EVERY DEVELOPMENT REQUEST:**

```
🚨 DEVELOPMENT RULES CHECKPOINT 🚨

Before making ANY changes, I must:
✅ Read CURSOR_DEVELOPMENT_RULES.md
✅ Complete mandatory analysis checklist  
✅ Identify exact scope of change needed
✅ Ensure minimal change principle
✅ Preserve all existing functionality
✅ Plan validation approach

GOLDEN RULES:
• Analysis first, code second
• Minimal changes only  
• Preserve existing functionality
• When in doubt, ask first

Remember: Working code is SACRED!
The AI Page Builder system is complex with:
- Action Pipeline (Create/Edit/Delete)
- Tool Handlers (textEdit, componentEdit, styleUpdate, etc.)
- Agent orchestration system
- Multiple route handlers
- Service integrations

ANY unnecessary change risks breaking the entire system!
```

---

## 🎯 SYSTEM-SPECIFIC REMINDERS

### AI Page Builder Architecture:
- **Prompt Action Pipeline**: Create → Edit → Delete flow
- **Agent Decision System**: Mistral Codestral 25.01 for tool selection
- **Tool Handlers**: textEditHandler, styleUpdateHandler, componentEditHandler, etc.
- **Orchestration**: tool-selector.ts, orchestrator.ts, sequential-executor.ts
- **Error Recovery**: Self-correction mechanisms implemented
- **File Structure**: Interface app + Rendering app separation

### Critical Integration Points:
- **Route Handlers**: `/app/api/edit/route.ts`, `/app/api/create/route.ts`
- **Agent Communication**: Structured JSON responses required
- **Error Handling**: Return component content for self-correction
- **File Operations**: Multiple approaches (fs.promises vs direct imports)

---

> **FINAL REMINDER**: These rules exist to maintain system integrity and prevent regression. Every violation risks breaking a complex, working system that handles AI agent orchestration, file operations, and component lifecycle management. Follow them religiously.

**Last Updated**: $(date)
**Version**: 1.0
**System**: AI Page Builder - Beta V2 