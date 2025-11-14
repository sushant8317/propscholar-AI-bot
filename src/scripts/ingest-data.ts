import mongoose from 'mongoose';
import { getPropScholarData } from '../data/propscholar-data';
import { EmbeddingService } from '../services/embedding.service';
import { VectorService } from '../services/vector.service';
import dotenv from 'dotenv';

dotenv.config();

async function ingestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    const embeddingService = new EmbeddingService();
    const vectorService = new VectorService();

    console.log('Starting data ingestion...');

    // Load data properly
    const propScholarData = getPropScholarData();

    const dataItems: Array<{ content: string; metadata: any }> = [];

    for (const [category, items] of Object.entries(propScholarData)) {
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const content = `Q: ${item.question}\nA: ${item.answer}`;
          dataItems.push({
            content,
            metadata: {
              category,
              question: item.question,
              keywords: item.keywords || []
            }
          });
        });
      }
    }

    console.log(`Found ${dataItems.length} items to process`);

    const batchSize = 20;
    let processed = 0;

    for (let i = 0; i < dataItems.length; i += batchSize) {
      const batch = dataItems.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(
          dataItems.length / batchSize
        )}...`
      );

      const texts = batch.map(item => item.content);
      const embeddings = await embeddingService.createBatchEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        await vectorService.storeEmbedding(
          batch[j].content,
          embeddings[j],
          batch[j].metadata
        );
        processed++;
        console.log(` Processed ${processed} / ${dataItems.length}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Data ingestion complete!');
  } catch (error) {
    console.error('Error during ingestion:', error);
  } finally {
    await mongoose.disconnect();
  }
}

ingestData();
