const fs = require('fs');
let c = fs.readFileSync('backend/test_cors_security.js', 'utf8');
const extra = `

test("CORS Security: Production permits FocusFlow AI Vercel deployment origins", () => {
  const isAllowedOrigin = createCorsEvaluator();
  const prodEnv = {
    NODE_ENV: "production",
    FRONTEND_URL: "https://focusflow-ai-api.onrender.com",
  };

  assert.equal(isAllowedOrigin("https://focusflow-ai-livid.vercel.app", prodEnv), true);
  assert.equal(isAllowedOrigin("https://focusflow-ai-preview-abc123.vercel.app", prodEnv), true);
  assert.equal(isAllowedOrigin("https://other-project.vercel.app", prodEnv), false);
});
`;
if (!c.includes('FocusFlow AI Vercel deployment origins')) {
  fs.writeFileSync('backend/test_cors_security.js', c.trimEnd() + extra);
  console.log('Appended test successfully');
}

