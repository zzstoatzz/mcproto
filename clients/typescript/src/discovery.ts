import { readFile } from "fs/promises";
import { glob } from "glob";
import * as ts from "typescript";

interface MCPServer {
  file: string;
  name: string;
  description?: string;
}

export async function findMCPServers(dir: string): Promise<MCPServer[]> {
  const servers: MCPServer[] = [];
  const files = await glob("**/*.{ts,js}", { cwd: dir, ignore: ["node_modules/**"] });

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const sourceFile = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    // Look for FastMCP instantiations
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach((declaration) => {
          if (
            ts.isVariableDeclaration(declaration) &&
            declaration.initializer &&
            ts.isNewExpression(declaration.initializer) &&
            ts.isIdentifier(declaration.initializer.expression) &&
            declaration.initializer.expression.text === "FastMCP"
          ) {
            const name = declaration.initializer.arguments[0]?.getText();
            if (name) {
              servers.push({
                file,
                name: name.replace(/['"]/g, ""),
                // Try to find a description in nearby comments
                description: findNearbyDescription(node),
              });
            }
          }
        });
      }
    });
  }

  return servers;
}

function findNearbyDescription(node: ts.Node): string | undefined {
  let description: string | undefined;

  // Check for JSDoc comments
  const jsDoc = ts.getJSDocTags(node);
  if (jsDoc.length > 0) {
    const descriptionTag = jsDoc.find((tag) => tag.tagName.text === "description");
    if (descriptionTag && descriptionTag.comment) {
      description = typeof descriptionTag.comment === "string"
        ? descriptionTag.comment
        : descriptionTag.comment.map(part => part.text).join("");
    }
  }

  // Check for regular comments
  if (!description && node.getFullText) {
    const fullText = node.getFullText();
    const commentMatch = fullText.match(/\/\*\*([\s\S]*?)\*\//);
    if (commentMatch) {
      description = commentMatch[1]
        .replace(/^\s*\*\s?/gm, "")
        .trim();
    }
  }

  return description;
} 