# Cooking / Recipes

## Notion Database
- **DB ID:** `321b9535-d4fd-8090-9169-f8191f87c69b`
- **Current properties:** Name only

## Proposed Schema
- `Category` (select): Chicken, Beef, Seafood, Turkey, Lamb, Bison, Pasta, Soup/Stew
- `Cook Time` (rich_text): e.g., "1 hour", "60-90 min"
- `Source` (url): YouTube/recipe URLs
- `Status` (select): Want to Make, Made, Favorite
- Ingredients + instructions as **page body blocks** (not properties)

## Import: `yarn recipes:import`
- Source: 11 Word docs (moved to `briefs/recipes/`)
- Sous Vide doc contains 6 sub-recipes — split into separate rows
- Total: ~16 recipes after splitting

### Recipe List
1. Cast Iron Steak Dinner (Steak, Broccoli, Sweet Potatoes)
2. Baked Salmon
3. Chicken Adobo
4. Chicken Noodle Soup
5. Chili (ground turkey)
6. Grandma's Beef Stew
7. Greek Roasted Chicken & Peppers
8. Greek Salad with Chicken
9. Pan Seared Tuna
10. Spaghetti (ground turkey)
11. Sous Vide Chicken
12. Sous Vide NY Strip/Ribeye/Sirloin
13. Sous Vide Lobster
14. Sous Vide Lamb Rack
15. Garlic Lemon Chicken
16. Bison Burger
17. Salmon (pesto)

## Integration
- Pull/push: follow NYC pattern (user-managed, not API-sourced)
- Viewer: add to existing HTML viewer or create standalone
- Env var: `COOKING_DATABASE_ID`
