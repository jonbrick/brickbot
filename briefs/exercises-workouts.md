# Exercises & Workouts

## Notion Databases
- **Exercises DB:** `321b9535-d4fd-8075-811d-cd691cd368d1`
  - Current: Name, 💪 Workouts (relation)
- **Workouts DB:** `321b9535-d4fd-80c1-bb32-e32b5bbc0ecf`
  - Current: Name, 🏋️‍♀️ Exercises (relation)

## Proposed Schema: Exercises
- `Muscle Group` (select): Chest, Back, Shoulders, Arms, Legs, Core, Full Body
- `Equipment` (select): Barbell, Dumbbell, Machine, Bodyweight, Cable, Kettlebell
- `Type` (select): Compound, Isolation, Cardio, Stretch

## Proposed Schema: Workouts
- `Date` (date)
- `Type` (select): Push, Pull, Legs, Upper, Lower, Full Body, Cardio
- `Duration` (number): minutes
- `Notes` (rich_text)

## Skill: `/log-workout`
- Log a workout session
- Link exercises from the Exercises DB
- Record sets/reps/weight in notes or page body

## Integration
- Pull/push: follow NYC pattern (user-managed, two linked databases)
- Env vars: `EXERCISES_DATABASE_ID`, `WORKOUTS_DATABASE_ID`
