export const FLOWMIND_BROWSER_DEMO_PAGE_PATH = "/api/flowmind/browser-demo/page";
export const FLOWMIND_BROWSER_DEMO_RESULT_PATH = "/api/flowmind/browser-demo/result";

const pageStyles = `
  :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; color: #e5eaf5; background: #0b1020; }
  main { max-width: 720px; margin: 0 auto; }
  .eyebrow { color: #7da9ff; font: 600 11px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
  h1 { margin: 12px 0 8px; font-size: 28px; letter-spacing: -.04em; }
  p { color: #aab4c8; font-size: 14px; line-height: 1.7; }
  article, form, .result { margin-top: 20px; padding: 20px; border: 1px solid #28334a; border-radius: 12px; background: #11182a; }
  h2 { margin: 0 0 8px; font-size: 16px; }
  label { display: grid; gap: 7px; margin-top: 14px; color: #bbc6dc; font-size: 12px; font-weight: 600; }
  input, select { height: 40px; padding: 0 11px; border: 1px solid #35425b; border-radius: 7px; color: #eef3ff; background: #0b1020; font: inherit; }
  button { margin-top: 16px; padding: 10px 14px; border: 0; border-radius: 7px; color: #081326; background: #75a4ff; font-weight: 700; }
  .result { color: #9edcc0; }
  .note { margin-top: 24px; color: #71809b; font-size: 11px; }
`;

function documentHtml(title: string, content: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>${pageStyles}</style>
</head>
<body><main>${content}</main></body>
</html>`;
}

export const flowmindBrowserDemoHtml = documentHtml(
  "FlowMind local browser demo",
  `<div class="eyebrow">Local browser sandbox</div>
   <h1>Product research demo</h1>
   <p>This page is served by FlowMind for safe browser testing. It contains sample product information and does not connect to external sites or services.</p>
   <article id="research-note">
     <h2>Release note: safer workflow automation</h2>
     <p>FlowMind keeps browser research inside an isolated demo page. Browser steps can open a URL, read visible content, extract text, locate a control, enter a search phrase, select a topic, wait for a result, and read that result. Test runs use only this local sample page. They do not sign in to websites, bypass security checks, or make external changes.</p>
   </article>
   <form method="get" action="${FLOWMIND_BROWSER_DEMO_RESULT_PATH}">
     <label for="search">Research phrase
       <input id="search" name="query" maxlength="120" value="workflow automation" autocomplete="off">
     </label>
     <label for="topic">Topic
       <select id="topic" name="topic">
         <option value="automation">Automation</option>
         <option value="security">Security</option>
         <option value="productivity">Productivity</option>
       </select>
     </label>
     <button id="run-demo" type="submit">Run local research</button>
   </form>
   <div class="result" id="demo-result" role="status">No research result yet. Submit the local form to create one.</div>
   <p class="note">Demo content only · no network access beyond this local page</p>`,
);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };
    return entities[character]!;
  });
}

export function flowmindBrowserDemoResultHtml(query: unknown, topic: unknown): string {
  const safeQuery = escapeHtml(String(query ?? "").slice(0, 120).trim() || "your sample phrase");
  const safeTopic = escapeHtml(String(topic ?? "").slice(0, 40).trim() || "automation");

  return documentHtml(
    "FlowMind local research result",
    `<div class="eyebrow">Local browser sandbox</div>
     <h1>Research result</h1>
     <div class="result" id="demo-result" role="status">Research completed for “${safeQuery}” in the ${safeTopic} topic. This result was generated locally for the FlowMind browser demo.</div>
     <p class="note">No external site or service was contacted.</p>`,
  );
}
