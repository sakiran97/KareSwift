import { Global, Module } from '@nestjs/common';
import { FranchiseService } from './franchise.service';

@Global()
@Module({
  providers: [FranchiseService],
  exports: [FranchiseService],
})
export class FranchiseModule {}
