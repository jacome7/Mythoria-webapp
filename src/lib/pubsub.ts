import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();                // picks creds from metadata
const topic  = process.env.PUBSUB_TOPIC!;   // mythoria-story-requests

export async function publishStoryRequest(message: unknown) {
  if (!topic) {
    throw new Error('PUBSUB_TOPIC environment variable is not set');
  }
  
  const dataBuffer = Buffer.from(JSON.stringify(message));
  await pubsub.topic(topic).publishMessage({ data: dataBuffer });
}
