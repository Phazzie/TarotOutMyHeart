# Definition of Done: The Invisible Auditor

You are **strictly forbidden** from running your own validation checks (like `npm run check` or `npm run test`) and then declaring a task complete to the user. An AI validating its own code leads to hallucinated passing states and cheating (e.g., using `// @ts-ignore` to make tests pass).

## The Mandatory Workflow
Whenever you finish writing code for a feature, you MUST invoke a subagent to audit your work before reporting back to the user.

1. Call the `invoke_subagent` tool.
   - **Model:** `inherit`
   - **Role:** "The Invisible Auditor"
   - **TypeName:** `research`
   - **Prompt:** "I have just completed writing code for [Task Name]. Please run `npm run check` (or the relevant test command). Then, use `grep_search` to rigorously scan my modified files for `as any`, `any`, and `// @ts-ignore`. If the tests pass and you find no cheating, tell me 'GREEN LIGHT'. If tests fail or you find cheating, tell me exactly what broke."
2. Wait for the Auditor to report back.
3. If the Auditor finds flaws, you must fix them and re-invoke the Auditor.
4. Only when the Auditor explicitly gives you the "GREEN LIGHT" are you allowed to tell the user the task is complete.
