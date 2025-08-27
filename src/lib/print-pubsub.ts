import { PubSub } from '@google-cloud/pubsub';
import { getEnvironmentConfig } from '@/config/environment';

export class PrintPubSubService {
  private pubsub: PubSub;
  private topicName = 'mythoria-print-requests';

  constructor() {
    const config = getEnvironmentConfig();
    this.pubsub = new PubSub({
      projectId: config.googleCloud.projectId
    });
  }

  async triggerPrintGeneration(storyId: string, runId: string): Promise<void> {
    try {
      const data = JSON.stringify({
        storyId,
        runId
      });

      const dataBuffer = Buffer.from(data);
      const messageId = await this.pubsub.topic(this.topicName).publish(dataBuffer);
      
      console.log(`Print generation message published with ID: ${messageId}`);
    } catch (error) {
      console.error('Error publishing print generation message:', error);
      throw error;
    }
  }
}
