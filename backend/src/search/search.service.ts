import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async indexDocument(index: string, id: string, document: any) {
    this.logger.log(`Indexing document ${id} into ${index}`);
    try {
      await this.elasticsearchService.index({
        index,
        id,
        document,
      });
    } catch (e) {
      this.logger.error(`Error indexing document ${id}: ${e.message}`);
    }
  }

  async searchGlobal(query: string, index?: string) {
    this.logger.log(`Searching for "${query}" in index: ${index || 'all'}`);
    try {
      const response = await this.elasticsearchService.search({
        index,
        query: {
          multi_match: {
            query,
            fields: ['name', 'email', 'phone', 'description', 'brand', 'model'],
            fuzziness: 'AUTO',
          },
        },
      });
      return response.hits.hits.map(hit => ({
        id: hit._id,
        index: hit._index,
        score: hit._score,
        source: hit._source,
      }));
    } catch (e) {
      this.logger.error(`Error performing global search: ${e.message}`);
      return [];
    }
  }

  async removeDocument(index: string, id: string) {
    try {
      await this.elasticsearchService.delete({ index, id });
    } catch (e) {
      this.logger.error(`Error removing document ${id}: ${e.message}`);
    }
  }
}
