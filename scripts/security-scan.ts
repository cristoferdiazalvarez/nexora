import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execFileSync("git", ["ls-files", "--cached", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
if (!files.length)
  throw new Error(
    "No hay archivos preparados para publicación. Revisa el índice Git antes de escanear.",
  );
const violations: string[] = [];
for (const file of files) {
  if (
    /(^|\/)(\.env(?:\..*)?|\.local|node_modules|test-results|playwright-report)(\/|$)/.test(
      file,
    ) &&
    !file.endsWith(".env.example")
  )
    violations.push(file + ": archivo privado o generado");
  const content = readFileSync(file);
  if (content.includes(0)) continue;
  const text = content.toString("utf8");
  if (
    /gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(
      text,
    )
  )
    violations.push(file + ": posible secreto");
  for (const match of text.matchAll(/mongodb(?:\+srv)?:\/\/[^\s'"`<>]+/g)) {
    try {
      const url = new URL(match[0]);
      if (url.password && !url.hostname.endsWith(".example"))
        violations.push(file + ": URI MongoDB con contraseña");
    } catch {
      /* Validation fixtures can contain deliberately invalid URLs. */
    }
  }
}
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log(
  `Publicación revisada: ${files.length} archivos; no se detectaron secretos con las reglas del escáner.`,
);
