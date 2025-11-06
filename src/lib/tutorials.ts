export interface TutorialStep {
  target: string; // CSS selector
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: "click" | "input" | "hover" | "none";
  actionText?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: "analysis" | "deals" | "portfolio" | "advanced";
  estimatedMinutes: number;
  steps: TutorialStep[];
}

export const tutorials: Tutorial[] = [
  {
    id: "first-property-analysis",
    title: "Analyze Your First Property",
    description: "Learn how to paste a property URL and get instant ROI analysis",
    category: "analysis",
    estimatedMinutes: 2,
    steps: [
      {
        target: ".hero-url-input",
        title: "Find a Property Listing",
        description: "Open Zoopla or Rightmove in another tab and copy any property listing URL. You can use our example link to try it out.",
        position: "bottom",
        action: "none",
      },
      {
        target: ".hero-url-input input",
        title: "Paste the URL",
        description: "Click here and paste the property URL. We support Zoopla and Rightmove listings. The URL will be automatically validated.",
        position: "bottom",
        action: "input",
        actionText: "Paste URL here",
      },
      {
        target: ".analyze-button",
        title: "Start Analysis",
        description: "Click this button to start the AI-powered analysis. We'll extract property details, calculate ROI, and generate insights in under 30 seconds.",
        position: "top",
        action: "click",
        actionText: "Click Analyze",
      },
      {
        target: ".progress-indicator",
        title: "Track Progress",
        description: "Watch as we fetch property data, analyze market conditions, and calculate returns. You can see each step of the process here.",
        position: "bottom",
        action: "none",
      },
    ],
  },
  {
    id: "roi-calculator-mastery",
    title: "Master the ROI Calculator",
    description: "Understand how to use our calculator to estimate returns on any property",
    category: "analysis",
    estimatedMinutes: 3,
    steps: [
      {
        target: "#calculator",
        title: "Quick ROI Calculator",
        description: "Use this calculator to get instant return estimates without analyzing a full listing. Perfect for quick comparisons.",
        position: "top",
        action: "none",
      },
      {
        target: "#price",
        title: "Enter Property Price",
        description: "Input the total purchase price including all transaction costs like stamp duty and legal fees. Hover over the help icon for more details.",
        position: "right",
        action: "input",
        actionText: "Enter amount",
      },
      {
        target: "#deposit",
        title: "Set Your Deposit",
        description: "Enter your down payment amount. Most buy-to-let mortgages require 25% minimum deposit. Higher deposits often mean better rates.",
        position: "right",
        action: "input",
        actionText: "Enter deposit",
      },
      {
        target: "#rent",
        title: "Estimate Monthly Rent",
        description: "Research local rental prices on Rightmove or Zoopla. Be realistic - overestimating rent is the #1 mistake new investors make.",
        position: "right",
        action: "input",
        actionText: "Enter rent",
      },
      {
        target: "#costs",
        title: "Account for Costs",
        description: "Include maintenance (10-15%), management fees (10-15%), insurance, and void periods. These typically total 20-30% of rent.",
        position: "right",
        action: "input",
        actionText: "Enter costs",
      },
      {
        target: ".roi-results",
        title: "Interpret Results",
        description: "Your ROI shows annual return on cash invested. Gross yield is rent vs price. Net income is your actual profit after costs. Good buy-to-let properties typically show 5-8% gross yield.",
        position: "left",
        action: "none",
      },
    ],
  },
  {
    id: "deal-management",
    title: "Manage Your Deals",
    description: "Learn how to track, compare, and organize multiple property deals",
    category: "deals",
    estimatedMinutes: 4,
    steps: [
      {
        target: ".deals-list",
        title: "Your Deals Dashboard",
        description: "All analyzed properties appear here. Each deal shows key metrics like ROI, yield, and cash flow at a glance.",
        position: "top",
        action: "none",
      },
      {
        target: ".deal-filters",
        title: "Filter & Sort Deals",
        description: "Use filters to find properties by price range, yield, location, or status. Sort by ROI to find your best opportunities.",
        position: "bottom",
        action: "click",
        actionText: "Try filtering",
      },
      {
        target: ".deal-card:first-child",
        title: "Deal Cards",
        description: "Each card shows essential metrics. Click any card to see full analysis, photos, and detailed calculations.",
        position: "right",
        action: "click",
        actionText: "Click to expand",
      },
      {
        target: ".deal-actions",
        title: "Quick Actions",
        description: "Add to watchlist, export as PDF, share with partners, or run scenarios. These actions help you move deals forward.",
        position: "left",
        action: "none",
      },
      {
        target: ".comparison-mode",
        title: "Compare Properties",
        description: "Select multiple deals to compare side-by-side. Perfect for choosing between similar properties in different locations.",
        position: "bottom",
        action: "click",
        actionText: "Enable comparison",
      },
    ],
  },
  {
    id: "portfolio-creation",
    title: "Build Your Portfolio",
    description: "Track multiple properties and see your overall investment performance",
    category: "portfolio",
    estimatedMinutes: 3,
    steps: [
      {
        target: ".create-portfolio-button",
        title: "Create a Portfolio",
        description: "Portfolios help you group properties and track combined performance. Useful for different strategies or locations.",
        position: "bottom",
        action: "click",
        actionText: "Create portfolio",
      },
      {
        target: ".portfolio-name-input",
        title: "Name Your Portfolio",
        description: "Choose a descriptive name like 'Manchester Buy-to-Let' or 'Student Housing Portfolio'. This helps organize multiple strategies.",
        position: "right",
        action: "input",
        actionText: "Enter name",
      },
      {
        target: ".add-properties-section",
        title: "Add Properties",
        description: "Select properties from your deals list or add new ones. You can always add more later as you acquire properties.",
        position: "bottom",
        action: "click",
        actionText: "Select properties",
      },
      {
        target: ".portfolio-metrics",
        title: "Portfolio Analytics",
        description: "See combined ROI, total cash flow, average yield, and portfolio value. Track how your investments perform together.",
        position: "top",
        action: "none",
      },
      {
        target: ".scenario-runner",
        title: "Run Scenarios",
        description: "Test 'what if' scenarios: market downturns, interest rate changes, vacancy periods. Understand your risk exposure.",
        position: "left",
        action: "click",
        actionText: "Try scenarios",
      },
    ],
  },
  {
    id: "advanced-features",
    title: "Advanced Analysis Tools",
    description: "Unlock powerful features like AI copilot, forecasting, and market intelligence",
    category: "advanced",
    estimatedMinutes: 5,
    steps: [
      {
        target: ".ai-copilot-button",
        title: "AI Copilot",
        description: "Ask questions about any property in natural language. Get instant insights on market trends, risk factors, and opportunities.",
        position: "bottom",
        action: "click",
        actionText: "Open AI Copilot",
      },
      {
        target: ".forecast-panel",
        title: "Yield Forecasting",
        description: "Generate AI-powered predictions for rental yield, capital appreciation, and cash flow over 1-10 years. Based on historical data and market trends.",
        position: "left",
        action: "click",
        actionText: "View forecast",
      },
      {
        target: ".market-intelligence",
        title: "Market Intelligence",
        description: "Access area-specific data: average yields, rental demand, price trends, and demographics. Identify emerging investment hotspots.",
        position: "right",
        action: "none",
      },
      {
        target: ".export-options",
        title: "Professional Reports",
        description: "Export detailed PDF reports with charts, photos, and analysis. Perfect for presentations to investors, lenders, or partners.",
        position: "top",
        action: "click",
        actionText: "Export PDF",
      },
      {
        target: ".keyboard-shortcuts",
        title: "Keyboard Shortcuts",
        description: "Press Cmd+K for quick search, ? for help, or Cmd+N for new analysis. Work faster with keyboard navigation.",
        position: "bottom",
        action: "none",
      },
    ],
  },
];

// Tutorial state management
const STORAGE_KEY = "yieldpilot_tutorials_completed";

export function getCompletedTutorials(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function markTutorialComplete(tutorialId: string): void {
  const completed = getCompletedTutorials();
  if (!completed.includes(tutorialId)) {
    completed.push(tutorialId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }
}

export function resetTutorial(tutorialId: string): void {
  const completed = getCompletedTutorials();
  const filtered = completed.filter((id) => id !== tutorialId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function resetAllTutorials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isTutorialCompleted(tutorialId: string): boolean {
  return getCompletedTutorials().includes(tutorialId);
}
