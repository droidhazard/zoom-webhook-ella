require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args)); // Dynamic import for node-fetch
const app = express();
const port = process.env.PORT || 10000;

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res
    .status(200)
    .send(
      `Zoom Webhook sample successfully running. Set this URL with the /webhook path as your app's Event notification endpoint URL. https://github.com/zoom/webhook-sample`
    );
});

app.post("/webhook", async (req, res) => {
  let response;

  console.log(req.headers);
  console.log(req.body);

  // Construct the message string
  const message = `v0:${req.headers["x-zm-request-timestamp"]}:${JSON.stringify(
    req.body
  )}`;

  const hashForVerify = crypto
    .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET_TOKEN)
    .update(message)
    .digest("hex");

  // Hash the message string with Webhook Secret Token and prepend the version semantic
  const signature = `v0=${hashForVerify}`;

  if (req.headers["x-zm-signature"] === signature) {
    if (req.body.event === "endpoint.url_validation") {
      const hashForValidate = crypto
        .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET_TOKEN)
        .update(req.body.payload.plainToken)
        .digest("hex");

      response = {
        plainToken: req.body.payload.plainToken,
        encryptedToken: hashForValidate,
      };

      console.log(response);
      res.status(200).json(response);
    } else {
      response = {
        message: "Authorized request to Zoom Webhook sample.",
        status: 200,
        data: req.body, // Include the original request body
      };

      console.log(response);

      // Send a response back to Zoom
      res.status(response.status).json(response);

      // Forward the entire JSON body to the webhook URL
      try {
        const webhookResponse = await fetch(
          "https://hooks.zapier.com/hooks/catch/21135575/2ajpcba/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(req.body), // Send exact body received
          }
        );

        console.log("Forwarding to webhook status:", webhookResponse.status);
      } catch (error) {
        console.error("Error forwarding to webhook:", error);
      }
    }
  } else {
    response = {
      message: "Unauthorized request to Zoom Webhook sample.",
      status: 401,
    };

    console.log(response.message);
    res.status(response.status).json(response);
  }
});

app.listen(port, () =>
  console.log(`Zoom Webhook sample listening on port ${port}!`)
);
