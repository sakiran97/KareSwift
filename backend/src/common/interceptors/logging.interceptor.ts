import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const { method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';
    const ip = req.ip;

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (res) => {
          const resObj = ctx.getResponse();
          const statusCode = resObj.statusCode;
          const contentLength = resObj.get('content-length') || 0;

          this.logger.log(
            `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip} - ${Date.now() - now}ms`
          );
        },
        error: (err) => {
          const statusCode = err.status || 500;
          this.logger.error(
            `${method} ${originalUrl} ${statusCode} - ${userAgent} ${ip} - ${Date.now() - now}ms - ${err.message}`
          );
        }
      }),
    );
  }
}
