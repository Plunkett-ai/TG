# Copilot Instructions for TG Repository

## Project Overview

This repository contains a **Depression Pathway Model** web application for Integrated Care Boards (ICBs). It's a single-page application that models healthcare pathways for depression treatment, comparing Talking Therapies (TT) vs BEAM therapy scenarios.

**Purpose**: Allow healthcare planners to explore cost and capacity impacts of reallocating eligible patients between treatment pathways (TT vs BEAM).

**Tech Stack**:
- Vanilla JavaScript (ES6+)
- HTML5
- CSS3 (custom properties, grid, flexbox)
- Static JSON data file

## Key Features

- ICB selection with real NHS data (TT referrals, depression prevalence, population)
- Interactive sliders to adjust treatment allocation between TT and BEAM
- Real-time calculation of costs, capacity freed, and pathway flows
- Data visualization using custom CSS and SVG
- Responsive layout with modern CSS features

## File Structure

```
/
├── index.html          # Main HTML structure and UI
├── app.js              # Application logic and calculations
├── styles.css          # All styling (CSS variables, grid, components)
├── data.json           # ICB data (NHS activity, prevalence, costs)
├── model_assumptions.md # Documentation of model methodology
└── .github/
    └── copilot-instructions.md
```

## Code Conventions

### JavaScript
- Use ES6+ features (arrow functions, template literals, destructuring)
- Prefer `const` and `let` over `var`
- Use camelCase for variable and function names
- Keep functions focused and single-purpose
- Use structured cloning (`structuredClone()`) for deep copies
- Number formatting: Use `Intl.NumberFormat` for consistency
- Avoid adding dependencies - keep the project vanilla JS

### HTML
- Use semantic HTML elements
- Use `data-*` attributes for dynamic content binding
- Keep inline styles minimal - use CSS classes

### CSS
- Use CSS custom properties (variables) defined in `:root`
- Use modern layout: Grid and Flexbox
- Keep selectors simple and maintainable
- Group related styles together
- Use meaningful class names that describe purpose

### Data Flow
- Model data is loaded from `data.json` or embedded `window.__MODEL_DATA__`
- User interactions update `current` state object
- `recomputeScenario()` recalculates all derived values
- `render()` updates the DOM to reflect current state

## Model Architecture

The app uses a **TT-anchored** model:
1. Observed TT referrals are the anchor point
2. Eligible patients are back-calculated: `eligible = baseline_tt / tt_share`
3. GP consults are estimated from eligible patients
4. Scenario sliders adjust allocation between TT and BEAM (complementary, sum to 100%)
5. Costs and capacity impacts are calculated for each pathway

## Development Guidelines

### Testing
- Manual testing in browser is sufficient for this project
- Test with different ICB selections
- Verify calculations match model assumptions
- Check responsiveness at different viewport sizes

### Data Updates
- ICB data comes from NHS sources (see `model_assumptions.md`)
- Data structure in `data.json` should remain stable
- All costs are monthly figures in GBP

### Adding Features
- Maintain the TT-anchored model approach
- Keep UI clean and focused on key metrics
- Preserve existing calculation logic unless fixing bugs
- Document any changes to model assumptions

## What NOT to Do

- Don't add build tools or transpilation - keep it vanilla
- Don't add external libraries or frameworks
- Don't change the core model methodology without explicit approval
- Don't remove data validation or bounds checking
- Don't break the complementary slider behavior (TT + BEAM = 100%)

## Healthcare Context

This tool is for NHS England health system planning:
- **TT** = NHS Talking Therapies (psychological therapy service)
- **BEAM** = Brightlamp Electronic Alleviating Method (alternative therapy device)
- **ICB** = Integrated Care Board (health system planning unit)
- **QOF** = Quality and Outcomes Framework (GP data)

## References

- Model methodology: See `model_assumptions.md`
- NHS Talking Therapies data: Monthly activity files
- Depression prevalence: QOF register data
- Population data: GP registered patients
