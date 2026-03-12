/**
 * Generates the mesh-wisdom skill template for installation into squad projects.
 *
 * @module bridge/wisdom-skill
 */

export function generateWisdomSkill(meshName: string, meshRoot?: string, meshUrl?: string): string {
  const meshLabel = meshName ? `"${meshName}"` : 'your';
  const contactSection = buildContactSection(meshRoot, meshUrl);

  return `# Mesh Wisdom — Cross-Squad Knowledge Access

> This skill was auto-installed by squad-mesh when this squad joined the ${meshLabel} mesh.

## What This Enables

You are part of a multi-squad mesh. Other squads in this mesh share learnings,
patterns, and operational knowledge that may be relevant to your work.

## How to Access Shared Knowledge

### CLI (recommended — works with global install)
\`\`\`bash
# Collect and propagate learnings across the mesh
squad-mesh yokoten

# View mesh status
squad-mesh status

# View cross-squad health
squad-mesh health
\`\`\`

### Programmatic (TypeScript — requires local install)
\`\`\`ts
import { readMeshLink, getMeshLearnings, getMeshPatterns } from 'squad-mesh';

const link = readMeshLink();
if (link) {
  const learnings = getMeshLearnings(link);
  const patterns = getMeshPatterns(link);
}
\`\`\`

## How to Contribute Knowledge Back

When you discover something valuable that other squads should know:

1. Document it in your squad's \`.squad/decisions.md\` with a "cross-squad" tag
2. Or create a skill in \`.squad/skills/\` with universal applicability
3. Run \`squad-mesh yokoten\` from the mesh root to propagate

${contactSection}## Mesh Connection

This squad's mesh link is stored in \`.squad/mesh-link.json\`.
It points back to the mesh root where shared knowledge lives.
`;
}

function buildContactSection(meshRoot?: string, meshUrl?: string): string {
  if (!meshRoot && !meshUrl) return '';

  const lines: string[] = ['## How to Contact the Mesh', ''];
  if (meshRoot) {
    lines.push(`- **Local path:** \`${meshRoot}\``);
  }
  if (meshUrl) {
    lines.push(`- **Remote URL:** ${meshUrl}`);
  }
  lines.push('', 'The mesh root contains `.meta-squad/` with the registry, shared learnings, and patterns.', '', '');
  return lines.join('\n');
}
