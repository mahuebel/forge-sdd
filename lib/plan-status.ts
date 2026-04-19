export function markTaskComplete(planMd: string, taskId: string, commitSha: string): string {
  const lines = planMd.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    out.push(line);
    const m = line.match(/^(\s+)- id:\s*(\S+)/);
    if (m && m[2] === taskId) {
      const indent = m[1] + "  ";
      // Consume the task body
      i++;
      const body: string[] = [];
      while (i < lines.length) {
        const next = lines[i];
        const nextMatch = next.match(/^(\s+)- id:/);
        const isLessIndented = next.length > 0 && !next.startsWith(indent) && next.trim() !== "";
        if (nextMatch || isLessIndented) break;
        // Skip any prior status/commit lines (idempotency)
        if (!next.match(new RegExp(`^${indent}(status|commit):`))) {
          body.push(next);
        }
        i++;
      }
      // Trim trailing blank lines from body so we insert cleanly
      while (body.length > 0 && body[body.length - 1].trim() === "") body.pop();
      out.push(...body);
      out.push(`${indent}status: complete`);
      out.push(`${indent}commit: ${commitSha}`);
      out.push("");
      continue;
    }
    i++;
  }
  return out.join("\n");
}
