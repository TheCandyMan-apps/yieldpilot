# Interactive Tutorial System

A comprehensive tutorial system that guides users through complex workflows with step-by-step interactive walkthroughs.

## Features

- 🎯 **Spotlight Effect**: Highlights target elements with animated pulsing ring
- 📍 **Smart Positioning**: Tutorial cards auto-position relative to highlighted elements
- 📊 **Progress Tracking**: Visual progress bars and step indicators
- 💾 **Persistent State**: Remembers completed tutorials via localStorage
- 🎨 **Category Organization**: Tutorials grouped by feature category
- ♿ **Accessible**: Keyboard navigation and skip options
- 📱 **Responsive**: Works on all screen sizes

## Components

### FeatureTutorial
Main tutorial component that displays step-by-step guidance with spotlight effects.

```tsx
<FeatureTutorial
  tutorial={tutorialData}
  onComplete={() => console.log("Tutorial completed!")}
  onSkip={() => console.log("Tutorial skipped")}
/>
```

### TutorialMenu
Sheet-based menu showing all available tutorials with progress tracking.

```tsx
<TutorialMenu />
```

### FirstTimeTutorialPrompt
Auto-prompts new users to start their first tutorial.

```tsx
<FirstTimeTutorialPrompt />
```

## Tutorial Definition

Tutorials are defined in `src/lib/tutorials.ts`. Each tutorial includes:

```typescript
{
  id: "unique-tutorial-id",
  title: "Tutorial Title",
  description: "Brief description",
  category: "analysis" | "deals" | "portfolio" | "advanced",
  estimatedMinutes: 3,
  steps: [
    {
      target: ".css-selector", // Element to highlight
      title: "Step Title",
      description: "Detailed explanation of this step",
      position: "top" | "bottom" | "left" | "right" | "center",
      action: "click" | "input" | "hover" | "none",
      actionText: "Optional text shown to user"
    }
  ]
}
```

## Adding New Tutorials

1. **Add Target Classes**: Add unique CSS classes to elements you want to highlight:
   ```tsx
   <Button className="analyze-button">Analyze</Button>
   ```

2. **Define Tutorial**: Add to `tutorials` array in `src/lib/tutorials.ts`:
   ```typescript
   {
     id: "my-new-tutorial",
     title: "My New Feature",
     description: "Learn how to use this feature",
     category: "analysis",
     estimatedMinutes: 2,
     steps: [
       {
         target: ".analyze-button",
         title: "Click to Analyze",
         description: "Click this button to start analysis",
         position: "bottom",
         action: "click"
       }
     ]
   }
   ```

3. **Test**: Tutorial will appear in TutorialMenu automatically

## Target Element Requirements

For best results, target elements should:
- Have a unique, descriptive CSS class
- Be visible when tutorial starts
- Not be dynamically rendered (or handle in tutorial logic)
- Have sufficient space for tutorial card positioning

## Positioning

Tutorial cards automatically position themselves relative to highlighted elements:
- **top**: Above the element
- **bottom**: Below the element
- **left**: Left of the element
- **right**: Right of the element
- **center**: Screen center (for non-specific targets)

## State Management

Tutorial completion state is stored in localStorage:
- `yieldpilot_tutorials_completed`: Array of completed tutorial IDs
- `yieldpilot_tutorial_prompt_seen`: Whether first-time prompt was shown

### API Functions

```typescript
import { 
  getCompletedTutorials,
  markTutorialComplete,
  resetTutorial,
  resetAllTutorials,
  isTutorialCompleted 
} from '@/lib/tutorials';

// Check completion
const isComplete = isTutorialCompleted('tutorial-id');

// Mark complete
markTutorialComplete('tutorial-id');

// Reset specific tutorial
resetTutorial('tutorial-id');

// Reset all progress
resetAllTutorials();
```

## Styling

Tutorial highlight effect uses custom CSS in `src/index.css`:

```css
.tutorial-highlight {
  position: relative;
  z-index: 51 !important;
  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

Backdrop overlay uses `z-50` to ensure tutorials appear above content.

## Categories

Current categories:
- **analysis**: Property analysis tools
- **deals**: Deal management features
- **portfolio**: Portfolio building
- **advanced**: Advanced features (AI, forecasting, exports)

## Best Practices

1. **Keep Steps Focused**: Each step should teach one concept
2. **Descriptive Titles**: Make step titles action-oriented
3. **Detailed Descriptions**: Explain WHY not just WHAT
4. **Logical Flow**: Steps should build on each other
5. **Realistic Timing**: Estimate completion time accurately
6. **Test Thoroughly**: Test on different screen sizes
7. **Add Action Hints**: Use actionText for user guidance

## Example Tutorial Flow

```typescript
const exampleTutorial = {
  id: "property-search",
  title: "Search Properties",
  description: "Learn to search and filter properties",
  category: "deals",
  estimatedMinutes: 3,
  steps: [
    {
      target: ".search-input",
      title: "Enter Search Criteria",
      description: "Type a location or property type to search",
      position: "bottom",
      action: "input",
      actionText: "Try searching now"
    },
    {
      target: ".filter-panel",
      title: "Apply Filters",
      description: "Narrow results with price, yield, and other filters",
      position: "right",
      action: "click",
      actionText: "Click to open filters"
    },
    {
      target: ".results-list",
      title: "Review Results",
      description: "Each result shows key metrics. Click any card for details",
      position: "top",
      action: "none"
    }
  ]
};
```

## Troubleshooting

**Tutorial card not positioning correctly?**
- Ensure target element exists when tutorial starts
- Check element has proper CSS classes
- Try different position values

**Highlight not showing?**
- Verify CSS selector is correct
- Check element z-index isn't too high
- Ensure element is visible in viewport

**Tutorial not appearing in menu?**
- Check tutorial is in `tutorials` array
- Verify all required fields are present
- Check for console errors

## Future Enhancements

Potential improvements:
- Video tutorials integration
- Branching tutorial paths
- Achievement badges
- Tutorial analytics
- Multi-language support
- Voice guidance option
