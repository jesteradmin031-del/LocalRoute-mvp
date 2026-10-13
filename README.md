# LocalRoute workspace

The React application is in `MVP/`. Commands now work from this parent folder too.

## Start from the VS Code terminal

```sh
npm run dev
```

Open the Local URL printed in the terminal. On PowerShell, use `npm.cmd run dev` if execution policy blocks `npm.ps1`.

For a fresh checkout, run `npm run setup` once to install the application's locked dependencies.

## Debug with breakpoints

Open **this parent folder** (`E:\LocalRoute`) in VS Code. In Run and Debug, select **Debug LocalRoute (Edge)** and press F5. The configured task starts Vite on port 5173, then opens Edge with source maps and breakpoint support. Stop any server already using port 5173 before starting this configuration. Stop the background task with **Tasks: Terminate Task** when finished.

You can also run `npm run dev` directly from `MVP/`. The parent wrapper simply forwards commands to the application; it does not move or duplicate source files.

Other available commands: `npm test`, `npm run build`, and `npm run preview`.

See `MVP/README.md` for app architecture, demo instructions and limitations.
