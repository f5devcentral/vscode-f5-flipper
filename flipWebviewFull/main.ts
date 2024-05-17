import {
    provideVSCodeDesignSystem,
    vsCodeBadge,
    vsCodeButton,
    vsCodeCheckbox,
    vsCodePanels,
    vsCodePanelTab,
    vsCodePanelView
  } from "@vscode/webview-ui-toolkit";
  
  provideVSCodeDesignSystem().register(
    vsCodeBadge(),
    vsCodeButton(),
    vsCodeCheckbox(),
    vsCodePanels(),
    vsCodePanelTab(),
    vsCodePanelView()
  );

// Get access to the VS Code API from within the webview context
const vscode = acquireVsCodeApi();

// Just like a regular webpage we need to wait for the webview
// DOM to load before we can reference any of the HTML elements
// or toolkit components
window.addEventListener("load", main);

function main() {
  // To get improved type annotations/IntelliSense the associated class for
  // a given toolkit component can be imported and used to type cast a reference
  // to the element (i.e. the `as Button` syntax)
  // const howdyButton = document.getElementById("howdy") as Button;
  // howdyButton?.addEventListener("click", handleHowdyClick);
}
  