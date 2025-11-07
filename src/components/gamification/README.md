# Gamification System

A comprehensive achievement and badge system that rewards users for completing tutorials and using features throughout the YieldPilot platform.

## Components

### AchievementBadge
Displays individual achievement badges with:
- Different sizes (sm, md, lg)
- Category-specific colors
- Lock icon for unearned achievements
- Check mark for earned achievements
- Points display

### AchievementUnlockNotification
Animated toast notification that appears when users unlock new achievements:
- Sparkle animation effects
- Auto-dismiss after 5 seconds
- Category-specific gradient colors
- Trophy icon and points display

### AchievementShowcase
Full-page view of all achievements with:
- Total points and progress stats
- Category filtering tabs
- Grid layout of all badges
- Progress bar showing completion percentage

### AchievementProvider
Context provider that:
- Manages achievement state globally
- Tracks achievement progress
- Displays unlock notifications
- Handles event tracking

## Achievement Categories

1. **Tutorials** - Blue - Learning platform features
2. **Analysis** - Purple - Using analysis tools
3. **Milestones** - Green - Reaching important goals
4. **Social** - Orange - Sharing and collaborating
5. **Expert** - Red - Advanced accomplishments

## Achievement Definitions

Achievements are defined in `src/lib/achievements.ts`:

```typescript
export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string; // Lucide icon name
  points: number;
  requirement: {
    type: "tutorial_complete" | "feature_usage" | "milestone" | "streak";
    target?: string;
    count?: number;
  };
}
```

## Built-in Achievements

### Tutorials
- **First Steps** (10pts) - Complete first tutorial
- **Quick Learner** (25pts) - Complete 3 tutorials
- **Tutorial Master** (100pts) - Complete all tutorials

### Analysis
- **First Analysis** (15pts) - Analyze first property
- **Deal Hunter** (50pts) - Analyze 10 properties
- **ROI Expert** (40pts) - Use ROI calculator 20 times

### Milestones
- **Collector** (10pts) - Save first deal
- **Portfolio Starter** (30pts) - Create first portfolio
- **Export Pro** (25pts) - Export 5 reports

### Social
- **Networker** (20pts) - Share a deal
- **Collaborator** (50pts) - Create a syndicate

### Expert
- **Consistent Investor** (75pts) - 7-day streak
- **Power User** (0pts) - Reach 500 total points

## Usage

### Setup
Wrap your app with AchievementProvider in App.tsx:

```typescript
import { AchievementProvider } from "@/components/gamification";

<AchievementProvider>
  {/* Your app */}
</AchievementProvider>
```

### Track Events
Use the hook in components to track events:

```typescript
import { useAchievements } from "@/components/gamification";

const MyComponent = () => {
  const { trackEvent } = useAchievements();
  
  const handleAction = async () => {
    // Your action
    await trackEvent("feature_usage", "property_analysis");
  };
};
```

### Automatic Tracking
The system automatically tracks:
- Tutorial completions (via markTutorialComplete)
- Property analysis (via analytics.propertyUrlPasted)
- Deal saves (via analytics.dealSaved)
- PDF exports (via analytics.pdfExportSuccess)

## Database

Achievements are stored in the `user_achievements` table:
- `user_id` - User who earned the achievement
- `achievement_id` - Achievement identifier
- `unlocked_at` - When it was earned
- `progress` - Progress towards achievement (0-100)
- `metadata` - Additional data

## Local Storage Fallback

For non-authenticated users, achievements are stored in localStorage:
- Key: `yieldpilot_achievement_progress`
- Syncs to database on login

## Adding New Achievements

1. Add achievement definition to `src/lib/achievements.ts`:

```typescript
{
  id: "new_achievement",
  title: "Achievement Title",
  description: "Do something amazing",
  category: "analysis",
  icon: "Star",
  points: 30,
  requirement: { 
    type: "feature_usage", 
    target: "feature_name",
    count: 5 
  },
}
```

2. Track the event where the achievement should be earned:

```typescript
await trackEvent("feature_usage", "feature_name");
```

## Styling

Achievement styling uses the design system:
- Category colors are defined with opacity for consistency
- Animations use CSS keyframes in `src/index.css`
- Components use semantic tokens from the design system

## Future Enhancements

- Leaderboards
- Weekly/monthly challenges
- Achievement sharing on social media
- Rare/legendary tier achievements
- Animated level progression
- Achievement notification sound effects
