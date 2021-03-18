import express from "express";
import { WebClient } from "@slack/web-api";
import Perspective from "perspective-api-client";
import dotenv from "dotenv";

const config = dotenv.config().parsed;

const SlackClient = new WebClient(config.TOKEN);
const perspective = new Perspective({ apiKey: config.PERSPECTIVE_API });

const app = express();
app.use(express.json());

app.post("/", async (req, res) => {
  const { body } = req;

  if (body.challenge) {
    res.statusCode = 200;
    res.send({ challenge: req.body.challenge });
  }

  if (body.event?.type === "message") {
    const { text } = body.event;

    const result =
      (await perspective
        .analyze(text, {
          attributes: [
            "toxicity",
            "severe_toxicity",
            "insult",
            "threat",
            "profanity",
          ],
        })
        .catch(() => {})) ||
      (await perspective
        .analyze(text, {
          attributes: [
            "toxicity",
            "severe_toxicity",
            "insult_experimental",
            "threat_experimental",
            "profanity_experimental",
          ],
        })
        .catch(() => {}));

    const values = Object.entries(result.attributeScores).reduce(
      (acc, [name, value]) => {
        const val = (value.summaryScore.value * 100).toFixed(2);
        return val >= 75 ? [...acc, { name, value: val }] : acc;
      },
      []
    );

    if (values?.length) {
      SlackClient.reactions
        .add({
          name: "skull",
          channel: body.event.channel,
          timestamp: body.event.ts,
        })
        .catch(() => {});
    }
  }
});

app.listen(config.PORT || 3000, () =>
  console.log(`Listening on port ${config.PORT || 3000}`)
);
