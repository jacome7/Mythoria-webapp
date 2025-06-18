import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});                // picks creds from metadata
const topic  = process.env.PUBSUB_TOPIC || 'mythoria-story-requests';   // Updated to match actual topic

export async function publishStoryRequest(message: unknown) {
  if (!topic) {
    throw new Error('PUBSUB_TOPIC environment variable is not set');
  }
  
  console.log('📢 PUBSUB: Publishing message to topic:', topic);
  console.log('📢 PUBSUB: Message payload:', JSON.stringify(message, null, 2));
  
  const dataBuffer = Buffer.from(JSON.stringify(message));
  const messageId = await pubsub.topic(topic).publishMessage({ data: dataBuffer });
  
  console.log('✅ PUBSUB: Message published successfully with ID:', messageId);
  return messageId;
}
