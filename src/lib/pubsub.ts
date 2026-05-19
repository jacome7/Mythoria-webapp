import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

const storyTopic = process.env.PUBSUB_TOPIC || 'mythoria-story-requests';
const audiobookTopic = process.env.PUBSUB_AUDIOBOOK_TOPIC || 'mythoria-audiobook-requests';

type PubSubError = Error & {
  code?: unknown;
  details?: unknown;
  metadata?: unknown;
  cause?: unknown;
};

export async function publishStoryRequest(message: unknown) {
  return publishMessage(storyTopic, message, 'story generation');
}

export async function publishAudiobookRequest(message: unknown) {
  return publishMessage(audiobookTopic, message, 'audiobook generation');
}

async function publishMessage(topic: string, message: unknown, type: string) {
  if (!topic) {
    throw new Error(`PUBSUB topic for ${type} is not set`);
  }

  console.log('PUBSUB: Publishing message', {
    type,
    topic,
    projectId: pubsub.projectId,
  });

  try {
    const dataBuffer = Buffer.from(JSON.stringify(message));
    const messageId = await pubsub.topic(topic).publishMessage({ data: dataBuffer });

    console.log('PUBSUB: Message published successfully', {
      type,
      topic,
      messageId,
    });

    return messageId;
  } catch (error) {
    const pubsubError = error as PubSubError;

    console.error('PUBSUB: Failed to publish message', {
      type,
      topic,
      projectId: pubsub.projectId,
      name: pubsubError.name,
      message: pubsubError.message,
      code: pubsubError.code,
      details: pubsubError.details,
      metadata: pubsubError.metadata,
      cause: pubsubError.cause,
      stack: pubsubError.stack,
    });

    throw error;
  }
}
