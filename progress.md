Original prompt: A browser-based incremental game where the player generates a currency called “clicks” by pressing a button, with each click producing value according to a current mathematical function f(x), where x is total clicks or progression level; the core loop revolves around accumulating clicks, unlocking upgrades, and replacing or enhancing the function to increase growth rate. The game begins with very slow-growing functions such as log(log(x+3)), progressing through log(x+1), x^(1/4), x^0.75, and x, then into mid-tier polynomial growth like x^1.5, x^2, x^3, x^4, x^5, followed by late-game exponential and super-exponential forms such as 2^x, e^x, x^x, and approximations of x!, and finally into extreme endgame functions like e^(x^2), 10^x, x^(x^x), and simplified tetration (x^^2), with all functions internally scaled (e.g., logarithmic compression or fractional exponents) to maintain smooth progression and prevent numerical breakage. The interface displays total clicks, gain per click, current function, next upgrade cost, and optionally projected next-click value or time-to-upgrade, reinforcing decision-making about when to upgrade. A rebirth (prestige) system allows players to reset progress after reaching thresholds in exchange for permanent multipliers or unlocks such as global gain boosts, hybrid functions (e.g., x^2 + log(x)), or automation features like auto-clickers. Additional depth can include branching upgrade paths (choosing between different function types), function blending, and scaling modifiers, creating a system that is simple in interaction but intellectually engaging through understanding growth rates and optimizing progression. Do this in the empty prokject called website, it should be finished in gui, so that I can open the https in my browser

Notes:
- Repository is a Maven skeleton with no site code yet; implementing as a self-contained static browser game at project root for easiest local launch.
- Need GUI, progression ladder, prestige, automation, save/load, render_game_to_text, and advanceTime for deterministic browser testing.

TODO:
- None for the requested core build.

Completed:
- Built a complete static browser game in `index.html`, `styles.css`, and `script.js`.
- Added the full function ladder from nested logs through stabilized tetration-inspired late game.
- Implemented run upgrades, rebirth insight, permanent prestige research, hybrid unlock scaffolding, focus scaffolding, save/load, graph preview, and keyboard navigation.
- Exposed `window.render_game_to_text` and deterministic `window.advanceTime(ms)` for automated testing.
- Swapped the graph from canvas to SVG so automated screenshots capture the full GUI instead of only the preview.
- Reworked the UI into a plain white minimal layout with a single main button, compact stats, and simple upgrade panels.
- Expanded the ladder to 50 functions and removed the longer flavor copy.
- Changed click gain to use `f(x) + f'(x)`.
- Added compressed layered number formatting for very large values.

Testing:
- Syntax check: `node -c script.js`
- Browser smoke test: load page, click core, confirm screenshot renders and state updates.
- Progression test: reached `log(x + 1)` through automated clicks and function upgrade.
- Run-upgrade test: purchased `Lens Amplifier` and confirmed the state/status update.
- Rebirth test: completed a full reset loop and confirmed `insight` increased to `1`.
- Prestige shop test: purchased `Theorem Archive` after rebirth and confirmed permanent archive rank increased.
- Rewrite smoke test: verified the new white layout, stats, and button flow in the browser.
- Rewrite progression test: advanced through multiple functions and run upgrades with the 50-function ladder.
- Rewrite rebirth balance test: verified that insight can still be earned after the rebalance.

Suggestions:
- If a later pass wants more depth, the next best additions would be sound effects, additional hybrid ranks, and a fuller focus-switch gameplay effect after unlocking `Focus Studio`.
