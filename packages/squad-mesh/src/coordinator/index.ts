/**
 * Coordinator Prompt Extension — Multi-Squad Awareness
 *
 * Generates prompt fragments that can be injected into the Squad coordinator's
 * system prompt to give it cross-squad awareness: what squads exist, their
 * status, open tensions, and active directives.
 *
 * @module coordinator
 */

import type {
  CommonOperationalPicture,
  SquadIdentity,
  Directive,
  CrossSquadTension,
  MetaSquadConfig,
} from '../types.js';

// ============================================================================
// Prompt Generation
// ============================================================================

/**
 * Generate the meta-squad awareness section for the coordinator system prompt.
 *
 * This is injected into the coordinator's context so it can make
 * cross-squad-aware decisions.
 */
export function generateMetaSquadPrompt(
  config: MetaSquadConfig,
  cop: CommonOperationalPicture,
): string {
  const sections: string[] = [];

  // Header
  sections.push(`<meta_squad_context>`);
  sections.push(`You are operating within the "${config.name}" meta-squad.`);
  sections.push(`Purpose: ${config.purpose}`);
  if (config.leader) {
    sections.push(`Meta-squad leader: ${config.leader}`);
  }
  sections.push('');

  // Squad registry
  sections.push(`<registered_squads>`);
  sections.push(`Total squads: ${cop.summary.totalSquads}`);
  sections.push(`System health: ${cop.systemHealth}`);
  sections.push('');
  for (const status of cop.squads) {
    sections.push(`- **${status.squad}** [${status.health}]`);
    if (status.currentWork.length > 0) {
      sections.push(`  Current: ${status.currentWork.map(w => w.title).join(', ')}`);
    }
    if (status.blockers.length > 0) {
      sections.push(`  ⚠️ Blockers: ${status.blockers.map(b => b.description).join(', ')}`);
    }
  }
  sections.push(`</registered_squads>`);
  sections.push('');

  // Active tensions
  if (cop.activeTensions.length > 0) {
    sections.push(`<active_tensions>`);
    for (const tension of cop.activeTensions) {
      sections.push(
        `- [${tension.type}] ${tension.summary} (raised by: ${tension.raisedBy}, affects: ${tension.affects.join(', ')})`
      );
    }
    sections.push(`</active_tensions>`);
    sections.push('');
  }

  // Open directives
  if (cop.openDirectives.length > 0) {
    sections.push(`<open_directives>`);
    for (const directive of cop.openDirectives) {
      const targets = Array.isArray(directive.target) ? directive.target.join(', ') : directive.target;
      sections.push(
        `- [${directive.priority}] ${directive.title} → ${targets} (status: ${directive.status})`
      );
    }
    sections.push(`</open_directives>`);
    sections.push('');
  }

  // Steering rules
  if (config.steering) {
    sections.push(`<steering_rules>`);
    sections.push(`Directive authority: ${config.steering.directiveAuthority}`);
    if (config.steering.allowRejection !== undefined) {
      sections.push(`Squads can reject directives: ${config.steering.allowRejection}`);
    }
    if (config.steering.autoEscalateAfter) {
      sections.push(`Auto-escalate tensions after: ${config.steering.autoEscalateAfter}`);
    }
    sections.push(`</steering_rules>`);
    sections.push('');
  }

  sections.push(`</meta_squad_context>`);

  return sections.join('\n');
}

/**
 * Generate a compact status summary suitable for brief context injection.
 */
export function generateCompactStatus(cop: CommonOperationalPicture): string {
  const lines: string[] = [
    `Meta-squad: ${cop.summary.totalSquads} squads, health=${cop.systemHealth}`,
  ];

  if (cop.summary.blockedSquads > 0) {
    lines.push(`⚠️ ${cop.summary.blockedSquads} squad(s) blocked`);
  }
  if (cop.summary.openTensions > 0) {
    lines.push(`🔀 ${cop.summary.openTensions} open tension(s)`);
  }
  if (cop.summary.openDirectives > 0) {
    lines.push(`📋 ${cop.summary.openDirectives} open directive(s)`);
  }

  return lines.join(' | ');
}

/**
 * Generate cross-squad tension detection rules for the coordinator.
 */
export function generateTensionDetectionRules(squads: SquadIdentity[]): string {
  const lines: string[] = [
    '<tension_detection>',
    'When processing work, detect these cross-squad tensions:',
    '',
    '1. **Domain conflict**: If the requested work touches files/areas owned by another squad',
    '2. **Dependency blocked**: If the work requires output from another squad that is not ready',
    '3. **Integration gap**: If no squad owns the integration point between components',
    '4. **Knowledge gap**: If another squad has solved a similar problem',
    '',
    'Known squad domains:',
  ];

  for (const squad of squads) {
    if (squad.domains && squad.domains.length > 0) {
      lines.push(`- ${squad.name}: ${squad.domains.join(', ')}`);
    } else {
      lines.push(`- ${squad.name}: ${squad.purpose}`);
    }
  }

  lines.push('');
  lines.push('When a tension is detected, raise it using the tension routing system.');
  lines.push('</tension_detection>');

  return lines.join('\n');
}

/**
 * Generate directive compliance checking rules for the coordinator.
 */
export function generateDirectiveComplianceRules(directives: Directive[]): string {
  const activeDirectives = directives.filter(d =>
    d.status !== 'completed' && d.status !== 'withdrawn'
  );

  if (activeDirectives.length === 0) return '';

  const lines: string[] = [
    '<directive_compliance>',
    'Active directives that must be considered during work:',
    '',
  ];

  for (const d of activeDirectives) {
    const targets = Array.isArray(d.target) ? d.target.join(', ') : d.target;
    lines.push(`## ${d.title} [${d.priority}]`);
    lines.push(`Target: ${targets}`);
    lines.push(`Description: ${d.description}`);
    if (d.acceptanceCriteria && d.acceptanceCriteria.length > 0) {
      lines.push('Acceptance criteria:');
      for (const criterion of d.acceptanceCriteria) {
        lines.push(`- [ ] ${criterion}`);
      }
    }
    lines.push('');
  }

  lines.push('</directive_compliance>');
  return lines.join('\n');
}
