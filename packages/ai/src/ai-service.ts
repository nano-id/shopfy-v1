import type { IntentClassifier } from "./intent-classifier.js";
import { PlaceholderIntentClassifier } from "./intent-classifier.js";
import type { SafeResponseGenerator } from "./safe-response.js";
import { PlaceholderSafeResponseGenerator } from "./safe-response.js";
import type { AiToolRouter } from "./tools.js";
import { DeterministicToolRouter } from "./tools.js";
import type { ClassifyIntentInput } from "./types.js";

export type AiServiceDeps = {
  classifier?: IntentClassifier;
  responseGenerator?: SafeResponseGenerator;
  toolRouter?: AiToolRouter;
};

/** Facade for AI layer — swap implementations when OpenAI is enabled. */
export class AiService {
  private readonly classifier: IntentClassifier;
  private readonly responseGenerator: SafeResponseGenerator;
  readonly toolRouter: AiToolRouter;

  constructor(deps: AiServiceDeps = {}) {
    this.classifier = deps.classifier ?? new PlaceholderIntentClassifier();
    this.responseGenerator =
      deps.responseGenerator ?? new PlaceholderSafeResponseGenerator();
    this.toolRouter = deps.toolRouter ?? new DeterministicToolRouter();
  }

  async classifyIntent(input: ClassifyIntentInput) {
    return this.classifier.classify(input);
  }

  async generateSafeResponse(
    input: Parameters<SafeResponseGenerator["generate"]>[0],
  ) {
    return this.responseGenerator.generate(input);
  }
}
