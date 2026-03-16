# ClickGlow - Gamification Rules

## Pet System

Your Focus Pet is a virtual companion that thrives when you stay focused and suffers when you get distracted.

### Species & Evolution

| Level | Species | XP Required | Look |
|-------|---------|------------|------|
| 1 | Slime | 0 XP | Green blob |
| 2 | Dragon | 100 XP | Orange with horns |
| 3 | Wizard | 300 XP | Purple with hat & star |

### Stats

- **HP** (Health Points): 0-100. Your pet's life force.
- **XP** (Experience Points): Earned by completing focus sessions. Triggers evolution.
- **Mood**: Visual state based on HP level.
- **Focus Streak**: Consecutive completed pomodoro sessions.

### Mood States

| HP Range | Mood | Visual |
|----------|------|--------|
| > 70 | Happy | Bright, cheerful, bouncy |
| 30 - 70 | Idle | Normal, calm |
| 1 - 29 | Angry | Red eyes, frowning |
| 0 | Sleeping | Greyed out, eyes closed |

### Earning Rewards (Positive Actions)

| Action | Reward |
|--------|--------|
| Complete a Pomodoro | +15 HP heal, +XP equal to minutes focused |
| Focus streak bonus | Streak counter increases |

### Passive HP Regen (Hourly)

Your pet slowly recovers HP just by you working normally — no Pomodoro required.

| Condition | Result |
|-----------|--------|
| 1 hour of activity with **zero** distraction | +5 HP |
| 1 hour with any distraction time | No heal, check again next hour |
| No activity (laptop closed / idle) | No heal |

- Checked once per hour (e.g., 6:08 → 7:08 → 8:08)
- Requires at least some app activity in the hour (proves you're at the computer)
- HP 0 → 100 takes ~20 hours of clean work
- Stacks with Pomodoro heals (+15 HP per session)

### Taking Damage (Negative Actions)

| Action | Penalty |
|--------|---------|
| Visit distraction site | -3 HP every 10 seconds |
| HP reaches 0 | Focus streak resets to 0 |

### Distraction Detection

Categories are fully customizable! Two levels of rules:

**App Rules** — match by app name (e.g. "Brave Browser", "Slack")
**Keyword Rules** — match by window title keywords (e.g. "youtube", "stackoverflow")

Priority order:
1. App rules (exact app name match) — highest priority
2. Keyword rules (window title contains keyword)
3. Default: "neutral"

#### Default Distraction Keywords
youtube, twitter, x.com, reddit, instagram, tiktok, facebook, netflix, twitch

#### Default Productive Keywords
github, stackoverflow, docs.rs, developer.apple, mdn web docs

#### Customization Examples

| User Type | Customize |
|-----------|-----------|
| Social Media Manager | Set "twitter" -> productive, "instagram" -> productive |
| YouTuber | Set "youtube" -> productive |
| Student | Set "wikipedia" -> productive, "discord" -> distraction |
| Designer | Set "dribbble" -> productive, "pinterest" -> productive |

Edit rules in the **Activity Log** tab > **Category Rules** section.

### Real-Time Reactions

- **Distraction detected**: Pet immediately turns angry, shakes, glows red, and shows a funny warning message
- **HP bar colors**: Green (>60%) -> Yellow (>40%) -> Orange (>20%) -> Red (<20%)
- **Menu bar**: Shows pet name + HP in the macOS menu bar

## Pomodoro Timer

- Configurable duration: 15 / 25 / 30 / 45 / 60 / 90 / 120 minutes
- Completing a session feeds and heals your pet
- Timer cannot be changed while running

## Time Thief

- The "WANTED" poster shows your top time-wasting app of the week
- Tracks: hours stolen, switch count, longest session
- Auto-populated from distraction category data

## Tips

1. Keep your pet happy by staying focused during work hours
2. Use shorter pomodoro sessions (15-25 min) if you're just starting out
3. Longer sessions (60-120 min) give more XP but require more discipline
4. Check the Activity Log to see exactly where your time goes
5. The pet evolves permanently — once you hit Dragon or Wizard, you keep it!
