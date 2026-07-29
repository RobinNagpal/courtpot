// CloudFront viewer-request function for the S3 (web) behavior only.
// Anything without a file extension is a client-side route — serve the SPA
// shell. Real assets (/_expo/..., /favicon.ico, ...) all contain a dot.
function handler(event) {
  var request = event.request;
  if (!request.uri.includes(".")) {
    request.uri = "/index.html";
  }
  return request;
}
