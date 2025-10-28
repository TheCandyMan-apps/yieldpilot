/**
 * AI Copilot Prompt Templates
 * Structured, deterministic prompts with strict output formats
 */

export interface DealContext {
  address: string;
  price: number;
  bedrooms?: number;
  property_type?: string;
  kpis?: {
    net_yield_pct?: number;
    roi_pct?: number;
    cash_flow_monthly?: number;
    dscr?: number;
    working?: any;
  };
  assumptions?: any;
  enrichment?: any;
  score?: number;
  drivers?: string[];
  risks?: string[];
}

/**
 * System prompt for deal analysis copilot
 */
export const DEAL_COPILOT_SYSTEM_PROMPT = `You are an AI underwriting assistant for UK property investment analysis. You help investors understand deals and make data-driven decisions.

CRITICAL RULES:
1. Base all answers on the provided deal context data - never hallucinate numbers
2. If data is missing, explicitly state "data not available" rather than guessing
3. Use UK terminology (yield not cap rate, flats not apartments, EPC not energy rating)
4. All currency in GBP (£), all yields/returns in %, all distances in miles
5. Be concise and actionable - investors want clear recommendations
6. When suggesting changes, provide specific numbers and expected outcomes
7. Always consider UK landlord regulations (EPC, HMO licensing, etc.)

FORMAT:
- Use bullet points for lists
- Use tables for before/after comparisons
- Bold key numbers
- Keep responses under 300 words unless asked for detail

TONE:
- Professional but approachable
- Data-driven and objective
- Cautiously optimistic - highlight both opportunities and risks`;

/**
 * Generate deal summary prompt
 */
export function getDealSummaryPrompt(context: DealContext): string {
  return `Provide a concise investment summary for this property:

**Property Details:**
- Address: ${context.address}
- Price: £${context.price.toLocaleString()}
- Type: ${context.property_type || 'Unknown'}
- Bedrooms: ${context.bedrooms || 'Unknown'}

**Key Metrics:**
- Net Yield: ${context.kpis?.net_yield_pct?.toFixed(2)}%
- ROI: ${context.kpis?.roi_pct?.toFixed(2)}%
- Monthly Cashflow: £${context.kpis?.cash_flow_monthly?.toLocaleString() || 'N/A'}
- DSCR: ${context.kpis?.dscr?.toFixed(2) || 'N/A'}
- Investment Score: ${context.score || 'Not scored'}/100

**Strengths:** ${context.drivers?.join(', ') || 'None identified'}
**Risks:** ${context.risks?.join(', ') || 'None identified'}

Provide:
1. One-sentence verdict (Strong Buy / Consider / Pass / Avoid)
2. Top 3 strengths
3. Top 3 concerns
4. Key action item`;
}

/**
 * Generate optimization prompt
 */
export function getOptimizationPrompt(
  context: DealContext,
  target: string
): string {
  const current = context.kpis?.working;
  
  return `The investor wants to optimize this deal to: "${target}"

**Current Position:**
- Price: £${context.price.toLocaleString()}
- Deposit: ${context.assumptions?.deposit_pct || 25}%
- Interest Rate: ${context.assumptions?.apr || 5.5}%
- Term: ${context.assumptions?.term_years || 25} years
- Interest Only: ${context.assumptions?.interest_only ? 'Yes' : 'No'}
- Monthly Rent: £${current?.monthly_rental_income?.toLocaleString() || 'Unknown'}
- Monthly Mortgage: £${current?.monthly_mortgage?.toLocaleString() || 'Unknown'}
- Operating Costs: ${context.assumptions?.maintenance_pct || 0}% + ${context.assumptions?.management_pct || 0}% + ${context.assumptions?.voids_pct || 0}% voids

**Current Metrics:**
- Net Yield: ${context.kpis?.net_yield_pct?.toFixed(2)}%
- DSCR: ${context.kpis?.dscr?.toFixed(2) || 'N/A'}
- Cashflow: £${context.kpis?.cash_flow_monthly?.toLocaleString()}/month

Provide 2-3 actionable levers to achieve the target. For each:
1. Specific change (e.g., "Increase deposit to 35%")
2. Expected impact on target metric
3. Trade-offs or considerations
4. Feasibility (Easy / Moderate / Difficult)`;
}

/**
 * Generate compliance action plan prompt
 */
export function getCompliancePrompt(
  context: DealContext,
  complianceIssues: Array<{ check_type: string; status: string; message: string; action_required?: string }>
): string {
  const issues = complianceIssues
    .filter(c => c.status !== 'pass')
    .map(c => `- ${c.check_type}: ${c.message}${c.action_required ? ` → ${c.action_required}` : ''}`)
    .join('\n');

  return `Create a landlord compliance action plan for this property:

**Property:** ${context.address}
**Type:** ${context.property_type || 'Unknown'}

**Compliance Issues:**
${issues || '- No major issues identified'}

**Property Context:**
- EPC Rating: ${context.enrichment?.epc_current || 'Unknown'}
- Bedrooms: ${context.bedrooms || 'Unknown'}
- Flood Risk: ${context.enrichment?.flood_risk || 0}/10

Provide:
1. Prioritized action list (Critical → High → Medium)
2. Estimated costs for each action
3. Timeline recommendations
4. Impact on deal viability if costs are significant`;
}

/**
 * Generate exit strategy prompt
 */
export function getExitStrategyPrompt(context: DealContext): string {
  return `Propose 3 exit strategies for this investment property:

**Property:** ${context.address} - £${context.price.toLocaleString()}
**Current Yield:** ${context.kpis?.net_yield_pct?.toFixed(2)}%
**Current Cashflow:** £${context.kpis?.cash_flow_monthly?.toLocaleString()}/month

For each strategy (Hold Long-term / BRRR / Flip / Other):
1. Strategy name and timeline
2. Expected returns (IRR, multiple on invested capital)
3. Key value drivers
4. Risk factors
5. Capital requirements
6. Best/worst case scenarios

Consider UK market factors: CGT implications, BTL lending restrictions, Section 24 tax treatment.`;
}

/**
 * Generate bulk deal comparison prompt
 */
export function getBulkComparisonPrompt(deals: DealContext[]): string {
  const dealsSummary = deals.map((d, i) => 
    `${i + 1}. ${d.address} - £${d.price.toLocaleString()} - Yield: ${d.kpis?.net_yield_pct?.toFixed(1)}% - Score: ${d.score || 'N/A'}`
  ).join('\n');

  return `Compare these ${deals.length} investment opportunities and recommend the best 3-5:

${dealsSummary}

Provide:
1. **Top Picks:** Rank the best 3-5 deals with brief rationale
2. **Comparison Table:** Key metrics side-by-side for top picks
3. **Portfolio Strategy:** How these deals could work together (diversification, concentration, etc.)
4. **What to investigate:** Due diligence priorities for shortlisted deals

Focus on: yield quality, risk-adjusted returns, market position, and portfolio fit.`;
}

/**
 * Parse copilot response for structured actions
 */
export interface CopilotAction {
  type: 'update_assumptions' | 'run_scenario' | 'add_capex' | 'view_compliance' | 'export_report';
  label: string;
  data?: any;
}

/**
 * Extract actionable items from copilot response
 */
export function extractActions(response: string, context: DealContext): CopilotAction[] {
  const actions: CopilotAction[] = [];

  // Look for assumption change suggestions
  if (response.toLowerCase().includes('deposit') && response.match(/\d+%/)) {
    actions.push({
      type: 'update_assumptions',
      label: 'Apply suggested deposit change',
      data: { field: 'deposit_pct' }
    });
  }

  if (response.toLowerCase().includes('interest rate') || response.toLowerCase().includes('apr')) {
    actions.push({
      type: 'update_assumptions',
      label: 'Apply suggested interest rate',
      data: { field: 'apr' }
    });
  }

  // Look for scenario suggestions
  if (response.toLowerCase().includes('scenario') || response.toLowerCase().includes('what if')) {
    actions.push({
      type: 'run_scenario',
      label: 'Run suggested scenario',
    });
  }

  // Look for CapEx suggestions
  if (response.toLowerCase().includes('renovation') || response.toLowerCase().includes('refurb') || response.toLowerCase().includes('epc upgrade')) {
    actions.push({
      type: 'add_capex',
      label: 'Add renovation costs',
    });
  }

  // Look for compliance mentions
  if (response.toLowerCase().includes('compliance') || response.toLowerCase().includes('epc') || response.toLowerCase().includes('licensing')) {
    actions.push({
      type: 'view_compliance',
      label: 'View compliance checklist',
    });
  }

  return actions;
}
