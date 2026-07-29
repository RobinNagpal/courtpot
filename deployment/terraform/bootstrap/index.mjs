// Placeholder handler installed by terraform at function creation.
// The real bundle (built by deployment/scripts/build-lambda.sh) replaces it
// on the first CI deploy.
export const handler = async () => ({
  statusCode: 503,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ error: "API not deployed yet — run the Deploy workflow" }),
});
