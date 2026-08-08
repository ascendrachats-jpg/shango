import ts from "typescript"
import type { ValidationDiagnostic } from "./types.ts"

export interface WorkspaceFile {
  path: string
  content: string
  language?: string
}

export interface ValidationResult {
  valid: boolean
  diagnostics: ValidationDiagnostic[]
}

const SUPPORTED_PACKAGES = new Set([
  "react",
  "react-dom",
  "react-dom/client",
  "lucide-react",
  "clsx",
  "tailwind-merge",
  "@tailwindcss/vite",
  "react-router-dom",
])

function normalizeImportPath(basePath: string, relativePath: string): string {
  const baseParts = basePath.split("/").slice(0, -1)
  const relParts = relativePath.split("/")

  for (const part of relParts) {
    if (part === "." || part === "") continue
    if (part === "..") {
      baseParts.pop()
    } else {
      baseParts.push(part)
    }
  }

  return baseParts.join("/")
}

function checkSyntaxWithCompiler(file: WorkspaceFile): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = []
  const ext = file.path.split(".").pop()?.toLowerCase() ?? ""

  if (ext === "tsx" || ext === "jsx" || ext === "ts" || ext === "js") {
    const scriptKind =
      ext === "tsx"
        ? ts.ScriptKind.TSX
        : ext === "jsx"
          ? ts.ScriptKind.JSX
          : ext === "ts"
            ? ts.ScriptKind.TS
            : ts.ScriptKind.JS

    const output = ts.transpileModule(file.content, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        noEmit: true,
      },
      fileName: file.path,
      reportDiagnostics: true,
    })

    if (output.diagnostics) {
      const sourceFile = ts.createSourceFile(
        file.path,
        file.content,
        ts.ScriptTarget.ESNext,
        true,
        scriptKind,
      )

      for (const diag of output.diagnostics) {
        if (diag.category === ts.DiagnosticCategory.Error) {
          const messageText =
            typeof diag.messageText === "string"
              ? diag.messageText
              : diag.messageText.messageText

          let line: number | undefined
          let column: number | undefined

          if (diag.start !== undefined && sourceFile) {
            const pos = sourceFile.getLineAndCharacterOfPosition(diag.start)
            line = pos.line + 1
            column = pos.character + 1
          }

          diagnostics.push({
            severity: "error",
            file: file.path,
            line,
            column,
            code: "SYNTAX_ERROR",
            message: `TypeScript Syntax Error [TS${diag.code}]: ${messageText}`,
            source: "workspace-validator",
          })
        }
      }
    }
  }

  return diagnostics
}

function checkImportsWithAST(
  file: WorkspaceFile,
  allFiles: WorkspaceFile[],
): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = []
  const ext = file.path.split(".").pop()?.toLowerCase() ?? ""

  if (ext !== "tsx" && ext !== "jsx" && ext !== "ts" && ext !== "js") {
    return diagnostics
  }

  const scriptKind =
    ext === "tsx"
      ? ts.ScriptKind.TSX
      : ext === "jsx"
        ? ts.ScriptKind.JSX
        : ext === "ts"
          ? ts.ScriptKind.TS
          : ts.ScriptKind.JS

  let sourceFile: ts.SourceFile
  try {
    sourceFile = ts.createSourceFile(
      file.path,
      file.content,
      ts.ScriptTarget.ESNext,
      true,
      scriptKind,
    )
  } catch {
    return diagnostics
  }

  const existingPaths = new Set(allFiles.map((f) => f.path.replace(/\\/g, "/")))

  function visit(node: ts.Node) {
    let importPath: string | undefined

    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      importPath = node.moduleSpecifier.text
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      importPath = (node.arguments[0] as ts.StringLiteral).text
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require" &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      importPath = (node.arguments[0] as ts.StringLiteral).text
    }

    if (importPath) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
      const line = pos.line + 1
      const column = pos.character + 1

      if (importPath.startsWith(".")) {
        const resolvedBase = normalizeImportPath(file.path, importPath)
        const possibleExtensions = [
          "",
          ".tsx",
          ".ts",
          ".jsx",
          ".js",
          "/index.tsx",
          "/index.ts",
          "/index.jsx",
          "/index.js",
        ]
        let found = false
        for (const extCandidate of possibleExtensions) {
          if (existingPaths.has(resolvedBase + extCandidate)) {
            found = true
            break
          }
        }
        if (!found) {
          diagnostics.push({
            severity: "error",
            file: file.path,
            line,
            column,
            code: "MODULE_NOT_FOUND",
            message: `Cannot resolve local import '${importPath}' from '${file.path}'`,
            source: "workspace-validator",
          })
        }
      } else if (!importPath.startsWith("/") && !importPath.startsWith("http")) {
        const pkgName = importPath.startsWith("@")
          ? importPath.split("/").slice(0, 2).join("/")
          : importPath.split("/")[0]

        if (!SUPPORTED_PACKAGES.has(pkgName) && !SUPPORTED_PACKAGES.has(importPath)) {
          diagnostics.push({
            severity: "error",
            file: file.path,
            line,
            column,
            code: "UNSUPPORTED_DEPENDENCY",
            message: `Package '${importPath}' is not supported by the preview sandbox environment. Use standard React, Lucide icons, or local components instead.`,
            source: "workspace-validator",
          })
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return diagnostics
}

export function validateWorkspace(files: WorkspaceFile[]): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = []

  if (!files || files.length === 0) {
    return {
      valid: false,
      diagnostics: [
        {
          severity: "error",
          file: "workspace",
          code: "MISSING_ENTRY_POINT",
          message: "Workspace contains no generated files.",
          source: "workspace-validator",
        },
      ],
    }
  }

  const normalizedFiles = files.map((f) => ({
    ...f,
    path: f.path.replace(/\\/g, "/"),
  }))

  const hasAppOrIndex = normalizedFiles.some(
    (f) =>
      f.path === "src/App.tsx" ||
      f.path === "src/App.jsx" ||
      f.path === "index.html" ||
      f.path === "src/main.tsx",
  )

  if (!hasAppOrIndex) {
    diagnostics.push({
      severity: "error",
      file: "workspace",
      code: "MISSING_ENTRY_POINT",
      message:
        "Workspace is missing a standard entry point file (src/App.tsx or index.html).",
      source: "workspace-validator",
    })
  }

  for (const file of normalizedFiles) {
    diagnostics.push(...checkSyntaxWithCompiler(file))
    diagnostics.push(...checkImportsWithAST(file, normalizedFiles))
  }

  const hasErrors = diagnostics.some((d) => d.severity === "error")

  return {
    valid: !hasErrors,
    diagnostics,
  }
}
