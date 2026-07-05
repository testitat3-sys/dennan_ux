<!-- convex-ai-start -->

## Environment Constraints
- Operating System: Windows
- Primary Shell: PowerShell (or cmd, specify whichever you use)
- File Paths: Always use Windows backslash syntax (`C:\path\to\file`)
- File Operations: Do not use Unix utilities like `cat`, `grep`, `sed`, or `<< 'EOF'`. Use PowerShell native cmdlets like `Out-File`, `Add-Content`, or `Get-Content`.

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
