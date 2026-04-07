/// <---    This file is for connecting to the hugging face embedding model and defining the helper function to work with the embedding--->///

import { InferenceClient } from "@huggingface/inference";
import "dotenv/config"
const client = new InferenceClient(process.env.HF_TOKEN);


/// Helper function to extract the embedding vectors
function extractEmbedding(raw) {
    if (!raw) throw new Error("Empty embedding response");
    if (Array.isArray(raw) && typeof raw[0] === "number") {
      return raw;
    }
    if (
      Array.isArray(raw) &&
      Array.isArray(raw[0]) &&
      typeof raw[0][0] === "number"
    ) {
      return raw[0];
    }
    if (raw.embeddings && Array.isArray(raw.embeddings)) {
      if (typeof raw.embeddings[0] === "number") {
        return raw.embeddings;
      }
      if (
        Array.isArray(raw.embeddings[0]) &&
        typeof raw.embeddings[0][0] === "number"
      ) {
        return raw.embeddings[0];
      }
    }
    throw new Error(`Unsupported embedding response shape: ${JSON.stringify(raw).slice(0, 500)}`);
  }


// Getting the cosineSimilarity of the two vectors
function cosineSimilarity(vecA, vecB) {
    const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dot / (magA * magB);
  }

export {client, extractEmbedding, cosineSimilarity};