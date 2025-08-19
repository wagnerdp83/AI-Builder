import { ComponentIR } from '../../types/ir';

export interface IRScore {
  score: number; // 0..1
  missing: string[];
}

const requiredFields: Array<keyof ComponentIR> = ['version', 'componentName', 'semanticTag'];

export function scoreIR(ir: ComponentIR, _userRequest: string): IRScore {
  const missing: string[] = [];
  for (const f of requiredFields) {
    // @ts-expect-error - index access for presence
    if (!ir[f]) missing.push(String(f));
  }
  // Encourage structured content
  if (!ir.constants || ir.constants.length === 0) missing.push('constants');
  if (!ir.content) missing.push('content');
  // Placeholders support
  if (!ir.placeholders || ir.placeholders.length === 0) missing.push('placeholders');
  // Icons optional but encouraged
  if (!ir.lucideIcons || ir.lucideIcons.length === 0) missing.push('lucideIcons');

  const totalChecks = 6;
  const passed = totalChecks - missing.length;
  const score = Math.max(0, Math.min(1, passed / totalChecks));
  return { score, missing };
}

