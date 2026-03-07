# Claude Code - Performance Manual

> Condensed from the Industrial-Grade Master Protocol. Key patterns only.

---

## 1. Memory Setup

### Global Memory (`~/.claude/CLAUDE.md`)
Rules that apply to ALL your projects:
```markdown
# Global Standards
- Always use TypeScript strict mode
- Never commit .env files
- Run tests before marking feature complete
- Use async/await, never raw callbacks
```

### Project Memory (`./CLAUDE.md`)
Project-specific context (auto-loaded each session):
```markdown
# Project Name
- Stack: Next.js, Medusa, Neon
- Commands: npm run dev, npm test
- Patterns: Prices in cents, await params
```

---

## 2. Session Workflow

### Start of Session
```
"Start Session.
1. Read CLAUDE.md and Summary.md
2. What's the current state of the project?
3. What feature should we work on next?"
```

### End of Session
```
"Session complete.
1. Update any documentation if needed
2. What's left to do?
3. Create a summary for next session"
```

---

## 3. The Plan-First Pattern

For complex features, ALWAYS plan before coding:

### Step 1: Architecture Interview
```
"We're building [feature].
Interview me with 5 hard questions about:
1. Data model changes needed
2. API endpoints required
3. Edge cases and error handling
4. Security considerations
5. Integration with existing code
Do not plan yet. Just ask."
```

### Step 2: Blueprint Generation
```
"Based on my answers, create a plan:
1. Files to create/modify
2. Database changes (if any)
3. Step-by-step implementation order
4. Testing approach"
```

### Step 3: Execute with Checkpoints
```
"Implement step 1 of the plan. Stop after completion for verification."
```

---

## 4. The Decision Tree

When coding any feature, think:

| Question | If YES | If NO |
|----------|--------|-------|
| Takes >1 second? | Background job (queue) | Inline code |
| Changes DB schema? | Migration first | Direct code |
| Needs auth? | Verify token first | Public route |
| Repeats logic? | Extract to shared util | Keep inline |
| Complex feature? | Plan mode first | Just do it |

---

## 5. Effective Prompting

### Be Specific
```
BAD:  "Add payments"
GOOD: "Add Stripe checkout. Create /api/checkout endpoint that creates
       a PaymentIntent. Frontend button in CartDrawer. Handle webhook
       for payment_intent.succeeded"
```

### Provide Context
```
BAD:  "Fix the bug"
GOOD: "Fix the bug in CheckoutForm.js:45 where shipping price shows
       NaN when country is Kosovo. The issue is getShippingRate returns
       undefined for XK country code"
```

### Chunk Large Tasks
```
BAD:  "Build the entire admin dashboard"
GOOD: "Build admin dashboard - Phase 1:
       1. Layout with sidebar navigation
       2. Orders list page with filters
       Stop after Phase 1 for review"
```

---

## 6. Parallel Workflows

For full-stack features, work in engines:

### Engine 1: Backend First
```
"Build the Reporting module - BACKEND ONLY:
1. Create /api/reports endpoint
2. Add background job for PDF generation
3. Secure with auth middleware
Do not touch frontend yet."
```

### Engine 2: Frontend After
```
"Switch to Frontend for Reporting:
1. Read the API endpoint I just created
2. Build UI with loading states
3. Handle error cases"
```

---

## 7. Verification Prompts

### After Implementation
```
"Verify the feature:
1. Does it handle the happy path?
2. What happens with invalid input?
3. Is it secured properly?
4. Are there any edge cases missed?"
```

### Before PR/Commit
```
"Pre-commit check:
1. Run tests - do they pass?
2. Any console.logs to remove?
3. Are error messages user-friendly?
4. Documentation needed?"
```

---

## 8. Recovery Patterns

### When Stuck
```
"I'm stuck on [problem].
1. What are the possible causes?
2. How can we debug this?
3. Show me the relevant code paths"
```

### When Context is Lost
```
"Context recovery:
1. Read CLAUDE.md and Summary.md
2. Check recent git commits
3. What were we working on?"
```

### When Things Break
```
"Something broke after [change].
1. What files did we modify?
2. Show me the git diff
3. What's the safest rollback?"
```

---

## 9. Feature Tracking

Keep a simple tracker (in CLAUDE.md or features.json):

```markdown
## Current Sprint
- [x] Phone verification
- [x] COD payment
- [ ] Stripe integration (in progress)
- [ ] Order history page
- [ ] SMS tracking
```

Update status as you work - helps maintain context across sessions.

---

## 10. Key Commands

| Command | Purpose |
|---------|---------|
| `/plan` | Enter plan mode for complex features |
| `/compact` | Compress context when running low |
| `/clear` | Start fresh (loses context) |
| `/cost` | Check token usage |
| `/help` | See all commands |

### `/clear` vs New Session

| `/clear`                          | New session                    |
|-----------------------------------|--------------------------------|
| Instant, stays in same terminal   | Need to restart, navigate back |
| Keeps current directory           | Need to `cd` again             |
| Good for quick context reset      | Clean slate, fresh process     |

Use `/clear` when you just want to free up context mid-work. New session when you're done for the day or switching projects.

---

## Quick Reference

```
Complex feature? → Plan first → Chunk into steps → Verify each step
Simple fix?     → Just do it → Test → Done
Stuck?          → Ask for debug help → Check assumptions
Lost context?   → Read docs → Check git → Resume
```
